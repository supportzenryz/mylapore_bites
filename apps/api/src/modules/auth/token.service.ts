import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ErrorCode } from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { DomainError } from "../../common/errors/domain.error.js";
import type { Env } from "../../config/env.schema.js";
import type { AccessTokenClaims } from "../../common/auth/customer-auth.guard.js";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Opaque refresh tokens are stored hashed; a database leak yields nothing usable. */
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issue(
    customer: { id: string; customerRef: string; phoneE164: string; marketId: string },
    context: { ip?: string; userAgent?: string; familyId?: string },
  ): Promise<IssuedTokens> {
    const claims: AccessTokenClaims = {
      sub: customer.id,
      ref: customer.customerRef,
      phone: customer.phoneE164,
      mkt: customer.marketId,
      typ: "customer",
    };

    const accessToken = await this.jwt.signAsync(claims, {
      privateKey: this.config.get("JWT_PRIVATE_KEY", { infer: true }),
      algorithm: "RS256",
      expiresIn: this.config.get("JWT_ACCESS_TTL", { infer: true }),
    });

    const refreshToken = randomBytes(48).toString("base64url");
    const days = this.config.get("JWT_REFRESH_TTL_DAYS", { infer: true });

    await this.prisma.authSession.create({
      data: {
        customerId: customer.id,
        refreshTokenHash: hashToken(refreshToken),
        familyId: context.familyId ?? randomUUID(),
        expiresAt: new Date(Date.now() + days * 86_400_000),
        ip: context.ip ?? null,
        userAgent: context.userAgent?.slice(0, 400) ?? null,
      },
    });

    return { accessToken, refreshToken, expiresIn: ttlToSeconds(this.config.get("JWT_ACCESS_TTL", { infer: true })) };
  }

  /**
   * Rotation with reuse detection: presenting a token that has already been
   * rotated means it was captured, so the whole family is revoked.
   */
  async rotate(
    refreshToken: string,
    context: { ip?: string; userAgent?: string },
  ): Promise<IssuedTokens & { customer: { id: string; customerRef: string; phoneE164: string; marketId: string } }> {
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
      include: { customer: true },
    });

    if (!session) {
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Please sign in again.");
    }

    if (session.rotatedAt || session.revokedAt) {
      await this.prisma.authSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: "refresh_token_reuse_detected" },
      });
      throw new DomainError(
        ErrorCode.REFRESH_TOKEN_REUSED,
        "For your security we've signed you out. Please sign in again.",
      );
    }

    if (session.expiresAt < new Date()) {
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Your session has expired. Please sign in again.");
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { rotatedAt: new Date() },
    });

    const customer = {
      id: session.customer.id,
      customerRef: session.customer.customerRef,
      phoneE164: session.customer.phoneE164,
      marketId: session.customer.marketId,
    };

    const issued = await this.issue(customer, { ...context, familyId: session.familyId });
    return { ...issued, customer };
  }

  async revoke(refreshToken: string, reason = "logout"): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllForCustomer(customerId: string, reason: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
}

export function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit!] ?? 60);
}
