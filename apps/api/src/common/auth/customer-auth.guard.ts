import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { ErrorCode } from "@mb/contracts";
import { DomainError } from "../errors/domain.error.js";
import type { Env } from "../../config/env.schema.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";

export interface CustomerPrincipal {
  id: string;
  customerRef: string;
  phoneE164: string;
  marketId: string;
}

export interface AccessTokenClaims {
  sub: string;
  ref: string;
  phone: string;
  mkt: string;
  typ: "customer";
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (isPublic) return true;
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Please sign in to continue.");
    }

    try {
      const claims = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        publicKey: this.config.get("JWT_PUBLIC_KEY", { infer: true }),
        algorithms: ["RS256"],
      });
      if (claims.typ !== "customer") throw new Error("wrong audience");
      req.customer = {
        id: claims.sub,
        customerRef: claims.ref,
        phoneE164: claims.phone,
        marketId: claims.mkt,
      };
      return true;
    } catch {
      if (isPublic) return true; // expired token on a public route is not fatal
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Your session has expired. Please sign in again.");
    }
  }
}
