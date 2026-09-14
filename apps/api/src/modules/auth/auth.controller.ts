import { Body, Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import {
  requestOtpSchema, verifyOtpSchema, type AuthTokens, type RequestOtpResponse, ErrorCode,
} from "@mb/contracts";
import { zodPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Public } from "../../common/auth/public.decorator.js";
import { CurrentMarket } from "../../common/market/market.decorator.js";
import { DomainError } from "../../common/errors/domain.error.js";
import type { ResolvedMarket } from "../../common/market/market.service.js";
import { AuthService } from "./auth.service.js";
import { OtpService } from "./otp.service.js";
import { TokenService } from "./token.service.js";

const REFRESH_COOKIE = "mb_rt";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post("otp/request")
  @HttpCode(200)
  async requestOtp(
    @Body(zodPipe(requestOtpSchema)) body: { phone: string; countryCode?: string },
    @CurrentMarket() market: ResolvedMarket,
    @Req() req: Request,
  ): Promise<RequestOtpResponse> {
    return this.otp.request(body.phone, market, {
      ip: req.ip,
      userAgent: req.header("user-agent"),
    }, body.countryCode);
  }

  @Public()
  @Post("otp/verify")
  @HttpCode(200)
  async verifyOtp(
    @Body(zodPipe(verifyOtpSchema)) body: { challengeId: string; code: string },
    @CurrentMarket() market: ResolvedMarket,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const { tokens, refreshToken } = await this.auth.verifyAndSignIn(
      body.challengeId, body.code, market,
      { ip: req.ip, userAgent: req.header("user-agent") },
    );
    setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const token = readRefreshCookie(req);
    if (!token) throw new DomainError(ErrorCode.UNAUTHENTICATED, "Please sign in again.");

    const { tokens, refreshToken } = await this.auth.refresh(token, {
      ip: req.ip,
      userAgent: req.header("user-agent"),
    });
    setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readRefreshCookie(req);
    if (token) await this.tokens.revoke(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
  }
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30) * 86_400_000,
  });
}

function readRefreshCookie(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[REFRESH_COOKIE] ?? null;
}
