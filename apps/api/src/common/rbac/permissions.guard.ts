import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ErrorCode } from "@mb/contracts";
import { DomainError } from "../errors/domain.error.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { PERMISSION_KEY } from "./require-permission.decorator.js";

export interface AdminPrincipal {
  id: string;
  email: string;
  permissions: Set<string>;
  isSuperAdmin: boolean;
}

const CACHE_PREFIX = "rbac:perms:";
const CACHE_TTL = 120;

/**
 * One guard for every admin endpoint. Permissions come from the database so
 * roles can be re-scoped in Admin without a deploy.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const admin = req.admin;
    if (!admin) {
      throw new DomainError(ErrorCode.UNAUTHENTICATED, "Please sign in to continue.");
    }
    if (admin.isSuperAdmin) return true;

    const missing = required.filter((p) => !admin.permissions.has(p));
    if (missing.length > 0) {
      throw new DomainError(ErrorCode.FORBIDDEN, "You don't have access to do that.", {
        details: { required: missing },
      });
    }
    return true;
  }

  /** Called by the admin auth guard once per request, cached briefly. */
  async loadPermissions(adminUserId: string): Promise<{ permissions: Set<string>; isSuperAdmin: boolean }> {
    const cached = await this.redis.getJson<{ permissions: string[]; isSuperAdmin: boolean }>(
      CACHE_PREFIX + adminUserId,
    );
    if (cached) {
      return { permissions: new Set(cached.permissions), isSuperAdmin: cached.isSuperAdmin };
    }

    const rows = await this.prisma.adminUserRole.findMany({
      where: { adminUserId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const isSuperAdmin = rows.some((r) => r.role.code === "SUPER_ADMIN");
    const permissions = new Set<string>();
    for (const r of rows) {
      for (const rp of r.role.permissions) permissions.add(rp.permission.code);
    }

    await this.redis.setJson(
      CACHE_PREFIX + adminUserId,
      { permissions: [...permissions], isSuperAdmin },
      CACHE_TTL,
    );
    return { permissions, isSuperAdmin };
  }

  async invalidate(adminUserId: string): Promise<void> {
    await this.redis.client.del(CACHE_PREFIX + adminUserId);
  }
}
