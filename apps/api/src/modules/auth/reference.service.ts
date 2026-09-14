import { Injectable } from "@nestjs/common";
import { Prisma } from "@mb/database";
import { PrismaService } from "../../common/prisma/prisma.service.js";

/**
 * Human-readable references (MBC-000123, batch codes). Allocated with the same
 * atomic upsert as order numbers so concurrent signups cannot collide.
 */
@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(key: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<{ value: number }[]>`
      INSERT INTO counters ("key","value","updatedAt")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET "value" = counters."value" + 1, "updatedAt" = now()
      RETURNING "value"::int`;
    const row = rows[0];
    if (!row) throw new Error(`Counter ${key} could not be allocated`);
    return row.value;
  }

  async nextCustomerRef(tx?: Prisma.TransactionClient): Promise<string> {
    const n = await this.next("customer_ref", tx);
    return `MBC-${String(n).padStart(6, "0")}`;
  }

  async nextBatchCode(isoDate: string, tx?: Prisma.TransactionClient): Promise<string> {
    const n = await this.next(`batch:${isoDate}`, tx);
    return `B-${isoDate.replace(/-/g, "")}-${String(n).padStart(3, "0")}`;
  }

  /** MB-IND-20260914-000123 — per market, per business date. */
  async nextOrderSequence(
    marketCode: string,
    businessDate: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<{ lastSeq: number }[]>`
      INSERT INTO order_counters ("marketCode","businessDate","lastSeq","updatedAt")
      VALUES (${marketCode}, ${businessDate}::date, 1, now())
      ON CONFLICT ("marketCode","businessDate")
      DO UPDATE SET "lastSeq" = order_counters."lastSeq" + 1, "updatedAt" = now()
      RETURNING "lastSeq"::int`;
    const row = rows[0];
    if (!row) throw new Error("Order sequence could not be allocated");
    return row.lastSeq;
  }
}
