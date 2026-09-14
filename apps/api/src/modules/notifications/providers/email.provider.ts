import { Injectable, Logger } from "@nestjs/common";
import type {
  NotificationProvider, SendResult, TemplateMessage, TextMessage,
} from "./notification-provider.interface.js";

/**
 * Phase 1 stub with the real interface in place. Wired to Resend/SES in
 * Phase 6 — deliberately NOT shared-hosting mail(), per the architecture.
 */
@Injectable()
export class EmailProvider implements NotificationProvider {
  readonly channel = "EMAIL" as const;
  private readonly logger = new Logger(EmailProvider.name);

  isConfigured(): boolean {
    return Boolean(process.env.EMAIL_API_KEY);
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    return this.sendText({ to: message.to, body: (message.bodyParams ?? []).join(" ") });
  }

  async sendText(message: TextMessage): Promise<SendResult> {
    if (!this.isConfigured()) {
      this.logger.log(`[EMAIL→${message.to}] ${message.subject ?? ""} ${message.body}`);
      return { success: true, providerMessageId: `console-${Date.now()}` };
    }
    return { success: false, error: "EMAIL_PROVIDER_NOT_IMPLEMENTED", retryable: false };
  }
}
