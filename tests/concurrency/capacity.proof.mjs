import pg from 'pg';
const { Pool } = pg;
const CONN = process.env.DATABASE_URL
  ?? 'postgresql://mylaporebites:localdev@127.0.0.1:5432/mylaporebites';
const pool = new Pool({ connectionString: CONN, max: 40 });
const WH = '00000000-0000-7000-8000-000000000001';
const VAR = '00000000-0000-7000-8000-0000000000aa';

// EXACT statement the CapacityRepository runs. Nothing else touches reservedUnits.
const RESERVE = `
  UPDATE production_capacity
  SET    "reservedUnits" = "reservedUnits" + $2
  WHERE  id = $1
    AND  status = 'OPEN'
    AND  "reservedUnits" + $2 <= "capacityUnits"
  RETURNING "capacityUnits" - "reservedUnits" AS remaining`;

const ORDERNO = `
  INSERT INTO order_counters ("marketCode","businessDate","lastSeq")
  VALUES ($1,$2,1)
  ON CONFLICT ("marketCode","businessDate")
  DO UPDATE SET "lastSeq" = order_counters."lastSeq" + 1
  RETURNING "lastSeq"`;

async function seedCapacity(capacity) {
  await pool.query('DELETE FROM capacity_reservations');
  await pool.query('DELETE FROM production_capacity');
  const r = await pool.query(
    `INSERT INTO production_capacity ("warehouseId","variantId","productionDate","capacityUnits")
     VALUES ($1,$2,'2026-09-19',$3) RETURNING id`, [WH, VAR, capacity]);
  return r.rows[0].id;
}

/** One checkout attempt: reserve inside a transaction, like the real service. */
async function checkout(capacityId, qty) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const res = await c.query(RESERVE, [capacityId, qty]);
    if (res.rowCount === 0) { await c.query('ROLLBACK'); return { ok: false }; }
    await c.query(
      `INSERT INTO capacity_reservations ("capacityId","variantId",qty,status,"expiresAt")
       VALUES ($1,$2,$3,'HELD', now() + interval '15 minutes')`, [capacityId, VAR, qty]);
    await c.query('COMMIT');
    return { ok: true, remaining: res.rows[0].remaining };
  } catch (e) { await c.query('ROLLBACK'); return { ok: false, err: e.message }; }
  finally { c.release(); }
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

console.log('\nTEST 1  N concurrent checkouts against capacity N-1');
{
  const N = 30, CAP = N - 1, id = await seedCapacity(CAP);
  const results = await Promise.all(Array.from({ length: N }, () => checkout(id, 1)));
  const ok = results.filter(r => r.ok).length;
  const row = (await pool.query('SELECT * FROM production_capacity WHERE id=$1', [id])).rows[0];
  const held = (await pool.query('SELECT count(*)::int c FROM capacity_reservations')).rows[0].c;
  check(`exactly ${CAP} of ${N} succeed`, ok === CAP, `got ${ok}`);
  check('reservedUnits == capacityUnits', row.reservedUnits === row.capacityUnits, `${row.reservedUnits}/${row.capacityUnits}`);
  check('reservation rows match successes', held === ok, `${held} rows`);
  check('never oversold', row.reservedUnits <= row.capacityUnits);
}

console.log('\nTEST 2  mixed quantities cannot straddle the limit');
{
  const CAP = 100, id = await seedCapacity(CAP);
  const qtys = Array.from({ length: 60 }, (_, i) => (i % 4) + 1); // 1..4, sums to 150
  const results = await Promise.all(qtys.map(q => checkout(id, q)));
  const granted = results.reduce((s, r, i) => s + (r.ok ? qtys[i] : 0), 0);
  const row = (await pool.query('SELECT * FROM production_capacity WHERE id=$1', [id])).rows[0];
  check('granted units == reservedUnits', granted === row.reservedUnits, `${granted} vs ${row.reservedUnits}`);
  check('never exceeds capacity', row.reservedUnits <= CAP, `${row.reservedUnits}/${CAP}`);
  check('capacity actually filled', row.reservedUnits > CAP - 4, `${row.reservedUnits}/${CAP}`);
}

console.log('\nTEST 3  release is idempotent under double-fire');
{
  const id = await seedCapacity(10);
  await checkout(id, 4);
  const rid = (await pool.query('SELECT id FROM capacity_reservations LIMIT 1')).rows[0].id;
  const release = async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await c.query(
        `UPDATE capacity_reservations SET status='RELEASED', "releasedAt"=now()
         WHERE id=$1 AND status='HELD' RETURNING qty`, [rid]);
      if (r.rowCount) {
        await c.query(`UPDATE production_capacity SET "reservedUnits" = "reservedUnits" - $2 WHERE id=$1`,
          [id, r.rows[0].qty]);
      }
      await c.query('COMMIT');
      return r.rowCount;
    } finally { c.release(); }
  };
  const fired = await Promise.all([release(), release(), release(), release()]);
  const row = (await pool.query('SELECT * FROM production_capacity WHERE id=$1', [id])).rows[0];
  check('exactly one release takes effect', fired.filter(Boolean).length === 1, `${fired.filter(Boolean).length}`);
  check('reservedUnits back to 0, not negative', row.reservedUnits === 0, `${row.reservedUnits}`);
}

console.log('\nTEST 4  order numbers unique under concurrency');
{
  await pool.query('DELETE FROM order_counters');
  const N = 200;
  const seqs = await Promise.all(Array.from({ length: N }, async () => {
    const r = await pool.query(ORDERNO, ['IND', '2026-09-14']);
    return r.rows[0].lastSeq;
  }));
  const unique = new Set(seqs);
  check(`${N} concurrent allocations are unique`, unique.size === N, `${unique.size} unique`);
  check('sequence is gapless 1..N', Math.min(...seqs) === 1 && Math.max(...seqs) === N);
  const sample = `MB-IND-20260914-${String(Math.max(...seqs)).padStart(6, '0')}`;
  check('format matches spec', /^MB-[A-Z]{2,3}-\d{8}-\d{6}$/.test(sample), sample);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
await pool.end();
process.exit(failures === 0 ? 0 : 1);
