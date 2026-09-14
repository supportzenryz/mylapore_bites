-- Sandbox verification fixture: the subset of the schema the concurrency
-- proof needs. NOT a migration — prisma/schema.prisma is the source of truth.
DROP TABLE IF EXISTS capacity_reservations, production_capacity, order_counters CASCADE;
DROP TYPE IF EXISTS "CapacityStatus", "ReservationStatus" CASCADE;

CREATE TYPE "CapacityStatus"    AS ENUM ('OPEN','LOCKED','CLOSED');
CREATE TYPE "ReservationStatus" AS ENUM ('HELD','CONFIRMED','CONSUMED','RELEASED');

CREATE TABLE production_capacity (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "warehouseId"    uuid NOT NULL,
  "variantId"      uuid NOT NULL,
  "productionDate" date NOT NULL,
  "capacityUnits"  integer NOT NULL,
  "reservedUnits"  integer NOT NULL DEFAULT 0,
  "producedUnits"  integer NOT NULL DEFAULT 0,
  status           "CapacityStatus" NOT NULL DEFAULT 'OPEN',
  CONSTRAINT capacity_never_oversold CHECK ("reservedUnits" <= "capacityUnits"),
  CONSTRAINT capacity_non_negative   CHECK ("reservedUnits" >= 0)
);
CREATE UNIQUE INDEX production_capacity_key
  ON production_capacity ("warehouseId","variantId","productionDate");

CREATE TABLE capacity_reservations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "capacityId" uuid NOT NULL REFERENCES production_capacity(id) ON DELETE CASCADE,
  "variantId"  uuid NOT NULL,
  "orderId"    uuid,
  qty          integer NOT NULL CHECK (qty > 0),
  status       "ReservationStatus" NOT NULL DEFAULT 'HELD',
  "expiresAt"  timestamptz,
  "releasedAt" timestamptz,
  "createdAt"  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_counters (
  "marketCode"   text NOT NULL,
  "businessDate" date NOT NULL,
  "lastSeq"      integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("marketCode","businessDate")
);
