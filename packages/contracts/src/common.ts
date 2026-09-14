import { z } from "zod";

/**
 * Machine-readable domain error codes. The storefront switches on `code`;
 * `message` is always safe to show a customer.
 */
export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",
  INTERNAL: "INTERNAL",

  // Auth
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  OTP_MAX_ATTEMPTS: "OTP_MAX_ATTEMPTS",
  OTP_RESEND_TOO_SOON: "OTP_RESEND_TOO_SOON",
  OTP_DELIVERY_FAILED: "OTP_DELIVERY_FAILED",
  REFRESH_TOKEN_REUSED: "REFRESH_TOKEN_REUSED",

  // The pre-order domain — these carry recovery hints.
  CAPACITY_EXHAUSTED: "CAPACITY_EXHAUSTED",
  CUTOFF_PASSED: "CUTOFF_PASSED",
  DATE_NOT_AVAILABLE: "DATE_NOT_AVAILABLE",
  ADDRESS_NOT_SERVICEABLE: "ADDRESS_NOT_SERVICEABLE",
  SLOT_FULL: "SLOT_FULL",
  MIN_ORDER_NOT_MET: "MIN_ORDER_NOT_MET",
  QTY_OUT_OF_RANGE: "QTY_OUT_OF_RANGE",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",
  MARKET_NOT_RESOLVED: "MARKET_NOT_RESOLVED",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  requestId: z.string().optional(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Cursor pagination. Offsets break under concurrent writes. */
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const moneySchema = z.object({
  amount: z.string(),
  currency: z.string().length(3),
  formatted: z.string(),
});
export type Money = z.infer<typeof moneySchema>;

/** ISO weekday, 1 = Monday .. 7 = Sunday. Matches Luxon and ISO-8601. */
export const isoWeekdaySchema = z.number().int().min(1).max(7);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
