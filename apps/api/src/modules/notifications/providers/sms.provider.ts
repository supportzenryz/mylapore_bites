import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../config/env.schema.js";
import type {
  NotificationProvider, SendResult, TemplateMessage, TextMessage,
} from "./notification-provider.interface.js";

/**
 * SMS fallback. Exists because WhatsApp-only login silently excludes anyone
 * without WhatsApp, or with a delivery failure — which would surface only as
 * unexplained checkout drop-off.
 *
 * India requires DLT-registered templates for transactional SMS; the template
 * id is configuration, not code.
 */
@Injectable()
export class SmsProvider implements NotificationProvider {
  readonly channel = "SMS" as const;
  private readonly logger = new Logger(SmsProvider.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    const provider = this.config.get("SMS_PROVIDER", { infer: true });
    if (provider === "console") return true;
    return Boolean(this.config.get("SMS_API_KEY", { infer: true }));
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    return this.sendText({ to: message.to, body: (message.bodyParams ?? []).join(" ") });
  }

  async sendText(message: TextMessage): Promise<SendResult> {
    const provider = this.config.get("SMS_PROVIDER", { infer: true });

    if (provider === "console") {
      this.logger.log(`[SMS→${message.to}] ${message.body}`);
      return { success: true, providerMessageId: `console-${Date.now()}` };
    }
    if (provider === "msg91") return this.sendViaMsg91(message);
    return { success: false, error: `SMS provider "${provider}" is not implemented`, retryable: false };
  }

  private async sendViaMsg91(message: TextMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: this.config.get("SMS_API_KEY", { infer: true }) ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: this.config.get("SMS_TEMPLATE_ID_OTP", { infer: true }),
          recipients: [{ mobiles: message.to.replace(/^\+/, ""), OTP: message.body }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
      if (!res.ok || body.type === "error") {
        return { success: false, error: body.message ?? `HTTP ${res.status}`, retryable: res.status >= 500 };
      }
      return { success: true, providerMessageId: String(body.message ?? "") };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown SMS error",
        retryable: true,
      };
    }
  }
}
