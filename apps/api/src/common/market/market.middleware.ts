import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { MarketService, type ResolvedMarket } from "./market.service.js";

/**
 * Resolution order:
 *   1. X-Market-Host  — set by the storefront's server-side fetch, which knows
 *      the real public hostname the customer used.
 *   2. Host           — direct browser calls.
 *   3. X-Market-Code  — development and tests only; never trusted in production.
 *
 * Note what is NOT here: a client-supplied market id used for pricing. The
 * market is always resolved server-side from a registered domain.
 */
@Injectable()
export class MarketMiddleware implements NestMiddleware {
  constructor(private readonly markets: MarketService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const forwarded = req.header("x-market-host");
    const host = forwarded ?? req.header("host") ?? "";

    let market = await this.markets.resolveByHostname(host);

    if (!market && process.env.NODE_ENV !== "production") {
      const code = req.header("x-market-code");
      if (code) market = await this.markets.resolveByCode(code);
    }

    if (market) req.market = market;
    next();
  }
}
