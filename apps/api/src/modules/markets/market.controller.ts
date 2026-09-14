import { Controller, Get } from "@nestjs/common";
import type { MarketView } from "@mb/contracts";
import { Public } from "../../common/auth/public.decorator.js";
import { CurrentMarket } from "../../common/market/market.decorator.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

@Controller("markets")
export class MarketController {
  /**
   * The storefront bootstraps from this: currency, timezone, how far ahead it
   * may offer delivery. None of it is hard-coded in the frontend.
   */
  @Public()
  @Get("current")
  current(@CurrentMarket() market: ResolvedMarket): MarketView {
    return {
      code: market.code,
      name: market.name,
      currency: market.currency,
      currencySymbol: market.currencySymbol,
      locale: market.locale,
      timezone: market.timezone,
      phoneCountryCode: market.phoneCountryCode,
      orderHorizonDays: market.orderHorizonDays,
      pricesIncludeTax: market.pricesIncludeTax,
    };
  }
}
