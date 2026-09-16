// Proves the Cloudflare-Workers port of the capacity repository
// (apps/edge-api/src/repository/capacity.repository.ts) preserves the exact
// same overselling guarantee as the NestJS/Prisma original, by driving the
// ACTUAL ported module — not a second inline copy of the SQL — against a
// real Postgres, the same way tests/concurrency/capacity.proof.mjs proves
// it for the VPS path. Same fixture, same scenario shapes.
import pg from "pg";
// Imports the COMPILED output of the ported repository (built by
// `pnpm --filter @mb/edge-api build:test`, or the tsc line in this repo's
// README) rather than the .ts source directly — Node's native TS handling
// and tsx's loader disagree on plain dynamic .ts imports in this sandbox,
// and this is closer to reality anyway: Wrangler always bundles the
// TypeScript before it runs, it is never executed as raw .ts.
import { CapacityRepository } from "../../apps/edge-api/.build/repository/capacity.repository.js";

const { Pool } = pg;
const CONN = process.env.DATABASE_URL
  ?? "postgresql://mylaporebites:localdev@127.0.0.1:5432/mylaporebites";
const pool = new Pool({ connectionString: CONN, max: 40 });
const repo = new CapacityRepository();
const WH = "00000000-0000-7000-8000-000000000001";
const VAR = "00000000-0000-7000-8000-0000000000aa";

async function seedCapacity(capacity) {
  await pool.query("DELETE FROM capacity_reservations");
  await pool.query("DELETE FROM production_capacity");
  const client = await pool.connect();
  try {
    return await repo.ensureRow(client, WH, VAR, "2026-09-19", capacity);
  } finally {
    client.release();
  }
}

/** One checkout attempt, through the ported repository — not inline SQL. */
async function checkout(capacityId, qty) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const result = await repo.reserve(c, capacityId, qty);
    if (!result.granted) {
      await c.query("ROLLBACK");
      return { ok: false, reason: result.reason };
    }
    await c.query(
      `INSERT INTO capacity_reservations ("capacityId","variantId",qty,status,"expiresAt")
       VALUES ($1,$2,$3,'HELD', now() + interval '15 minutes')`,
      [capacityId, VAR, qty],
    );
    await c.query("COMMIT");
    return { ok: true, remaining: result.remainingUnits };
  } catch (e) {
    await c.query("ROLLBACK");
    return { ok: false, err: e.message };
  } finally {
    c.release();
  }
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
};

console.log("\nTEST 1  N concurrent checkouts against capacity N-1  (via CapacityRepository.reserve)");
{
  const N = 30, CAP = N - 1;
  const id = await seedCapacity(CAP);
  const results = await Promise.all(Array.from({ length: N }, () => checkout(id, 1)));
  const ok = results.filter((r) => r.ok).length;
  const row = (await pool.query("SELECT * FROM production_capacity WHERE id=$1", [id])).rows[0];
  const held = (await pool.query("SELECT count(*)::int c FROM capacity_reservations")).rows[0].c;
  check(`exactly ${CAP} of ${N} succeed`, ok === CAP, `got ${ok}`);
  check("reservedUnits == capacityUnits", row.reservedUnits === row.capacityUnits, `${row.reservedUnits}/${row.capacityUnits}`);
  check("reservation rows match successes", held === ok, `${held} rows`);
  check("never oversold", row.reservedUnits <= row.capacityUnits);
}

console.log("\nTEST 2  mixed quantities cannot straddle the limit");
{
  const CAP = 100;
  const id = await seedCapacity(CAP);
  const qtys = Array.from({ length: 60 }, (_, i) => (i % 4) + 1); // 1..4, sums to 150
  const results = await Promise.all(qtys.map((q) => checkout(id, q)));
  const granted = results.reduce((s, r, i) => s + (r.ok ? qtys[i] : 0), 0);
  const row = (await pool.query("SELECT * FROM production_capacity WHERE id=$1", [id])).rows[0];
  check("granted units == reservedUnits", granted === row.reservedUnits, `${granted} vs ${row.reservedUnits}`);
  check("never exceeds capacity", row.reservedUnits <= CAP, `${row.reservedUnits}/${CAP}`);
  check("capacity actually filled", row.reservedUnits > CAP - 4, `${row.reservedUnits}/${CAP}`);
}

console.log("\nTEST 3  release (via CapacityRepository.release) is idempotent under double-fire");
{
  const id = await seedCapacity(10);
  await checkout(id, 4);
  const rid = (await pool.query("SELECT id FROM capacity_reservations LIMIT 1")).rows[0].id;
  const release = async () => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const r = await repo.release(c, rid);
      await c.query("COMMIT");
      return r.released;
    } finally {
      c.release();
    }
  };
  const fired = await Promise.all([release(), release(), release(), release()]);
  const row = (await pool.query("SELECT * FROM production_capacity WHERE id=$1", [id])).rows[0];
  check("exactly one release takes effect", fired.filter(Boolean).length === 1, `${fired.filter(Boolean).length}`);
  check("reservedUnits back to 0, not negative", row.reservedUnits === 0, `${row.reservedUnits}`);
}

console.log("\nTEST 4  ensureRow is idempotent under concurrent first-touch");
{
  await pool.query("DELETE FROM capacity_reservations");
  await pool.query("DELETE FROM production_capacity");
  const ids = await Promise.all(
    Array.from({ length: 20 }, async () => {
      const c = await pool.connect();
      try {
        return await repo.ensureRow(c, WH, VAR, "2026-09-26", 50);
      } finally {
        c.release();
      }
    }),
  );
  const unique = new Set(ids);
  const rows = (await pool.query("SELECT count(*)::int c FROM production_capacity")).rows[0].c;
  check("all callers resolve to the same row id", unique.size === 1, `${unique.size} distinct ids`);
  check("exactly one row was created", rows === 1, `${rows} rows`);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}\n`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);
