# @mb/edge-api

Cloudflare Workers port of `apps/api`, in progress. Full plan and rationale:
`docs/architecture-cloudflare.html` (published artifact) and
`claude/deployment-migration-cloudflare.md` in the project.

## Status — phase 1.5a

Ported so far: the **capacity module** only (`src/repository/capacity.repository.ts`),
because it is the highest-risk, already-proven piece of the system — the
guarded `UPDATE ... RETURNING` that stops the kitchen from being oversold.
Everything else (auth, catalogue, cart, pricing, delivery, markets, …) is
still only on the NestJS/VPS path in `apps/api` and ports next, module by
module, the same way.

Proof that the port preserves the guarantee:
`tests/concurrency/capacity.proof.edge.mjs` drives this repository directly
(not a re-typed copy of the SQL) through the same N-concurrent-checkout
scenario as `tests/concurrency/capacity.proof.mjs` proves for the VPS path.

## Running it

Needs a local Postgres with `tests/sql/capacity_fixture.sql` loaded (same as
the VPS-path proof — see `claude/repository.md`).

```bash
pnpm --filter @mb/edge-api dev        # wrangler dev, local Workers runtime
node tests/concurrency/capacity.proof.edge.mjs   # re-run the concurrency proof
```

## What's intentionally not here yet

- Auth (JWT verify via `jose`, OTP hashing via `hash-wasm`'s Argon2id instead
  of `@node-rs/argon2` — that package is a native binding and does not run
  on Workers)
- Everything backed by Prisma's generated client (catalogue, orders, …) —
  needs either a Prisma edge/Hyperdrive driver adapter or a hand-written
  `pg` repository per module, decided module by module as each ports
- Queues/Cron Triggers replacing BullMQ
- The Hyperdrive binding itself (needs the Neon account — see the
  architecture doc §09)
