import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { RedisService } from "../../common/redis/redis.service.js";
import { splitTax, toMinorUnits, fromMinorUnits } from "../../common/utils/money.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

export interface PricedLine {
  variantId: string;
  qty: number;
  unitPrice: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  taxRate: number;
  currency: string;
}

/**
 * The single source of truth for what anything costs.
 *
 * The server never reads a price, tax rate or total from the client. A cart
 * sends variant ids and quantities; everything monetary is computed here.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Effective tax percentage for a product's tax class in a market, today. */
  async taxRateFor(marketId: string, taxClassId: string | null): Promise<number> {
    if (!taxClassId) return 0;

    const cacheKey = `tax:${marketId}:${taxClassId}`;
    const cached = await this.redis.getJson<{ rate: number }>(cacheKey);
    if (cached) return cached.rate;

    const today = new Date();
    const row = await this.prisma.taxRate.findFirst({
      where: {
        marketId,
        taxClassId,
        validFrom: { lte: today },
        OR: [{ validTo: null }, { validTo: { gte: today } }],
      },
      orderBy: { validFrom: "desc" },
    });

    const rate = row ? Number(row.rate) : 0;
    await this.redis.setJson(cacheKey, { rate }, 600);
    return rate;
  }

  /**
   * Prices a set of lines server-side. India shows tax-inclusive prices so tax
   * is EXTRACTED; UK trade prices are exclusive so tax is ADDED.
   */
  async priceLines(
    market: ResolvedMarket,
    lines: { variantId: string; qty: number }[],
  ): Promise<PricedLine[]> {
    if (lines.length === 0) return [];

    const variantIds = lines.map((l) => l.variantId);
    const priced = await this.prisma.marketProductVariant.findMany({
      where: {
        variantId: { in: variantIds },
        isActive: true,
        marketProduct: { marketId: market.id, isActive: true },
      },
      include: {
        marketProduct: { include: { product: { select: { taxClassId: true } } } },
      },
    });

    const byVariant = new Map(priced.map((p) => [p.variantId, p]));
    const out: PricedLine[] = [];

    for (const line of lines) {
      const row = byVariant.get(line.variantId);
      if (!row) continue;

      const taxRate = await this.taxRateFor(market.id, row.marketProduct.product.taxClassId);
      const unitMinor = toMinorUnits(row.price.toString());
      const lineMinor = unitMinor * line.qty;
      const { netMinor, taxMinor, grossMinor } = splitTax(
        lineMinor, taxRate, market.pricesIncludeTax,
      );

      out.push({
        variantId: line.variantId,
        qty: line.qty,
        unitPrice: fromMinorUnits(unitMinor),
        lineSubtotal: fromMinorUnits(netMinor),
        lineTax: fromMinorUnits(taxMinor),
        lineTotal: fromMinorUnits(grossMinor),
        taxRate,
        currency: market.currency,
      });
    }

    return out;
  }
}
