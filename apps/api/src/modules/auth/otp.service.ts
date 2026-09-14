import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { randomInt } from "node:crypto";
import { ErrorCode, type RequestOtpResponse } from "@mb/contracts";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { RedisService } from "../../common/redis/redis.service.js";
import { DomainError, CustomerMessage } from "../../common/errors/domain.error.js";
import { normalisePhone, maskPhone } from "../../common/utils/phone.js";
import { NotificationService } from "../notifications/notification.service.js";
import type { Env } from "../../config/env.schema.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";

export interface RequestOtpContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<Env, true>,
    private readonly notifications: NotificationService,
  ) {}

  async request(
    rawPhone: string,
    market: ResolvedMarket,
    ctx: RequestOtpContext,
    countryCode?: string,
  ): Promise<RequestOtpResponse> {
    const phone = normalisePhone(rawPhone, countryCode ?? market.phoneCountryCode);

    await this.enforceRateLimits(phone, ctx.ip);

    const length = this.config.get("OTP_LENGTH", { infer: true });
    const ttl = this.config.get("OTP_TTL_SECONDS", { infer: true });
    const maxAttempts = this.config.get("OTP_MAX_ATTEMPTS", { infer: true });

    // Cryptographically random, never Math.random.
    const code = generateNumericCode(length);

    const customer = await this.prisma.customer.findUnique({
      where: { phoneE164: phone },
      select: { id: true, isBlocked: true },
    });

    if (customer?.isBlocked) {
      // Don't reveal that the account exists or is blocked.
      throw new DomainError(ErrorCode.RATE_LIMITED, "We can't send a code to that number right now.");
    }

    const challenge = await this.prisma.otpChallenge.create({
      data: {
        customerId: customer?.id ?? null,
        phoneE164: phone,
        purpose: "LOGIN",
        codeHash: await argonHash(code),
        channel: "WHATSAPP",
        maxAttempts,
        expiresAt: new Date(Date.now() + ttl * 1000),
        requestIp: ctx.ip ?? null,
        userAgent: ctx.userAgent?.slice(0, 400) ?? null,
      },
      select: { id: true },
    });

    const channel = await this.deliver(phone, code, challenge.id, String(Math.floor(ttl / 60)));

    return {
      challengeId: challenge.id,
      channel,
      expiresInSeconds: ttl,
      resendAfterSeconds: this.config.get("OTP_RESEND_COOLDOWN_SECONDS", { infer: true }),
      // Local development must not require a live Meta account.
      devCode: this.config.get("NODE_ENV", { infer: true }) === "production" ? undefined : code,
    };
  }

  /**
   * WhatsApp first; SMS if WhatsApp cannot deliver. Without this fallback a
   * customer with no WhatsApp simply cannot sign in, and we'd see it only as
   * unexplained drop-off.
   */
  private async deliver(
    phone: string,
    code: string,
    challengeId: string,
    expiryMinutes: string,
  ): Promise<"WHATSAPP" | "SMS"> {
    const templateName = this.config.get("WHATSAPP_TEMPLATE_OTP", { infer: true });

    const whatsapp = await this.notifications.sendNow(
      "WHATSAPP", phone, templateName, [code, expiryMinutes], [code],
    );
    if (whatsapp.success) return "WHATSAPP";

    this.logger.warn(
      `WhatsApp OTP to ${maskPhone(phone)} failed (${whatsapp.error}); falling back to SMS`,
    );

    const sms = await this.notifications.sendNow("SMS", phone, "otp", [code]);
    if (sms.success) {
      await this.prisma.otpChallenge.update({
        where: { id: challengeId },
        data: { channel: "SMS", fallbackUsed: true },
      });
      return "SMS";
    }

    if (this.config.get("NODE_ENV", { infer: true }) !== "production") {
      this.logger.warn(`No OTP channel configured — dev code for ${maskPhone(phone)} is ${code}`);
      return "SMS";
    }

    throw new DomainError(
      ErrorCode.OTP_DELIVERY_FAILED,
      "We couldn't send your code. Please check the number and try again.",
    );
  }

  /**
   * Verification burns the challenge on success and destroys it after too many
   * wrong attempts, so a code can never be brute-forced or replayed.
   */
  async verify(challengeId: string, code: string): Promise<{ phoneE164: string }> {
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });

    if (!challenge || challenge.consumedAt) {
      throw new DomainError(ErrorCode.OTP_INVALID, CustomerMessage.otpInvalid);
    }
    if (challenge.expiresAt < new Date()) {
      throw new DomainError(ErrorCode.OTP_EXPIRED, CustomerMessage.otpExpired);
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.delete({ where: { id: challengeId } }).catch(() => undefined);
      throw new DomainError(ErrorCode.OTP_MAX_ATTEMPTS, CustomerMessage.otpMaxAttempts);
    }

    const ok = await argonVerify(challenge.codeHash, code).catch(() => false);

    if (!ok) {
      const updated = await this.prisma.otpChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });
      if (updated.attempts >= updated.maxAttempts) {
        await this.prisma.otpChallenge.delete({ where: { id: challengeId } }).catch(() => undefined);
        throw new DomainError(ErrorCode.OTP_MAX_ATTEMPTS, CustomerMessage.otpMaxAttempts);
      }
      throw new DomainError(ErrorCode.OTP_INVALID, CustomerMessage.otpInvalid, {
        details: { attemptsRemaining: updated.maxAttempts - updated.attempts },
      });
    }

    await this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });

    return { phoneE164: challenge.phoneE164 };
  }

  private async enforceRateLimits(phone: string, ip?: string): Promise<void> {
    const cooldown = this.config.get("OTP_RESEND_COOLDOWN_SECONDS", { infer: true });
    const cooldownKey = `otp:cooldown:${phone}`;

    const onCooldown = await this.redis.client.set(cooldownKey, "1", "EX", cooldown, "NX");
    if (onCooldown === null) {
      const ttl = await this.redis.client.ttl(cooldownKey);
      throw new DomainError(
        ErrorCode.OTP_RESEND_TOO_SOON,
        `Please wait ${Math.max(ttl, 1)} seconds before requesting another code.`,
        { details: { retryAfterSeconds: Math.max(ttl, 1) } },
      );
    }

    const perPhone = await this.redis.incrementWindow(`otp:phone:${phone}`, 3600);
    if (perPhone > this.config.get("OTP_MAX_PER_PHONE_PER_HOUR", { infer: true })) {
      throw new DomainError(
        ErrorCode.RATE_LIMITED,
        "Too many code requests for this number. Please try again later.",
      );
    }

    if (ip) {
      const perIp = await this.redis.incrementWindow(`otp:ip:${ip}`, 3600);
      if (perIp > this.config.get("OTP_MAX_PER_IP_PER_HOUR", { infer: true })) {
        throw new DomainError(ErrorCode.RATE_LIMITED, "Too many requests. Please try again later.");
      }
    }
  }
}

/** Uniform across the full range — no modulo bias. */
export function generateNumericCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String(randomInt(0, 10));
  return out;
}
