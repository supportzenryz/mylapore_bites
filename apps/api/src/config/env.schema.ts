import { z } from "zod";

/**
 * Validated once at boot. A missing secret should stop the process, not
 * surface as an undefined at 2am during a checkout.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1),
  DB_POOL_SIZE: z.coerce.number().int().default(15),
  REDIS_URL: z.string().min(1),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().default(30),

  STOREFRONT_IN_ORIGIN: z.string().default("http://localhost:3000"),
  STOREFRONT_UK_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_ORIGIN: z.string().default("http://localhost:3001"),

  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().default(60),
  OTP_MAX_PER_PHONE_PER_HOUR: z.coerce.number().int().default(5),
  OTP_MAX_PER_IP_PER_HOUR: z.coerce.number().int().default(20),
  OTP_WHATSAPP_FALLBACK_SECONDS: z.coerce.number().int().default(30),

  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_TEMPLATE_OTP: z.string().default("mb_login_code"),

  SMS_PROVIDER: z.enum(["msg91", "twilio", "console"]).default("console"),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  SMS_TEMPLATE_ID_OTP: z.string().optional(),

  CAPACITY_HOLD_TTL_MINUTES: z.coerce.number().int().default(15),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return parsed.data;
}
