# Mylapore Bites

> Made Fresh. From Mylapore. To Your Door.

A fresh-food **pre-order** platform. One backend, one database, one admin,
serving `mylaporebites.com` (India) and `mylaporebites.co.uk` (UK) as two
storefronts of a single system.

**The organising idea:** most of what we sell does not exist when the order is
placed. An order is not a claim on stock — it is a *reservation against a future
day's production capacity in the Mylapore kitchen*. `production_capacity` and
`capacity_reservations` are therefore the centre of this codebase, not an
add-on to a conventional catalogue.

```
customer orders → capacity reserved → order confirmed → production plan
   → prepared fresh → quality check → packed → delivered → notified → review
```

---

## Stack

| Layer | Choice |
|---|---|
| API | NestJS 11 · TypeScript · `/v1` |
| Storefront & Admin | Next.js 15 (App Router) |
| Database | PostgreSQL 17 · Prisma 7 (pg driver adapter) |
| Cache / queues | Redis · BullMQ |
| Payments | Razorpay (India) · Stripe (UK) behind one interface |
| Messaging | WhatsApp Cloud API, SMS fallback |
| Storage | Cloudflare R2 (MinIO locally) |
| Deploy | Docker Compose on a single VPS, Caddy for TLS |

Architecture: `docs/` and the published Phase 0 design document.

---

## Run it locally

**Requirements:** Node 22+, pnpm 10+, Docker.

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env
#    Generate the JWT keypair and paste both values into .env:
openssl genpkey -algorithm RSA -out /tmp/jwt.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -in /tmp/jwt.key -pubout -out /tmp/jwt.pub
#    JWT_PRIVATE_KEY / JWT_PUBLIC_KEY  (one line, \n escaped)
#    Also set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD.

# 3. Start Postgres, Redis and MinIO
pnpm infra:up

# 4. Create the schema and seed it
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run (three terminals)
pnpm api:dev                          # http://localhost:4000/v1
pnpm --filter @mb/storefront dev      # http://localhost:3000
pnpm --filter @mb/admin dev           # http://localhost:3001
pnpm worker:dev                       # optional: capacity sweep + notifications
```

`localhost` is registered as a market domain by the seed, so the storefront
resolves to the India market with no extra configuration.

### Working on the frontend without a database

`pnpm mock:api` starts a dev-only server on :4000 that serves the same response
shapes as the real API, reading the **seed catalogue directly** so it cannot
drift from real data. Useful for UI work and for CI visual checks.

```bash
pnpm dev:mock        # mock API + storefront, one command
```

Or separately, if you prefer two terminals:

```bash
pnpm mock:api                           # terminal 1
pnpm --filter @mb/storefront dev        # terminal 2
```

It has no auth, no capacity engine and no persistence beyond process memory.
It is never built into a production image.

### Signing in without a WhatsApp account

With `SMS_PROVIDER=console` and no Meta credentials, the OTP is printed to the
API log **and** returned as `devCode` on the request response (never in
production). So local login works out of the box:

```bash
curl -s localhost:4000/v1/auth/otp/request \
  -H 'content-type: application/json' -H 'host: localhost' \
  -d '{"phone":"9876543210"}'
# → { "challengeId": "...", "channel": "SMS", "devCode": "123456", ... }

curl -s localhost:4000/v1/auth/otp/verify \
  -H 'content-type: application/json' -H 'host: localhost' \
  -d '{"challengeId":"...","code":"123456"}'
```

---

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | All apps in watch mode |
| `pnpm build` | Build every package and app |
| `pnpm typecheck` | Typecheck the whole workspace |
| `pnpm test:unit` | Unit tests (no services needed) |
| `pnpm test:concurrency` | **The overbooking proof** — needs Postgres |
| `pnpm test:e2e:cart` | Cart flow in a real browser — needs the storefront running |
| `pnpm test:visual` | Screenshots every page at 390px and desktop, checks for overflow |
| `pnpm mock:api` | Dev-only API on :4000 serving seed data, no database needed |
| `pnpm dev:mock` | Mock API + storefront together — the no-database path |
| `pnpm dev:full` | API + worker + storefront + admin — needs Postgres and Redis |
| `pnpm verify` | Typecheck + unit tests |
| `pnpm db:migrate` / `db:seed` / `db:reset` / `db:studio` | Database |
| `pnpm infra:up` / `infra:down` | Local Postgres, Redis, MinIO |

### Docker

```bash
# Local services only (apps run on the host, with hot reload)
docker compose -f docker/docker-compose.yml up -d

# Full production topology
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d
```

`api` and `worker` run **the same image** with different commands, so they can
never drift out of sync.

---

## Layout

```
apps/
  api/          NestJS. src/main.ts (HTTP) and src/worker.ts (jobs) —
                one codebase, two entry points, one Docker image.
    src/common/     market resolution · RBAC · idempotency · audit · errors
    src/modules/    auth · catalog · customers · capacity · pricing ·
                    delivery · notifications · markets · health
  storefront/   Next.js. ONE app serves both domains; middleware forwards the
                hostname and the API resolves the market.
  admin/        Next.js. Scaffolded; built out in Phase 7.
packages/
  database/     Prisma schema, migrations, seed. Source of truth for the schema.
  contracts/    Zod schemas + types shared by the API and both web apps.
docker/         Dockerfiles, dev + prod compose, Caddyfile
tests/          Concurrency proof and SQL fixtures
```

---

## Two rules that keep this one platform

**1. Market is a row, never a branch.** Nothing in the code says "if UK".
Prices live in `market_product_variants`, tax in `tax_rates`, delivery in
`delivery_zones`. Adding the USA should be inserting rows and pointing a domain
at the proxy. If it ever needs a code change, something was modelled wrong.

**2. Capacity is only ever changed by one statement.** `reservedUnits` is
mutated exclusively by the guarded `UPDATE` in `CapacityRepository.reserve()`:

```sql
UPDATE production_capacity
SET    "reservedUnits" = "reservedUnits" + $qty
WHERE  id = $id AND status = 'OPEN'
  AND  "reservedUnits" + $qty <= "capacityUnits"
RETURNING "capacityUnits" - "reservedUnits" AS remaining;
```

Zero rows returned means *full* — a normal domain outcome that returns the next
available date, not an error. Never read-modify-write that column.

---

## Phase status

- **Phase 0** Architecture — complete
- **Phase 1** Monorepo, schema, markets, catalogue, customers, auth, seed — complete
- **Phase 2** Mobile storefront, cart, search, product pages — **this release**
- Phase 3 Availability + delivery · Phase 4 Checkout + payments ·
  Phase 5 Production + packing · Phase 6 Notifications · Phase 7 Admin ·
  Phase 8 CSV/SEO/PWA/perf · Phase 9 Security + deploy

Anything not yet built is absent, not stubbed: there are no buttons that do
nothing and no invented dashboard figures. The basket deliberately has no
checkout button yet, because checkout needs the availability engine (Phase 3)
and payments (Phase 4).

---

## Design system

`apps/storefront/src/app/globals.css` is the single source of truth. The
palette is **sampled from the logo artwork**, not invented:

| Token | Hex | Where it comes from |
|---|---|---|
| `--brand` | `#153017` | the "Mylapore" wordmark |
| `--terracotta` | `#AF451F` | the "BITES" lettering |
| `--brass` | `#B5751F` | the gopuram, the arc, the rules beside BITES |

Ground is white. Hairline borders, 8px radii, restrained colour, generous
whitespace — a clean commerce storefront.

**The freshness signal.** Green used to mean only "made fresh after you order".
Green is now the brand, so that hue can no longer carry the signal alone.
Freshness is signalled by three things together: a leaf dot, the words *Made to
order*, and a green **tint**. Solid brand green is reserved for controls. Fill a
decorative element with solid green and the difference between "this is a
button" and "this is fresh" disappears — and freshness is the whole proposition.
Limited stock keeps brass; seasonal keeps terracotta.

**The motif is a kolam**, the dot grid chalked at Mylapore doorsteps, drawn in
CSS behind the hero in the faintest brass.

**Type echoes the logo**: Playfair Display for headings, matching the
high-contrast serif wordmark; Instrument Sans for UI and the letterspaced
labels, matching the lockup text. Fonts are linked at runtime rather than
fetched by `next/font` at build time, so a production build never depends on
Google's CDN. Phase 8 should self-host them as woff2.

**The header wordmark is set in type, not served as an image** — crisp at every
density, a few hundred bytes instead of 42KB per page, and built the way the
artwork is. The artwork itself appears at size in the hero and the footer. Logo
assets live in `apps/storefront/public/` (`logo-full.png`, `logo-lockup.png`,
`icons/`), generated from the supplied master.

**Contrast is checked, not assumed.** Every text/ground pair in the palette
clears WCAG AA (4.5:1); `--ink-3` was darkened from `#8C877F` to `#726D64`
after measuring it at 3.57:1.
