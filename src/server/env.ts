import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once. Secrets never reach the client bundle:
 * this module is server-only and nothing here is prefixed with NEXT_PUBLIC_.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit contenir au moins 32 caractères"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  /** "console" (development only) or "resend". */
  MAIL_TRANSPORT: z.enum(["console", "resend", "disabled"]).default("disabled"),
  MAIL_FROM: z.string().default("FOODLEK <no-reply@foodlek.local>"),
  RESEND_API_KEY: z.string().optional(),
  /** Contact put in the User-Agent sent to Open Food Facts / Open Prices, as they require. */
  OPEN_DATA_CONTACT: z.string().optional(),
  OPEN_PRICES_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuration invalide : ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
