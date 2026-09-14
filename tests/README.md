# Tests

| Suite | Command | Needs |
|---|---|---|
| Unit (pure logic) | `pnpm --filter @mb/api test` | nothing |
| Concurrency proof | `pnpm test:concurrency` | PostgreSQL |
| Integration (API) | `pnpm --filter @mb/api test:int` | PostgreSQL + Redis + migrated DB |

## The concurrency proof

`concurrency/capacity.proof.mjs` is the most important test in the repository.
It fires N simultaneous checkouts at a capacity of N−1 and asserts that exactly
N−1 succeed — against a real PostgreSQL, using the same SQL statements that
`CapacityRepository` runs in production. Mocks cannot prove this; only a real
database can.

It also covers:

- mixed quantities that could straddle the limit,
- double-fired releases (must decrement exactly once),
- 200 concurrent order-number allocations (must be unique and gapless).

`sql/capacity_fixture.sql` creates just the tables the proof touches. It is a
test fixture, **not** a migration — `packages/database/prisma/schema.prisma` is
the single source of truth for the schema. The fixture exists so the proof can
run before `prisma migrate` in a fresh environment.

Run it:

```bash
docker compose -f docker/docker-compose.yml up -d postgres
psql "$DATABASE_URL" -f tests/sql/capacity_fixture.sql
pnpm test:concurrency
```
