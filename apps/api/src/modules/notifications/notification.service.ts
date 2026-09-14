import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@mb/database";
import { PrismaService } from "../../common/prisma/prisma.service.js";
import { WhatsAppProvider } from "./providers/whatsapp.provider.js";
import { SmsProvider } from "./providers/sms.provider.js";
import { EmailProvider } from "./providers/email.provider.js";
import type { NotificationProvider, SendResult } from "./providers/notification-provider.interface.js";

export interface EnqueueInput {
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  eventKey: string;
  recipient: string;
  customerId?: string;
  orderId?: string;
  payload?: Record<string, unknown>;
}

const BACKOFF_SECONDS = [30, 120, 600, 3600, 21600];

/**
 * Transactional outbox.
 *
 * The notification row is written INSIDE the same transaction as the business
 * event, so a WhatsApp outage at commit time can never lose an order
 * confirmation — the row is already durable and the worker retries it.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly providers: Record<string, NotificationProvider>;

  constructor(
    private readonly prisma: PrismaService,
    whatsapp: WhatsAppProvider,
    sms: SmsProvider,
    email: EmailProvider,
  ) {
    this.providers = { WHATSAPP: whatsapp, SMS: sms, EMAIL: email };
  }

  /** Call with the surrounding transaction client wherever one exists. */
  async enqueue(input: EnqueueInput, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? this.prisma;
    const template = await client.notificationTemplate.findFirst({
      where: { eventKey: input.eventKey, channel: input.channel, isActive: true },
      select: { id: true },
    });

    const row = await client.notification.create({
      data: {
        channel: input.channel,
        eventKey: input.eventKey,
        recipient: input.recipient,
        templateId: template?.id ?? null,
        orderId: input.orderId ?? null,
        customerId: input.customerId ?? null,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
      select: { id: true },
    });
    return row.id;
  }

  /** Worker entry point. Picks up due notifications and delivers them. */
  async processDue(limit = 50): Promise<{ sent: number; failed: number }> {
    const due = await this.prisma.notification.findMany({
      where: {
        status: "PENDING",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      include: { template: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let sent = 0;
    let failed = 0;

    for (const n of due) {
      const provider = this.providers[n.channel];
      if (!provider) {
        await this.markFailed(n.id, n.attempts, n.maxAttempts, "NO_PROVIDER", false);
        failed += 1;
        continue;
      }

      const payload = (n.payload ?? {}) as Record<string, unknown>;
      const params = Array.isArray(payload.bodyParams)
        ? (payload.bodyParams as string[])
        : Object.values(payload).map(String);

      let result: SendResult;
      if (n.template?.providerTemplate) {
        result = await provider.sendTemplate({
          to: n.recipient,
          templateName: n.template.providerTemplate,
          locale: n.template.locale,
          bodyParams: params,
          buttonParams: typeof payload.code === "string" ? [payload.code] : undefined,
        });
      } else {
        result = await provider.sendText({
          to: n.recipient,
          subject: n.template?.subject ?? undefined,
          body: n.template?.body ?? params.join(" "),
        });
      }

      if (result.success) {
        await this.prisma.notification.update({
          where: { id: n.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            providerMessageId: result.providerMessageId ?? null,
            attempts: { increment: 1 },
            lastError: null,
          },
        });
        sent += 1;
      } else {
        await this.markFailed(n.id, n.attempts, n.maxAttempts, result.error ?? "unknown", result.retryable ?? true);
        failed += 1;
      }
    }

    return { sent, failed };
  }

  /**
   * Sends immediately and reports the outcome, for the one case where the
   * caller must know: an OTP the customer is waiting on.
   */
  async sendNow(
    channel: "WHATSAPP" | "SMS",
    to: string,
    templateName: string,
    bodyParams: string[],
    buttonParams?: string[],
  ): Promise<SendResult> {
    const provider = this.providers[channel];
    if (!provider) return { success: false, error: "NO_PROVIDER", retryable: false };
    return provider.sendTemplate({ to, templateName, bodyParams, buttonParams });
  }

  private async markFailed(
    id: string, attempts: number, maxAttempts: number, error: string, retryable: boolean,
  ): Promise<void> {
    const nextAttempt = attempts + 1;
    const exhausted = !retryable || nextAttempt >= maxAttempts;
    const backoff = BACKOFF_SECONDS[Math.min(nextAttempt, BACKOFF_SECONDS.length - 1)] ?? 3600;

    await this.prisma.notification.update({
      where: { id },
      data: {
        attempts: nextAttempt,
        lastError: error.slice(0, 500),
        status: exhausted ? "FAILED" : "PENDING",
        nextAttemptAt: exhausted ? null : new Date(Date.now() + backoff * 1000),
      },
    });

    if (exhausted) this.logger.error(`Notification ${id} permanently failed: ${error}`);
  }
}
