export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  /** True when retrying could plausibly succeed (timeout, 5xx, rate limit). */
  retryable?: boolean;
}

export interface TemplateMessage {
  to: string;
  templateName: string;
  locale?: string;
  /** Positional body parameters, in template order. */
  bodyParams?: string[];
  /** Authentication templates put the code on the button too. */
  buttonParams?: string[];
}

export interface TextMessage {
  to: string;
  body: string;
  subject?: string;
}

/**
 * Every channel implements this. No WhatsApp or SMS SDK call appears anywhere
 * outside a provider, so swapping Meta for a BSP is a module change.
 */
export interface NotificationProvider {
  readonly channel: "WHATSAPP" | "SMS" | "EMAIL";
  sendTemplate(message: TemplateMessage): Promise<SendResult>;
  sendText(message: TextMessage): Promise<SendResult>;
  isConfigured(): boolean;
}
