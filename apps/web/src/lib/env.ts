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
