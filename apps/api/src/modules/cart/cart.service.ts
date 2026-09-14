import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  ErrorCode, type CartLine, type CartView,
} from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { DomainError, CustomerMessage } from "../../common/errors/domain.error.js";
import { PricingService } from "../pricing/pricing.service.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

export interface CartIdentity {
  customerId?: string;
  guestToken?: string;
}

const CART_TTL_DAYS = 30;

/**
 * The cart holds variant ids and quantities. Nothing monetary.
 *
 * Every price, tax figure and total in a CartView is recomputed by the pricing
 * service on read, so a tampered client payload cannot change what anything
 * costs. Capacity is NOT held here — that happens when the customer picks a
 * delivery date at checkout (Phase 3), because holding a small kitchen's
 * capacity for browsers would strangle real orders.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /** Finds the caller's active cart, creating one if needed. */
  async resolve(
    market: ResolvedMarket,
    identity: CartIdentity,
  ): Promise<{ id: string; guestToken: string | null }> {
    if (identity.customerId) {
      const existing = await this.prisma.cart.findFirst({
        where: { customerId: identity.customerId, marketId: market.id, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        select: { id: true, guestToken: true },
      });
      if (existing) return existing;
    }

    if (identity.guestToken) {
      const guestCart = await this.prisma.cart.findUnique({
        where: { guestToken: identity.guestToken },
        select: { id: true, guestToken: true, status: true, customerId: true },
      });

      if (guestCart && guestCart.status === "ACTIVE") {
        // Signing in adopts the guest cart rather than discarding it.
        if (identity.customerId && !guestCart.customerId) {
          await this.prisma.cart.update({
            where: { id: guestCart.id },
            data: { customerId: identity.customerId },
          });
        }
        return { id: guestCart.id, guestToken: guestCart.guestToken };
      }
    }

    const token = identity.customerId ? null : randomBytes(24).toString("base64url");
    const created = await this.prisma.cart.create({
      data: {
        marketId: market.id,
        customerId: identity.customerId ?? null,
        guestToken: token,
        expiresAt: new Date(Date.now() + CART_TTL_DAYS * 86_400_000),
      },
      select: { id: true, guestToken: true },
    });
    return created;
  }

  async view(cartId: string, market: ResolvedMarket): Promise<CartView> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            variant: {
              include: {
                productionRule: true,
                product: { include: { images: { where: { isThumbnail: true }, take: 1 } } },
              },
            },
          },
        },
      },
    });

    if (!cart) throw new DomainError(ErrorCode.NOT_FOUND, "We couldn't find your cart.");

    const priced = await this.pricing.priceLines(
      market,
      cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
    );
    const pricedByVariant = new Map(priced.map((p) => [p.variantId, p]));

    const lines: CartLine[] = [];
    for (const item of cart.items) {
      const price = pricedByVariant.get(item.variantId);
      // A line whose product left the market is dropped rather than priced at zero.
      if (!price) continue;

      const rule = item.variant.productionRule;
      lines.push({
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.productId,
        productSlug: item.variant.product.slug,
        productName: item.variant.product.name,
        variantName: item.variant.name,
        thumbnailUrl: item.variant.product.images[0]?.url ?? null,
        stockMode: item.variant.product.stockMode,
        qty: item.qty,
        unitPrice: price.unitPrice,
        lineTotal: price.lineTotal,
        minOrderQty: rule?.minOrderQty ?? 1,
        maxOrderQty: rule?.maxOrderQty ?? 99,
        preOrder:
          item.variant.product.stockMode === "STOCKED" || !rule
            ? null
            : { leadTimeDays: rule.leadTimeDays, cutoffTime: rule.cutoffTime },
      });
    }

    const sum = (pick: (l: (typeof priced)[number]) => string): string =>
      priced
        .filter((p) => lines.some((l) => l.variantId === p.variantId))
        .reduce((total, p) => total + Math.round(Number(pick(p)) * 100), 0) / 100 + "";

    const subtotal = Number(sum((p) => p.lineSubtotal)).toFixed(2);
    const tax = Number(sum((p) => p.lineTax)).toFixed(2);
    const total = Number(sum((p) => p.lineTotal)).toFixed(2);

    return {
      id: cart.id,
      lines,
      totals: {
        currency: market.currency,
        subtotal,
        tax,
        deliveryFee: null, // Set once an address and date exist (Phase 3).
        discount: "0.00",
        total,
        itemCount: lines.reduce((n, l) => n + l.qty, 0),
      },
      freshnessSummary: freshnessSummary(lines),
    };
  }

  async addItem(cartId: string, market: ResolvedMarket, variantId: string, qty: number): Promise<CartView> {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        isActive: true,
        deletedAt: null,
        marketVariants: { some: { isActive: true, marketProduct: { marketId: market.id, isActive: true } } },
      },
      include: { productionRule: true },
    });

    if (!variant) {
      throw new DomainError(ErrorCode.PRODUCT_UNAVAILABLE, CustomerMessage.productUnavailable);
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
      select: { qty: true },
    });
    const nextQty = (existing?.qty ?? 0) + qty;

    this.assertQtyInRange(nextQty, variant.productionRule);

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { qty: nextQty },
      create: { cartId, variantId, qty: nextQty },
    });
    await this.touch(cartId);

    return this.view(cartId, market);
  }

  async updateItem(cartId: string, market: ResolvedMarket, itemId: string, qty: number): Promise<CartView> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { variant: { include: { productionRule: true } } },
    });
    if (!item) throw new DomainError(ErrorCode.NOT_FOUND, "That item is no longer in your cart.");

    if (qty === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      this.assertQtyInRange(qty, item.variant.productionRule);
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { qty } });
    }
    await this.touch(cartId);

    return this.view(cartId, market);
  }

  async removeItem(cartId: string, market: ResolvedMarket, itemId: string): Promise<CartView> {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
    await this.touch(cartId);
    return this.view(cartId, market);
  }

  async clear(cartId: string, market: ResolvedMarket): Promise<CartView> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    await this.touch(cartId);
    return this.view(cartId, market);
  }

  /**
   * Per-variant limits come from the production rule, because a kitchen that
   * can make 60 boxes a day should not accept an order for 200.
   */
  private assertQtyInRange(
    qty: number,
    rule: { minOrderQty: number; maxOrderQty: number } | null,
  ): void {
    const min = rule?.minOrderQty ?? 1;
    const max = rule?.maxOrderQty ?? 99;
    if (qty < min || qty > max) {
      throw new DomainError(
        ErrorCode.QTY_OUT_OF_RANGE,
        qty > max
          ? `We can make up to ${max} of this per order. For larger quantities, please contact us.`
          : `The minimum for this item is ${min}.`,
        { details: { min, max } },
      );
    }
  }

  private async touch(cartId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: new Date(Date.now() + CART_TTL_DAYS * 86_400_000) },
    });
  }
}

/** Cart-level copy derived from the lines, not hard-coded in the UI. */
function freshnessSummary(lines: CartLine[]): string | null {
  const fresh = lines.filter((l) => l.preOrder);
  if (fresh.length === 0) return null;

  const maxLead = Math.max(...fresh.map((l) => l.preOrder!.leadTimeDays));
  if (fresh.length === lines.length) {
    return `Everything in your basket is made fresh in Mylapore after you order. Choose a delivery date at checkout — the earliest is ${maxLead} day${maxLead === 1 ? "" : "s"} away.`;
  }
  return `${fresh.length} item${fresh.length === 1 ? "" : "s"} in your basket are made fresh after you order, so your delivery date is set by ${fresh.length === 1 ? "that item" : "the longest of them"}.`;
}
