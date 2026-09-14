import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service.js";
import { WhatsAppProvider } from "./providers/whatsapp.provider.js";
import { SmsProvider } from "./providers/sms.provider.js";
import { EmailProvider } from "./providers/email.provider.js";

@Module({
  providers: [NotificationService, WhatsAppProvider, SmsProvider, EmailProvider],
  exports: [NotificationService, WhatsAppProvider, SmsProvider],
})
export class NotificationModule {}
