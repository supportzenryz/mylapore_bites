import { Injectable, Logger } from "@nestjs/common";
import type { AuthTokens } from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";
import { OtpService } from "./otp.service.js";
import { TokenService } from "./token.service.js";
import { ReferenceService } from "./reference.service.js";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly refs: ReferenceService,
  ) {}

  /**
   * Verifying an OTP both authenticates an existing customer and creates a new
   * one. There is no separate "register" step — the phone is the identity.
   */
  async verifyAndSignIn(
    challengeId: string,
    code: string,
    market: ResolvedMarket,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    const { phoneE164 } = await this.otp.verify(challengeId, code);

    const { customer, isNew } = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { phoneE164 } });
      if (existing) {
        if (!existing.phoneVerified) {
          await tx.customer.update({
            where: { id: existing.id },
            data: { phoneVerified: true },
          });
        }
        return { customer: existing, isNew: false };
      }

      const customerRef = await this.refs.nextCustomerRef(tx);
      const created = await tx.customer.create({
        data: {
          customerRef,
          marketId: market.id,
          phoneE164,
          phoneVerified: true,
        },
      });
      return { customer: created, isNew: true };
    });

    const issued = await this.tokens.issue(
      {
        id: customer.id,
        customerRef: customer.customerRef,
        phoneE164: customer.phoneE164,
        marketId: customer.marketId,
      },
      ctx,
    );

    return {
      refreshToken: issued.refreshToken,
      tokens: {
        accessToken: issued.accessToken,
        expiresIn: issued.expiresIn,
        tokenType: "Bearer",
        customer: {
          id: customer.id,
          customerRef: customer.customerRef,
          phoneE164: customer.phoneE164,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          isNew,
        },
      },
    };
  }

  async refresh(
    refreshToken: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    const rotated = await this.tokens.rotate(refreshToken, ctx);
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: rotated.customer.id },
    });

    return {
      refreshToken: rotated.refreshToken,
      tokens: {
        accessToken: rotated.accessToken,
        expiresIn: rotated.expiresIn,
        tokenType: "Bearer",
        customer: {
          id: customer.id,
          customerRef: customer.customerRef,
          phoneE164: customer.phoneE164,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          isNew: false,
        },
      },
    };
  }
}
