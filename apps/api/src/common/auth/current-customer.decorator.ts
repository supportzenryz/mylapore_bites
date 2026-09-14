import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { ErrorCode } from "@mb/contracts";
import { DomainError } from "../errors/domain.error.js";
import type { CustomerPrincipal } from "./customer-auth.guard.js";

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerPrincipal => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.customer) {
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Please sign in to continue.");
    }
    return req.customer;
  },
);

export const OptionalCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerPrincipal | undefined =>
    ctx.switchToHttp().getRequest<Request>().customer,
);
