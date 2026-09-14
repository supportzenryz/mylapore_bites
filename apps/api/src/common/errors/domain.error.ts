import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode, type ErrorCodeValue } from "@mb/contracts";

export interface DomainErrorOptions {
  /** Machine-readable recovery hints, e.g. { nextAvailableDate: "2026-09-21" }. */
  details?: Record<string, unknown>;
  status?: HttpStatus;
}

/**
 * The only error type controllers should throw. `message` is always safe to
 * put in front of a customer; internals go to the log, never the response.
 */
export class DomainError extends HttpException {
  readonly code: ErrorCodeValue;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCodeValue, message: string, options: DomainErrorOptions = {}) {
    const status = options.status ?? DomainError.defaultStatus(code);
    super({ code, message, details: options.details }, status);
    this.code = code;
    this.details = options.details;
  }

  private static defaultStatus(code: ErrorCodeValue): HttpStatus {
    switch (code) {
      case ErrorCode.UNAUTHENTICATED:
      case ErrorCode.REFRESH_TOKEN_REUSED:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCode.FORBIDDEN:
        return HttpStatus.FORBIDDEN;
      case ErrorCode.NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case ErrorCode.RATE_LIMITED:
      case ErrorCode.OTP_RESEND_TOO_SOON:
      case ErrorCode.OTP_MAX_ATTEMPTS:
        return HttpStatus.TOO_MANY_REQUESTS;
      case ErrorCode.CONFLICT:
      case ErrorCode.CAPACITY_EXHAUSTED:
      case ErrorCode.SLOT_FULL:
        return HttpStatus.CONFLICT;
      case ErrorCode.INTERNAL:
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }
}

/** Customer-facing copy lives here, not scattered through services. */
export const CustomerMessage = {
  capacityExhausted: (date: string) =>
    `We've reached our kitchen's capacity for ${date}. Please choose another delivery date.`,
  cutoffPassed: (cutoff: string) =>
    `Orders for this delivery date closed at ${cutoff}. Please choose a later date.`,
  slotFull: "Sorry, this delivery slot is now full. Please pick another time.",
  notServiceable:
    "That address is outside our current delivery area. We're expanding — please try another address.",
  productUnavailable: "This product is no longer available for the date you selected.",
  otpInvalid: "That code doesn't match. Please check and try again.",
  otpExpired: "That code has expired. Request a new one.",
  otpMaxAttempts: "Too many incorrect attempts. Please request a new code.",
  paymentFailed: "Your payment could not be completed. Your cart has been saved.",
} as const;
