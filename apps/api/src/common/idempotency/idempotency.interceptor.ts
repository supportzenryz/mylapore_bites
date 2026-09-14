import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { createHash } from "node:crypto";
import { Observable, from, of, switchMap, tap } from "rxjs";
import { ErrorCode } from "@mb/contracts";
import { DomainError } from "../errors/domain.error.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { IDEMPOTENT_KEY } from "./idempotent.decorator.js";

const TTL_HOURS = 24;

/**
 * Makes a marked endpoint safe to retry. A double-tapped "Place order" button
 * returns the FIRST order, it does not create a second one.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const enabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!enabled) return next.handle();

    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.header("idempotency-key");
    const customerId = req.customer?.id;

    if (!key) {
      throw new DomainError(ErrorCode.VALIDATION_FAILED, "This request needs an Idempotency-Key header.");
    }
    if (!customerId) {
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Please sign in to continue.");
    }

    const requestHash = createHash("sha256")
      .update(JSON.stringify(req.body ?? {}))
      .digest("hex");

    return from(this.claim(customerId, key, req.path, requestHash)).pipe(
      switchMap((existing) => {
        if (existing) return of(existing);
        return next.handle().pipe(
          tap((result) => {
            void this.prisma.idempotencyKey
              .updateMany({
                where: { customerId, key },
                data: { statusCode: 200, responseBody: result as never },
              })
              .catch(() => undefined);
          }),
        );
      }),
    );
  }

  private async claim(
    customerId: string,
    key: string,
    endpoint: string,
    requestHash: string,
  ): Promise<unknown | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { customerId_key: { customerId, key } },
    });

    if (existing) {
      // Same key, different payload is a client bug, not a retry.
      if (existing.requestHash !== requestHash) {
        throw new DomainError(
          ErrorCode.CONFLICT,
          "This request was already used for a different order.",
        );
      }
      if (existing.responseBody !== null) return existing.responseBody;
      throw new DomainError(
        ErrorCode.CONFLICT,
        "We're still processing your previous request. Please wait a moment.",
      );
    }

    await this.prisma.idempotencyKey.create({
      data: {
        customerId, key, endpoint, requestHash,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + TTL_HOURS * 3600_000),
      },
    });
    return null;
  }
}
