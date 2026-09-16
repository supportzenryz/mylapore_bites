import type { Pool, PoolClient } from "pg";

export interface ReserveResult {
  granted: boolean;
  remainingUnits: number | null;
  reason: "OK" | "CAPACITY_EXHAUSTED" | "CAPACITY_LOCKED" | "NO_CAPACITY_ROW";
}

/**
 * Cloudflare Workers port of
 * apps/api/src/modules/capacity/capacity.repository.ts.
 *
 * Same statements, same guarantee. What changes is only how a connection is
 * obtained: the NestJS version runs Prisma's tagged-template `$queryRaw`
 * through a generated Prisma Client; this version runs the identical SQL
 * (positional `$1, $2, ...` placeholders instead of Prisma's tagged
 * template — the wire protocol underneath is the same) through a plain
 * `pg.Pool`/`pg.PoolClient`, which is how Workers reaches Postgres via
 * Cloudflare Hyperdrive. This repository has no dependency on Prisma
 * codegen, so the binaries.prisma.sh egress block that stops
 * `prisma generate` in this sandbox (see claude/repository.md) does not
 * affect it either way.
 *
 * All mutation of reservedUnits lives in this file. Nothing else may
 * read-modify-write that column — enforced by convention here exactly as
 * it was on the VPS path, since Workers has no other place to put it.
 *
 * NOTE — schema scope: this port targets the same reduced schema as
 * tests/sql/capacity_fixture.sql (no createdAt/updatedAt columns on these
 * two tables), matching the existing sandbox concurrency-proof fixture.
 * The full packages/database/prisma/schema.prisma models carry
 * createdAt/updatedAt via Prisma's @updatedAt directive; add the
 * corresponding `now()` assignments here once this port runs against the
 * full schema instead of the fixture.
 */
export class CapacityRepository {
  /**
   * Ensures a capacity row exists for the day, seeded from the variant's
   * configured daily capacity. Idempotent and safe under races.
   */
  async ensureRow(
    tx: PoolClient,
    warehouseId: string,
    variantId: string,
    productionDate: string,
    capacityUnits: number,
  ): Promise<string> {
    await tx.query(
      `INSERT INTO production_capacity
         ("warehouseId","variantId","productionDate","capacityUnits","reservedUnits","producedUnits","status")
       VALUES ($1,$2,$3,$4,0,0,'OPEN')
       ON CONFLICT ("warehouseId","variantId","productionDate") DO NOTHING`,
      [warehouseId, variantId, productionDate, capacityUnits],
    );

    const { rows } = await tx.query<{ id: string }>(
      `SELECT id FROM production_capacity
       WHERE "warehouseId" = $1 AND "variantId" = $2 AND "productionDate" = $3
       LIMIT 1`,
      [warehouseId, variantId, productionDate],
    );

    const row = rows[0];
    if (!row) throw new Error("Capacity row could not be created");
    return row.id;
  }

  /**
   * THE atomic reserve. Zero rows returned means "full" — a normal domain
   * outcome, not an error. Identical WHERE clause to the VPS path: this is
   * the statement the whole migration hinges on holding up unchanged.
   */
  async reserve(tx: PoolClient, capacityId: string, qty: number): Promise<ReserveResult> {
    const { rows } = await tx.query<{ remaining: number }>(
      `UPDATE production_capacity
       SET    "reservedUnits" = "reservedUnits" + $2
       WHERE  id = $1
         AND  status = 'OPEN'
         AND  "reservedUnits" + $2 <= "capacityUnits"
       RETURNING ("capacityUnits" - "reservedUnits")::int AS remaining`,
      [capacityId, qty],
    );

    const row = rows[0];
    if (row) return { granted: true, remainingUnits: row.remaining, reason: "OK" };

    // Nothing was granted. Work out why, for an honest customer message.
    const current = await tx.query<{ status: string; capacityUnits: number; reservedUnits: number }>(
      `SELECT status, "capacityUnits"::int, "reservedUnits"::int
       FROM production_capacity WHERE id = $1`,
      [capacityId],
    );

    const state = current.rows[0];
    if (!state) return { granted: false, remainingUnits: null, reason: "NO_CAPACITY_ROW" };
    if (state.status !== "OPEN") return { granted: false, remainingUnits: 0, reason: "CAPACITY_LOCKED" };
    return {
      granted: false,
      remainingUnits: state.capacityUnits - state.reservedUnits,
      reason: "CAPACITY_EXHAUSTED",
    };
  }

  /**
   * Releasing is conditional on the row still being HELD/CONFIRMED, so a
   * retried queue message, a duplicate webhook and a manual cancellation
   * cannot each decrement.
   */
  async release(tx: PoolClient, reservationId: string): Promise<{ released: boolean; qty: number }> {
    const { rows } = await tx.query<{ qty: number; capacityId: string }>(
      `UPDATE capacity_reservations
       SET    status = 'RELEASED', "releasedAt" = now()
       WHERE  id = $1 AND status IN ('HELD','CONFIRMED')
       RETURNING qty::int, "capacityId"`,
      [reservationId],
    );

    const row = rows[0];
    if (!row) return { released: false, qty: 0 };

    await tx.query(
      `UPDATE production_capacity
       SET "reservedUnits" = GREATEST(0, "reservedUnits" - $2)
       WHERE id = $1`,
      [row.capacityId, row.qty],
    );

    return { released: true, qty: row.qty };
  }

  /** HELD → CONFIRMED on verified payment. Capacity total is unchanged. */
  async confirm(tx: PoolClient, reservationIds: string[], orderId: string): Promise<number> {
    if (reservationIds.length === 0) return 0;
    const res = await tx.query(
      `UPDATE capacity_reservations
       SET status = 'CONFIRMED', "orderId" = $2, "expiresAt" = NULL
       WHERE id = ANY($1::uuid[]) AND status = 'HELD'`,
      [reservationIds, orderId],
    );
    return res.rowCount ?? 0;
  }

  /** Swept by a Cron Trigger. Returns ids so each release stays individually idempotent. */
  async findExpiredHolds(pool: Pool, limit = 200): Promise<{ id: string }[]> {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM capacity_reservations
       WHERE status = 'HELD' AND "expiresAt" IS NOT NULL AND "expiresAt" < now()
       ORDER BY "expiresAt" ASC
       LIMIT $1`,
      [limit],
    );
    return rows;
  }

  async remaining(
    pool: Pool,
    warehouseId: string,
    variantId: string,
    productionDate: string,
  ): Promise<{ capacityUnits: number; reservedUnits: number; remaining: number; status: string } | null> {
    const { rows } = await pool.query(
      `SELECT "capacityUnits"::int, "reservedUnits"::int,
              ("capacityUnits" - "reservedUnits")::int AS remaining, status
       FROM production_capacity
       WHERE "warehouseId" = $1 AND "variantId" = $2 AND "productionDate" = $3`,
      [warehouseId, variantId, productionDate],
    );
    return rows[0] ?? null;
  }
}
