import { Injectable, Logger } from "@nestjs/common";
import { ErrorCode } from "@mb/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { DomainError } from "../errors/domain.error.js";

export interface ResolvedMarket {
  id: string;
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  phoneCountryCode: string;
  orderHorizonDays: number;
  pricesIncludeTax: boolean;
  defaultWarehouseId: string | null;
}

const CACHE_PREFIX = "market:host:";
const CACHE_TTL = 300;

/**
 * Host → market. This is the single mechanism that makes .com and .co.uk one
 * platform: everything downstream reads the resolved market, and no code path
 * branches on "is this the UK site".
 */
@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async resolveByHostname(hostname: string): Promise<ResolvedMarket | null> {
    const host = normaliseHost(hostname);
    if (!host) return null;

    const cached = await this.redis.getJson<ResolvedMarket>(CACHE_PREFIX + host);
    if (cached) return cached;

    const domain = await this.prisma.marketDomain.findUnique({
      where: { hostname: host },
      include: { market: true },
    });

    // `www.` is an alias of the apex unless explicitly registered.
    const fallback = !domain && host.startsWith("www.")
      ? await this.prisma.marketDomain.findUnique({
          where: { hostname: host.slice(4) },
          include: { market: true },
        })
      : null;

    const row = domain ?? fallback;
    if (!row || !row.market.isActive || row.market.deletedAt) return null;

    const resolved = toResolved(row.market);
    await this.redis.setJson(CACHE_PREFIX + host, resolved, CACHE_TTL);
    return resolved;
  }

  async resolveByCode(code: string): Promise<ResolvedMarket | null> {
    const market = await this.prisma.market.findUnique({ where: { code: code.toUpperCase() } });
    if (!market || !market.isActive || market.deletedAt) return null;
    return toResolved(market);
  }

  /** Used by controllers that cannot function without a market. */
  require(market: ResolvedMarket | undefined): ResolvedMarket {
    if (!market) {
      throw new DomainError(
        ErrorCode.MARKET_NOT_RESOLVED,
        "We couldn't work out which store you're shopping in.",
        { status: 400 },
      );
    }
    return market;
  }

  async invalidate(hostname: string): Promise<void> {
    await this.redis.client.del(CACHE_PREFIX + normaliseHost(hostname));
  }
}

function normaliseHost(hostname: string): string {
  return (hostname ?? "").toLowerCase().trim().split(":")[0] ?? "";
}

function toResolved(m: {
  id: string; code: string; name: string; currency: string; currencySymbol: string;
  locale: string; timezone: string; phoneCountryCode: string; orderHorizonDays: number;
  pricesIncludeTax: boolean; defaultWarehouseId: string | null;
}): ResolvedMarket {
  return {
    id: m.id, code: m.code, name: m.name, currency: m.currency,
    currencySymbol: m.currencySymbol, locale: m.locale, timezone: m.timezone,
    phoneCountryCode: m.phoneCountryCode, orderHorizonDays: m.orderHorizonDays,
    pricesIncludeTax: m.pricesIncludeTax, defaultWarehouseId: m.defaultWarehouseId,
  };
}
