import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from "@nestjs/common";
import type { Request } from "express";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../prisma/prisma.service.js";

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Every mutating admin request is recorded with actor, entity and IP.
 * Registered once globally — no service writes audit rows by hand.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();

    if (!MUTATING.has(req.method) || !req.path.includes("/admin/")) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        const admin = req.admin;
        void this.prisma.auditLog
          .create({
            data: {
              adminUserId: admin?.id ?? null,
              actorType: admin ? "admin" : "system",
              entity: entityFromPath(req.path),
              entityId: extractId(req.params) ?? extractId(result),
              action: `${req.method} ${req.route?.path ?? req.path}`,
              after: sanitise(req.body),
              ip: req.ip ?? null,
              userAgent: req.header("user-agent") ?? null,
              requestId: req.id ?? null,
            },
          })
          .catch((err: unknown) => this.logger.error({ err }, "Failed to write audit log"));
      }),
    );
  }
}

function entityFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const idx = parts.indexOf("admin");
  return parts[idx + 1] ?? "unknown";
}

function extractId(source: unknown): string | null {
  if (source && typeof source === "object" && "id" in source) {
    const id = (source as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

const REDACT = new Set(["password", "passwordHash", "code", "token", "secret", "mfaSecret", "otp"]);

/** Audit trails must never become a secret store. */
function sanitise(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    out[k] = REDACT.has(k) ? "[redacted]" : v;
  }
  return out;
}
