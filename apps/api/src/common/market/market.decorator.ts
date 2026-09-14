import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { ErrorCode } from "@mb/contracts";
import { DomainError } from "../errors/domain.error.js";
import type { ResolvedMarket } from "./market.service.js";

/** @CurrentMarket() — throws rather than silently defaulting to India. */
export const CurrentMarket = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedMarket => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.market) {
      throw new DomainError(
        ErrorCode.MARKET_NOT_RESOLVED,
        "We couldn't work out which store you're shopping in.",
        { status: 400 },
      );
    }
    return req.market;
  },
);

export const OptionalMarket = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedMarket | undefined =>
    ctx.switchToHttp().getRequest<Request>().market,
);
