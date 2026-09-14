import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ErrorCode } from "@mb/contracts";

/**
 * One response shape for every failure. Stack traces never leave the server.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = req.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL;
    let message = "Something went wrong on our side. Please try again.";
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body !== null && "code" in body) {
        const shaped = body as { code: string; message: string; details?: Record<string, unknown> };
        code = shaped.code;
        message = shaped.message;
        details = shaped.details;
      } else {
        code = httpStatusToCode(status);
        message = typeof body === "string" ? body : exception.message;
      }
    }

    if (status >= 500) {
      this.logger.error(
        { err: exception, path: req.url, method: req.method, requestId },
        "Unhandled exception",
      );
    }

    res.status(status).json({ code, message, details, requestId });
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case 400: return ErrorCode.VALIDATION_FAILED;
    case 401: return ErrorCode.UNAUTHENTICATED;
    case 403: return ErrorCode.FORBIDDEN;
    case 404: return ErrorCode.NOT_FOUND;
    case 409: return ErrorCode.CONFLICT;
    case 429: return ErrorCode.RATE_LIMITED;
    default:  return ErrorCode.INTERNAL;
  }
}
