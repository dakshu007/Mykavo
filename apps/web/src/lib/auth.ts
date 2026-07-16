import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@mykavo/database";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

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
 * Every new user gets a personal workspace via the user.create hook —
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
  // Uses in-memory storage (single instance) — switch to database storage when
  // running multiple web instances. (Add a "/request-password-reset" rule here
  // if/when an email password-reset flow is introduced.)
  rateLimit: {
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
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
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
