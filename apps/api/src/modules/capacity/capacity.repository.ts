import { Injectable } from "@nestjs/common";
import { Prisma } from "@mb/database";
import { PrismaService } from "../../common/prisma/prisma.service.js";

export interface ReserveResult {
  granted: boolean;
  remainingUnits: number | null;
  reason: "OK" | "CAPACITY_EXHAUSTED" | "CAPACITY_LOCKED" | "NO_CAPACITY_ROW";
}

/**
 * All mutation of `reservedUnits` lives in this file. Nothing else in the
 * codebase may read-modify-write that column.
 *
 * Why: two customers reaching for the last packs of Murukku at the same
 * instant must not both succeed. The guard is not an application lock — it is
 * a single conditional UPDATE that PostgreSQL serialises on the row. Under
 * READ COMMITTED the second transaction blocks until the first commits, then
 * re-evaluates its WHERE clause against the updated row, so it cannot act on
 * a stale reservedUnits.
 */
@Injectable()
export class CapacityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ensures a capacity row exists for the day, seeded from the variant's
   * configured daily capacity. Idempotent and safe under races.
   */
  async ensureRow(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
    productionDate: Date,
    capacityUnits: number,
  ): Promise<string> {
    await tx.$executeRaw`
      INSERT INTO production_capacity
        ("id","warehouseId","variantId","productionDate","capacityUnits","reservedUnits","producedUnits","status","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(), ${warehouseId}::uuid, ${variantId}::uuid, ${productionDate}::date, ${capacityUnits}, 0, 0, 'OPEN', now(), now())
      ON CONFLICT ("warehouseId","variantId","productionDate") DO NOTHING`;

    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM production_capacity
      WHERE "warehouseId" = ${warehouseId}::uuid
        AND "variantId"   = ${variantId}::uuid
        AND "productionDate" = ${productionDate}::date
      LIMIT 1`;

    const row = rows[0];
    if (!row) throw new Error("Capacity row could not be created");
    return row.id;
  }

  /**
   * THE atomic reserve. Zero rows returned means "full" — a normal domain
   * outcome, not an error.
   */
  async reserve(
    tx: Prisma.TransactionClient,
    capacityId: string,
    qty: number,
  ): Promise<ReserveResult> {
    const rows = await tx.$queryRaw<{ remaining: number }[]>`
      UPDATE production_capacity
      SET    "reservedUnits" = "reservedUnits" + ${qty},
             "updatedAt"     = now()
      WHERE  "id" = ${capacityId}::uuid
        AND  "status" = 'OPEN'
        AND  "reservedUnits" + ${qty} <= "capacityUnits"
      RETURNING ("capacityUnits" - "reservedUnits")::int AS remaining`;

    const row = rows[0];
    if (row) return { granted: true, remainingUnits: row.remaining, reason: "OK" };

    // Nothing was granted. Work out why, for an honest customer message.
    const current = await tx.$queryRaw<
      { status: string; capacityUnits: number; reservedUnits: number }[]
    >`
      SELECT "status", "capacityUnits"::int, "reservedUnits"::int
      FROM production_capacity WHERE "id" = ${capacityId}::uuid`;

    const state = current[0];
    if (!state) return { granted: false, remainingUnits: null, reason: "NO_CAPACITY_ROW" };
    if (state.status !== "OPEN") {
      return { granted: false, remainingUnits: 0, reason: "CAPACITY_LOCKED" };
    }
    return {
      granted: false,
      remainingUnits: state.capacityUnits - state.reservedUnits,
      reason: "CAPACITY_EXHAUSTED",
    };
  }

  /**
   * Releasing is conditional on the row still being HELD, so a retried job,
   * a duplicate webhook and a manual cancellation cannot each decrement.
   */
  async release(
    tx: Prisma.TransactionClient,
    reservationId: string,
  ): Promise<{ released: boolean; qty: number }> {
    const rows = await tx.$queryRaw<{ qty: number; capacityId: string }[]>`
      UPDATE capacity_reservations
      SET    "status" = 'RELEASED', "releasedAt" = now(), "updatedAt" = now()
      WHERE  "id" = ${reservationId}::uuid
        AND  "status" IN ('HELD','CONFIRMED')
      RETURNING "qty"::int, "capacityId"`;

    const row = rows[0];
    if (!row) return { released: false, qty: 0 };

    await tx.$executeRaw`
      UPDATE production_capacity
      SET    "reservedUnits" = GREATEST(0, "reservedUnits" - ${row.qty}),
             "updatedAt"     = now()
      WHERE  "id" = ${row.capacityId}::uuid`;

    return { released: true, qty: row.qty };
  }

  /** HELD → CONFIRMED on verified payment. Capacity total is unchanged. */
  async confirm(
    tx: Prisma.TransactionClient,
    reservationIds: string[],
    orderId: string,
  ): Promise<number> {
    if (reservationIds.length === 0) return 0;
    return tx.$executeRaw`
      UPDATE capacity_reservations
      SET "status" = 'CONFIRMED', "orderId" = ${orderId}::uuid,
          "expiresAt" = NULL, "updatedAt" = now()
      WHERE "id" = ANY(${reservationIds}::uuid[]) AND "status" = 'HELD'`;
  }

  /** Swept by the worker. Returns ids so each release stays individually idempotent. */
  async findExpiredHolds(limit = 200): Promise<{ id: string }[]> {
    return this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM capacity_reservations
      WHERE "status" = 'HELD' AND "expiresAt" IS NOT NULL AND "expiresAt" < now()
      ORDER BY "expiresAt" ASC
      LIMIT ${limit}`;
  }

  async remaining(
    warehouseId: string,
    variantId: string,
    productionDate: Date,
  ): Promise<{ capacityUnits: number; reservedUnits: number; remaining: number; status: string } | null> {
    const rows = await this.prisma.$queryRaw<
      { capacityUnits: number; reservedUnits: number; remaining: number; status: string }[]
    >`
      SELECT "capacityUnits"::int, "reservedUnits"::int,
             ("capacityUnits" - "reservedUnits")::int AS remaining, "status"
      FROM production_capacity
      WHERE "warehouseId" = ${warehouseId}::uuid
        AND "variantId"   = ${variantId}::uuid
        AND "productionDate" = ${productionDate}::date`;
    return rows[0] ?? null;
  }
}
