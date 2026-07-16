import { z } from "zod";

/**
 * Server-side environment validation. Imported by every module that reads
 * env vars, so a misconfigured deployment fails fast at boot with a clear
 * message instead of at request time.
 */

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid connection URL" }),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().optional(),
  WAITLIST_FILE: z.string().optional(),
  // Google OAuth (optional). Create credentials at
  // https://console.cloud.google.com → APIs & Services → Credentials.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APP_URL: z.string().url().optional(),
  // Blog mini-CMS admins (optional). Comma-separated emails allowed to
  // write/publish blog posts from the dashboard. Unset = CMS disabled.
  BLOG_ADMIN_EMAILS: z.string().optional(),
  // Dodo Payments (optional - billing degrades gracefully when unset).
  DODO_PRODUCT_ID: z.string().optional(),
  // Website capacity add-on product ($6/mo per +30 websites). When unset, the
  // add-on purchase UI stays hidden.
  DODO_ADDON_PRODUCT_ID: z.string().optional(),
  DODO_WEBHOOK_SECRET: z.string().optional(),
  DODO_API_KEY: z.string().optional(),
  DODO_MODE: z.enum(["test", "live"]).optional(),
});

function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadServerEnv();
