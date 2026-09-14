import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ErrorCode, type ReservationOutcome } from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { DomainError, CustomerMessage } from "../../common/errors/domain.error.js";
import {
  friendlyDate, isCutoffPassed, isoWeekdayOf, productionDateFor, todayInMarket, addDays,
} from "../../common/utils/business-date.js";
import type { Env } from "../../config/env.schema.js";
import { CapacityRepository } from "./capacity.repository.js";

export interface HoldRequest {
  variantId: string;
  qty: number;
  deliveryDate: string;
  warehouseId: string;
  timezone: string;
  cartId?: string;
}

@Injectable()
export class CapacityService {
  private readonly logger = new Logger(CapacityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CapacityRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Places a soft hold for one cart line. The hold is created when the
   * customer picks a delivery date, not on add-to-cart — holding a small
   * kitchen's capacity for browsers would strangle real orders.
   */
  async hold(req: HoldRequest): Promise<ReservationOutcome> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: req.variantId },
      include: { productionRule: true, product: true },
    });

    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new DomainError(ErrorCode.PRODUCT_UNAVAILABLE, CustomerMessage.productUnavailable);
    }

    // STOCKED items never consume production capacity.
    if (variant.product.stockMode === "STOCKED") {
      return { granted: true, reservationId: null, remainingUnits: null, reason: "OK", nextAvailableDate: null };
    }

    const rule = variant.productionRule;
    if (!rule) {
      throw new DomainError(
        ErrorCode.PRODUCT_UNAVAILABLE,
        CustomerMessage.productUnavailable,
        { details: { reason: "no_production_rule" } },
      );
    }

    if (req.qty < rule.minOrderQty || req.qty > rule.maxOrderQty) {
      throw new DomainError(
        ErrorCode.QTY_OUT_OF_RANGE,
        `You can order between ${rule.minOrderQty} and ${rule.maxOrderQty} of this item.`,
        { details: { min: rule.minOrderQty, max: rule.maxOrderQty } },
      );
    }

    if (!rule.deliveryWeekdays.includes(isoWeekdayOf(req.deliveryDate, req.timezone))) {
      return this.refuse(req, rule, "DATE_NOT_AVAILABLE");
    }

    const productionDate = productionDateFor(
      req.deliveryDate, rule.leadTimeDays, rule.productionWeekdays, req.timezone,
    );
    if (!productionDate) return this.refuse(req, rule, "DATE_NOT_AVAILABLE");

    if (isCutoffPassed(productionDate, rule.cutoffTime, rule.cutoffOffsetDays, req.timezone)) {
      throw new DomainError(
        ErrorCode.CUTOFF_PASSED,
        CustomerMessage.cutoffPassed(`${rule.cutoffTime} on the cut-off day`),
        { details: { nextAvailableDate: await this.nextAvailableDate(req, rule) } },
      );
    }

    const ttlMinutes = this.config.get("CAPACITY_HOLD_TTL_MINUTES", { infer: true });

    return this.prisma.$transaction(async (tx) => {
      const capacityId = await this.repo.ensureRow(
        tx, req.warehouseId, req.variantId, new Date(productionDate), rule.dailyCapacity,
      );
      const result = await this.repo.reserve(tx, capacityId, req.qty);

      if (!result.granted) {
        return {
          granted: false,
          reservationId: null,
          remainingUnits: result.remainingUnits,
          reason: result.reason,
          nextAvailableDate: null, // filled by the caller; see refuseWithNextDate
        } satisfies ReservationOutcome;
      }

      const reservation = await tx.capacityReservation.create({
        data: {
          capacityId,
          variantId: req.variantId,
          cartId: req.cartId ?? null,
          qty: req.qty,
          status: "HELD",
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
        select: { id: true },
      });

      return {
        granted: true,
        reservationId: reservation.id,
        remainingUnits: result.remainingUnits,
        reason: "OK",
        nextAvailableDate: null,
      } satisfies ReservationOutcome;
    });
  }

  /**
   * A refusal that cannot tell the customer what to do instead is a dead end,
   * so every capacity failure carries the next date we CAN make it.
   */
  async holdOrExplain(req: HoldRequest): Promise<ReservationOutcome> {
    const outcome = await this.hold(req);
    if (outcome.granted) return outcome;

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: req.variantId },
      include: { productionRule: true },
    });
    const next = variant?.productionRule
      ? await this.nextAvailableDate(req, variant.productionRule)
      : null;

    throw new DomainError(
      ErrorCode.CAPACITY_EXHAUSTED,
      CustomerMessage.capacityExhausted(friendlyDate(req.deliveryDate, req.timezone)),
      { details: { nextAvailableDate: next, remainingUnits: outcome.remainingUnits } },
    );
  }

  async confirmForOrder(reservationIds: string[], orderId: string): Promise<number> {
    return this.prisma.$transaction((tx) => this.repo.confirm(tx, reservationIds, orderId));
  }

  async release(reservationId: string): Promise<boolean> {
    const { released } = await this.prisma.$transaction((tx) => this.repo.release(tx, reservationId));
    return released;
  }

  /** Worker entry point: sweep holds whose TTL has passed. */
  async releaseExpiredHolds(): Promise<number> {
    const expired = await this.repo.findExpiredHolds();
    let released = 0;
    for (const { id } of expired) {
      if (await this.release(id)) released += 1;
    }
    if (released > 0) this.logger.log(`Released ${released} expired capacity holds`);
    return released;
  }

  /**
   * Scans forward for the first date that satisfies weekday, cut-off and
   * remaining-capacity rules. Bounded by the market's order horizon.
   */
  private async nextAvailableDate(
    req: HoldRequest,
    rule: {
      leadTimeDays: number; cutoffTime: string; cutoffOffsetDays: number;
      deliveryWeekdays: number[]; productionWeekdays: number[]; dailyCapacity: number;
    },
    horizonDays = 21,
  ): Promise<string | null> {
    let date = todayInMarket(req.timezone);
    for (let i = 0; i < horizonDays; i += 1) {
      date = addDays(date, 1, req.timezone);
      if (!rule.deliveryWeekdays.includes(isoWeekdayOf(date, req.timezone))) continue;

      const prodDate = productionDateFor(date, rule.leadTimeDays, rule.productionWeekdays, req.timezone);
      if (!prodDate) continue;
      if (isCutoffPassed(prodDate, rule.cutoffTime, rule.cutoffOffsetDays, req.timezone)) continue;

      const state = await this.repo.remaining(req.warehouseId, req.variantId, new Date(prodDate));
      const remaining = state ? state.remaining : rule.dailyCapacity;
      const open = state ? state.status === "OPEN" : true;
      if (open && remaining >= req.qty) return date;
    }
    return null;
  }

  private async refuse(
    req: HoldRequest,
    rule: Parameters<CapacityService["nextAvailableDate"]>[1],
    _reason: string,
  ): Promise<never> {
    throw new DomainError(
      ErrorCode.DATE_NOT_AVAILABLE,
      `We don't deliver this item on ${friendlyDate(req.deliveryDate, req.timezone)}.`,
      { details: { nextAvailableDate: await this.nextAvailableDate(req, rule) } },
    );
  }
}
