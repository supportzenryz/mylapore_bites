import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../../common/auth/public.decorator.js";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { RedisService } from "../../common/redis/redis.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness: is the process up? Never touches dependencies. */
  @Public()
  @Get()
  live(): { status: string; version: string; uptime: number } {
    return {
      status: "ok",
      version: process.env.APP_VERSION ?? "0.0.0",
      uptime: Math.round(process.uptime()),
    };
  }

  /** Readiness: should this container receive traffic? */
  @Public()
  @Get("ready")
  async ready(): Promise<{ status: string; checks: Record<string, boolean> }> {
    const [database, redis] = await Promise.all([this.prisma.ping(), this.redis.ping()]);
    const checks = { database, redis };
    if (!database || !redis) {
      throw new ServiceUnavailableException({
        code: "NOT_READY",
        message: "Service is not ready",
        details: checks,
      });
    }
    return { status: "ready", checks };
  }
}
