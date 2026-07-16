import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "@mykavo/database";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { validateSignupEmail, EMAIL_VALIDATION_MESSAGES } from "@/lib/email-validation";
import { recordSignupToSheet } from "@/lib/signup-sheet";

/**
 * Whether Google sign-in is configured. Drives the "Continue with Google"
 * button so it only appears once credentials are present.
 */
export const googleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

/**
 * Better Auth server configuration (spec §8: no custom auth).
 * Email + password plus optional Google OAuth.
 *
 * Every new user gets a personal workspace via the user.create hook -
 * the workspace is the owner of websites, subscription, and usage. This
 * fires for OAuth sign-ups too, so Google users get a workspace as well.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // Brute-force protection (Phase 10, spec §43/§59). Better Auth enables rate
  // limiting in production; credential endpoints get much stricter per-IP caps.
  // Uses in-memory storage (single instance) - switch to database storage when
  // running multiple web instances. (Add a "/request-password-reset" rule here
  // if/when an email password-reset flow is introduced.)
  rateLimit: {
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // TOTP codes are 6 digits - throttle guessing hard (the plugin also
      // locks the account after repeated failures).
      "/two-factor/verify-totp": { window: 60, max: 6 },
      "/two-factor/verify-backup-code": { window: 60, max: 4 },
    },
  },
  // Google Authenticator-style TOTP two-factor auth. Enrollment happens at
  // signup (and from Settings); verification is required on every login for
  // enrolled users. Issuer is what shows up in the authenticator app.
  plugins: [twoFactor({ issuer: "MyKavo" })],
  hooks: {
    // Server-side signup email vetting: structure, disposable domains, and a
    // DNS MX check - the address must belong to a domain that accepts mail.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
      const result = await validateSignupEmail(email);
      if (!result.ok) {
        logger.info("signup email rejected", { reason: result.reason });
        throw new APIError("BAD_REQUEST", {
          message: EMAIL_VALIDATION_MESSAGES[result.reason],
        });
      }
    }),
  },
  ...(googleEnabled
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          },
        },
      }
    : {}),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const firstName = user.name.trim().split(/\s+/)[0] || "My";
          const workspace = await prisma.workspace.create({
            data: {
              name: `${firstName}'s Workspace`,
              ownerId: user.id,
              members: {
                create: { userId: user.id, role: "OWNER" },
              },
            },
          });
          logger.info("workspace auto-created", {
            userId: user.id,
            workspaceId: workspace.id,
          });
          // Marketing export - fire-and-forget, never blocks signup.
          recordSignupToSheet({ email: user.email, name: user.name });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
