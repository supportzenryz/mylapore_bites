import { Hono } from "hono";
import { createPool, type Bindings } from "./db.js";
import { CapacityRepository } from "./repository/capacity.repository.js";

/**
 * Cloudflare Workers entry point — the edge-native replacement for
 * apps/api's NestJS `main.ts`. Scope of this first slice, deliberately:
 * the capacity module only, since it is the highest-risk, already-proven
 * piece of the system (see docs/architecture-cloudflare.html §10, phase
 * 1.5a). Auth, catalogue, cart, pricing etc. port next, module by module,
 * following the same pattern — a plain `pg` repository underneath a Hono
 * route, no framework-level rewrite beyond that.
 */

const app = new Hono<{ Bindings: Bindings }>();
const repo = new CapacityRepository();

app.get("/health", (c) => c.json({ ok: true, runtime: "workers" }));

/** Dev/admin helper — mirrors CapacityRepository.ensureRow. */
app.post("/capacity/ensure", async (c) => {
  const body = await c.req.json<{
    warehouseId: string; variantId: string; productionDate: string; capacityUnits: number;
  }>();
  const pool = createPool(c.env);
  const client = await pool.connect();
  try {
    const id = await repo.ensureRow(
      client, body.warehouseId, body.variantId, body.productionDate, body.capacityUnits,
    );
    return c.json({ capacityId: id });
  } finally {
    client.release();
    await pool.end();
  }
});

/**
 * THE checkout hold path. Reserve first; only insert the reservation row if
 * the guarded UPDATE actually granted units — same order of operations as
 * the VPS path's CapacityService.hold(), same transaction boundary.
 */
app.post("/capacity/reserve", async (c) => {
  const body = await c.req.json<{ capacityId: string; variantId: string; qty: number }>();
  const pool = createPool(c.env);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await repo.reserve(client, body.capacityId, body.qty);
    if (!result.granted) {
      await client.query("ROLLBACK");
      return c.json(result, 409);
    }
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO capacity_reservations ("capacityId","variantId",qty,status,"expiresAt")
       VALUES ($1,$2,$3,'HELD', now() + interval '15 minutes')
       RETURNING id`,
      [body.capacityId, body.variantId, body.qty],
    );
    await client.query("COMMIT");
    return c.json({ ...result, reservationId: rows[0]?.id });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
});

app.post("/capacity/release", async (c) => {
  const body = await c.req.json<{ reservationId: string }>();
  const pool = createPool(c.env);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await repo.release(client, body.reservationId);
    await client.query("COMMIT");
    return c.json(result);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
});

app.get("/capacity/remaining", async (c) => {
  const warehouseId = c.req.query("warehouseId");
  const variantId = c.req.query("variantId");
  const productionDate = c.req.query("productionDate");
  if (!warehouseId || !variantId || !productionDate) {
    return c.json({ error: "warehouseId, variantId and productionDate are required" }, 400);
  }
  const pool = createPool(c.env);
  try {
    const state = await repo.remaining(pool, warehouseId, variantId, productionDate);
    return c.json(state ?? { error: "no capacity row for that date" }, state ? 200 : 404);
  } finally {
    await pool.end();
  }
});

export default app;
