import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../config/env.schema.js";
import type {
  NotificationProvider, SendResult, TemplateMessage, TextMessage,
} from "./notification-provider.interface.js";

/**
 * Meta WhatsApp Cloud API, called directly.
 *
 * Business-initiated messages must use a template Meta has approved; OTP
 * templates must be AUTHENTICATION category with a copy-code button. Template
 * CONTENT lives in Meta's Business Manager — this code only references names,
 * which is why template wording can change without a deploy.
 */
@Injectable()
export class WhatsAppProvider implements NotificationProvider {
  readonly channel = "WHATSAPP" as const;
  private readonly logger = new Logger(WhatsAppProvider.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get("WHATSAPP_PHONE_NUMBER_ID", { infer: true }) &&
        this.config.get("WHATSAPP_ACCESS_TOKEN", { infer: true }),
    );
  }

  async sendTemplate(message: TemplateMessage): Promise<SendResult> {
    if (!this.isConfigured()) return this.unconfigured(message.to, message.templateName);

    const components: unknown[] = [];
    if (message.bodyParams?.length) {
      components.push({
        type: "body",
        parameters: message.bodyParams.map((text) => ({ type: "text", text })),
      });
    }
    if (message.buttonParams?.length) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: message.buttonParams.map((text) => ({ type: "text", text })),
      });
    }

    return this.post({
      messaging_product: "whatsapp",
      to: message.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: message.templateName,
        language: { code: message.locale ?? "en" },
        components,
      },
    });
  }

  /** Only valid inside a 24-hour customer service window. */
  async sendText(message: TextMessage): Promise<SendResult> {
    if (!this.isConfigured()) return this.unconfigured(message.to, "text");
    return this.post({
      messaging_product: "whatsapp",
      to: message.to.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: message.body },
    });
  }

  private async post(payload: unknown): Promise<SendResult> {
    const version = this.config.get("WHATSAPP_API_VERSION", { infer: true });
    const phoneId = this.config.get("WHATSAPP_PHONE_NUMBER_ID", { infer: true });
    const token = this.config.get("WHATSAPP_ACCESS_TOKEN", { infer: true });

    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      const body = (await res.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };

      if (!res.ok) {
        return {
          success: false,
          error: body.error?.message ?? `HTTP ${res.status}`,
          // 4xx is our bug or a bad number; 5xx and 429 are worth retrying.
          retryable: res.status >= 500 || res.status === 429,
        };
      }
      return { success: true, providerMessageId: body.messages?.[0]?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown WhatsApp error",
        retryable: true,
      };
    }
  }

  private unconfigured(to: string, template: string): SendResult {
    // Local development without a Meta account must not be a hard failure.
    this.logger.warn(`WhatsApp not configured — would send "${template}" to ${to}`);
    return { success: false, error: "WHATSAPP_NOT_CONFIGURED", retryable: false };
  }
}
