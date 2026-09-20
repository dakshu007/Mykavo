import { z } from "zod";

/**
 * Server-side environment validation. Imported by every module that reads
 * env vars, so a misconfigured deployment fails fast at boot with a clear
 * message instead of at request time.
 *
 * MASKED SECRETS DURING THE BUILD
 * -------------------------------
 * Netlify does not hand a secret-flagged variable's real value to anything
 * reading its API - it returns a mask like `****************mw0=`. This repo
 * deploys with `netlify deploy --build` from GitHub Actions, so the BUILD
 * runs on a runner and reads env through that API: every secret-flagged
 * variable arrives masked, not real.
 *
 * That is only true of the build. At function runtime Netlify injects the
 * real values, so the app itself is never short a secret.
 *
 * The consequence is narrow but was expensive: a strict rule like `.url()` or
 * `.min(32)` rejects the mask, the build dies, and the only way anyone found
 * to deploy again was to un-flag the variable - which put a live database
 * password back into plaintext in Netlify's API. The repo had already met
 * this once and worked around it by deleting GSC_TOKEN_KEY's length check,
 * which fixes the build by giving up the check everywhere, runtime included.
 *
 * So the rule is scoped to where the problem actually is: during the build a
 * masked (or absent) value defers to runtime, and at runtime every rule is
 * enforced exactly as before. Secrets can stay flagged as secrets.
 */

/**
 * Netlify's mask: the value's last four characters behind a run of asterisks.
 * No real credential starts with four asterisks, so this cannot swallow one.
 */
const NETLIFY_MASK = /^\*{4,}/;

export function isMaskedSecret(value: unknown): boolean {
  return typeof value === "string" && NETLIFY_MASK.test(value);
}

/**
 * True while `next build` is running. Next sets NEXT_PHASE for the build
 * process; a function invocation never has it, so runtime stays strict.
 */
export function isBuildPhase(source: Record<string, string | undefined>): boolean {
  return source.NEXT_PHASE === "phase-production-build";
}

/**
 * A value the build cannot see: masked by Netlify, or absent because a
 * deploy context was left empty. Both mean "ask again at runtime".
 */
function unavailableAtBuild(value: unknown): boolean {
  return value === undefined || value === "" || isMaskedSecret(value);
}

/**
 * Wraps a strict rule so the build tolerates what it cannot see.
 *
 * `deferred` is a list the caller fills in, so the build log can name every
 * variable it skipped rather than passing silently - a skipped check that
 * says nothing is how a genuinely missing variable would reach production
 * unnoticed.
 */
function strictAtRuntime(
  rule: z.ZodType<string>,
  key: string,
  ctxRef: { allowMasked: boolean; deferred: string[] },
): z.ZodType<string> {
  return z.string().superRefine((value, ctx) => {
    if (ctxRef.allowMasked && unavailableAtBuild(value)) {
      if (!ctxRef.deferred.includes(key)) ctxRef.deferred.push(key);
      return;
    }
    const result = rule.safeParse(value);
    if (result.success) return;
    for (const issue of result.error.issues) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message });
    }
  });
}

function buildSchema(ctxRef: { allowMasked: boolean; deferred: string[] }) {
  return z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Both of these are routinely secret-flagged, so both are masked during
  // the build and checked for real at runtime. See the note at the top.
  DATABASE_URL: strictAtRuntime(
    z.string().url({ message: "DATABASE_URL must be a valid connection URL" }),
    "DATABASE_URL",
    ctxRef,
  ),
  BETTER_AUTH_SECRET: strictAtRuntime(
    z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    "BETTER_AUTH_SECRET",
    ctxRef,
  ),
  BETTER_AUTH_URL: z.string().url().optional(),
  WAITLIST_FILE: z.string().optional(),
  // Apps Script web app that appends demo requests, guest-post pitches and
  // partner applications to the marketing spreadsheet. Unset = forms still
  // work and every submission is written to the application log instead.
  LEAD_SHEET_WEBHOOK_URL: z.string().url().optional(),
  // Google OAuth (optional). Create credentials at
  // https://console.cloud.google.com → APIs & Services → Credentials.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Optional integration secret. No length constraint here: Netlify masks
  // secret values during builds, and a masked value must not fail the whole
  // env schema - gscConfigured()/gscKey() validate the real length at use.
  GSC_TOKEN_KEY: z.string().optional(),
  APP_URL: z.string().url().optional(),
  // Blog mini-CMS admins (optional). Comma-separated emails allowed to
  // write/publish blog posts from the dashboard. Unset = CMS disabled.
  BLOG_ADMIN_EMAILS: z.string().optional(),
  // Platform admins (optional). Comma-separated emails allowed to see the
  // All Usage page - total load across every workspace, plus the
  // infrastructure caps. Falls back to BLOG_ADMIN_EMAILS; unset = nobody.
  ADMIN_EMAILS: z.string().optional(),
  // Optional: lets the All Usage page read Netlify bandwidth. Without it that
  // one row reads "Not configured" and everything else still works.
  NETLIFY_AUTH_TOKEN: z.string().optional(),
  NETLIFY_ACCOUNT_SLUG: z.string().optional(),
  // Optional overrides for the provider caps in config/quotas.ts. Set these
  // after upgrading a plan, or the meters keep measuring against the free
  // tier and read alarmingly high.
  QUOTA_DATABASE_MB: z.string().optional(),
  QUOTA_DATABASE_CONNECTIONS: z.string().optional(),
  QUOTA_R2_GB: z.string().optional(),
  QUOTA_RESEND_DAILY: z.string().optional(),
  QUOTA_RESEND_MONTHLY: z.string().optional(),
  QUOTA_NETLIFY_BANDWIDTH_GB: z.string().optional(),
  // Dodo Payments (optional - billing degrades gracefully when unset).
  DODO_PRODUCT_ID: z.string().optional(),
  // Website capacity add-on product ($6/mo per +30 websites). When unset, the
  // add-on purchase UI stays hidden.
  DODO_ADDON_PRODUCT_ID: z.string().optional(),
  DODO_WEBHOOK_SECRET: z.string().optional(),
  DODO_API_KEY: z.string().optional(),
  DODO_MODE: z.enum(["test", "live"]).optional(),
  });
}

export type ServerEnv = z.infer<ReturnType<typeof buildSchema>>;

export interface LoadResult {
  env: ServerEnv;
  /** Variables whose check was deferred to runtime because the build could not see them. */
  deferred: string[];
}

/**
 * Parses an environment. Exported so the rules can be tested without
 * mutating the real process environment.
 */
export function parseServerEnv(source: Record<string, string | undefined>): LoadResult {
  const ctxRef = { allowMasked: isBuildPhase(source), deferred: [] as string[] };
  const parsed = buildSchema(ctxRef).safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  return { env: parsed.data, deferred: ctxRef.deferred };
}

function loadServerEnv(): ServerEnv {
  const { env: parsed, deferred } = parseServerEnv(process.env);
  if (deferred.length > 0) {
    // Named, not silent: if one of these is genuinely unset rather than
    // merely secret, this line is the only warning before it fails on the
    // first request.
    console.warn(
      `[env] not visible during the build, validated at runtime instead: ${deferred.join(", ")}`,
    );
  }
  return parsed;
}

export const env = loadServerEnv();
