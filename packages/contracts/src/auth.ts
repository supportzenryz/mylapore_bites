import { z } from "zod";

/**
 * Phone is accepted loosely and normalised to E.164 server-side. Never trust
 * the client's formatting.
 */
export const requestOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  countryCode: z.string().regex(/^\+\d{1,4}$/).optional(),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const requestOtpResponseSchema = z.object({
  challengeId: z.string(),
  channel: z.enum(["WHATSAPP", "SMS"]),
  expiresInSeconds: z.number().int(),
  resendAfterSeconds: z.number().int(),
  /** Only populated outside production, so local dev needs no WhatsApp account. */
  devCode: z.string().optional(),
});
export type RequestOtpResponse = z.infer<typeof requestOtpResponseSchema>;

export const verifyOtpSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{4,8}$/),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  tokenType: z.literal("Bearer"),
  customer: z.object({
    id: z.string(),
    customerRef: z.string(),
    phoneE164: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    isNew: z.boolean(),
  }),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
