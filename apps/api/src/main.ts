import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";
import type { Env } from "./config/env.schema.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger("Bootstrap");

  app.use(cookieParser());

  // Request id threaded through logs, audit rows and error envelopes.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = req.header("x-request-id") ?? randomUUID();
    req.id = id;
    res.setHeader("x-request-id", id);
    next();
  });

  // /v1 from day one so a future native app can pin a version.
  app.setGlobalPrefix("v1");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: false as never });

  // Strict allowlist — never a wildcard with credentials.
  app.enableCors({
    origin: [
      config.get("STOREFRONT_IN_ORIGIN", { infer: true }),
      config.get("STOREFRONT_UK_ORIGIN", { infer: true }),
      config.get("ADMIN_ORIGIN", { infer: true }),
    ].filter(Boolean),
    credentials: true,
    allowedHeaders: [
      "Content-Type", "Authorization", "Idempotency-Key",
      "X-Market-Host", "X-Market-Code", "X-Request-Id",
    ],
  });

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");
  logger.log(`Mylapore Bites API listening on :${port} (${config.get("NODE_ENV", { infer: true })})`);
}

void bootstrap();
