import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@fluxen/database";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Better Auth server configuration (spec §8: no custom auth).
 * Email + password for the MVP; social providers can be added later.
 *
 * Every new user gets a personal workspace via the user.create hook —
 * the workspace is the owner of websites, subscription, and usage.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
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
