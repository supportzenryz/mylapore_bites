import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { CapacityService } from "./modules/capacity/capacity.service.js";
import { NotificationService } from "./modules/notifications/notification.service.js";

/**
 * Second entry point of the SAME codebase and the same Docker image, run with
 * a different command. Jobs need the same services as HTTP requests — the
 * capacity engine, the notification outbox — so duplicating them into a
 * separate project would mean maintaining two copies of the domain.
 *
 * Phase 6 moves these loops onto BullMQ queues; the handlers stay identical.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger("Worker");

  const capacity = app.get(CapacityService);
  const notifications = app.get(NotificationService);

  let running = true;
  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`${signal} received — finishing current tick`);
    running = false;
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  logger.log("Worker started");

  const tick = async (): Promise<void> => {
    try {
      // Capacity held by abandoned checkouts must go back on sale.
      await capacity.releaseExpiredHolds();
      const { sent, failed } = await notifications.processDue();
      if (sent || failed) logger.log(`Notifications: ${sent} sent, ${failed} failed`);
    } catch (err) {
      logger.error({ err }, "Worker tick failed");
    }
  };

  while (running) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

void bootstrap();
