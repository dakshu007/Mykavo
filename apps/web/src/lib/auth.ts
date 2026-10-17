import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { createAuthMiddleware, APIError, getSessionFromCtx } from "better-auth/api";
import { prisma, startTrial, TRIAL_DAYS } from "@mykavo/database";
import { sendEmail, verifyEmailEmail } from "@mykavo/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { validateSignupEmail, EMAIL_VALIDATION_MESSAGES } from "@/lib/email-validation";
import { checkPersonName, NAME_REJECTION_MESSAGES } from "@mykavo/shared";
import { recordSignupToSheet } from "@/lib/signup-sheet";
import { enqueueAdminSignupAlert, enqueueWelcomeEmail } from "@/lib/queue";
import { addSignupToBrevo } from "@/lib/brevo-signup";

/**
 * Whether Google sign-in is configured. Drives the "Continue with Google"
 * button so it only appears once credentials are present.
 */
export const googleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

/** Verification links last an hour (Better Auth's default, stated so the email can say it). */
const VERIFY_EMAIL_EXPIRES_IN_SECONDS = 60 * 60;

/** Where a verification link lands when the request named nowhere better. */
const VERIFIED_LANDING_PATH = "/dashboard";

/**
 * Better Auth builds the link with `callbackURL=/` unless the request passed
 * one, and "/" is the marketing homepage. Point those at the dashboard,
 * where the banner and trial are. Any other callbackURL is left alone:
 * /verify-email still runs it through the trusted-origin check.
 */
function withDashboardCallback(url: string): string {
  try {
    const parsed = new URL(url);
    const callback = parsed.searchParams.get("callbackURL");
    if (!callback || callback === "/") parsed.searchParams.set("callbackURL", VERIFIED_LANDING_PATH);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Starts the workspace's 14-day Pro trial for a user whose email is now
 * verified. Signup only starts it for an already-verified address (Google);
 * an email/password account gets it here, on verification, so a stream of
 * throwaway signups cannot farm trials. Idempotent: startTrial allows one
 * trial per workspace. Never throws - Free is a fine fallback.
 */
async function startTrialForVerifiedUser(
  user: { id: string; email: string; name: string; createdAt: Date },
  workspaceId?: string,
): Promise<boolean> {
  try {
    const id =
      workspaceId ??
      (
        await prisma.workspace.findFirst({
          where: { ownerId: user.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )?.id;
    if (!id) return false;
    const trial = await startTrial(prisma, id, { source: "signup" });
    return trial !== null;
  } catch (err) {
    logger.warn("could not start trial", {
      userId: user.id,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

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
  // Mobile app origins (Expo). Better Auth matches a non-http origin by
  // PREFIX, and the Expo plugin appends the session cookie to any redirect
  // into a trusted non-http URL (OAuth callback, /verify-email). So every
  // entry here is a place session cookies may be sent:
  //  - "mykavo://" is the app's own scheme, exactly the callback
  //    apps/mobile passes to signIn.social. It cannot be pinned tighter
  //    than the scheme.
  //  - "exp://" (Expo Go) is ANY host - "exp://attacker.example/" matches
  //    it - so it is development only, never production.
  //  - localhost:8081 is the Expo web dev preview, development only too.
  trustedOrigins: [
    "mykavo://",
    ...(process.env.NODE_ENV !== "production" ? ["exp://", "http://localhost:8081"] : []),
  ],
  // /update-user takes a loose record and skips the name and avatar rules,
  // and nothing calls it: the web app saves profiles through /api/profile
  // (strict zod + object storage), and apps/mobile never edits the profile.
  // Off, rather than re-validating a second copy of those rules.
  // /expo-authorization-proxy stays ON: apps/mobile's Google sign-in uses it.
  disabledPaths: ["/update-user"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // NOT requireEmailVerification: existing password accounts are
    // unverified, and requiring it would lock them out. Unverified users can
    // sign in; the dashboard banner asks them to verify, and admin rights,
    // the admin plan and the Pro trial all wait for verification instead.
  },
  // Address verification. Sent on signup, and again from the dashboard
  // banner. Verifying signs the user in and starts their Pro trial.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: VERIFY_EMAIL_EXPIRES_IN_SECONDS,
    sendVerificationEmail: async ({ user, url }, request) => {
      const email = verifyEmailEmail({
        name: user.name,
        verifyUrl: withDashboardCallback(url),
        expiresInHours: VERIFY_EMAIL_EXPIRES_IN_SECONDS / 3600,
        trialDays: TRIAL_DAYS,
      });
      const result = await sendEmail({ to: [user.email], ...email });
      if (result.ok) {
        logger.info("verification email sent", { userId: user.id, provider: result.provider });
        return;
      }
      // Never log the link: it carries a sign-in token.
      logger.warn("verification email failed", { userId: user.id, provider: result.provider, error: result.error });
      // On signup the account already exists and must not fail over email,
      // but a resend the user is waiting on should say it did not go.
      if (request && new URL(request.url).pathname.endsWith("/send-verification-email")) {
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: "We could not send the email just now. Please try again in a minute.",
        });
      }
    },
    afterEmailVerification: async (user) => {
      const trial = await startTrialForVerifiedUser(user);
      logger.info("email verified", { userId: user.id, trialStarted: trial });
      // The signup put this contact in Brevo as Free; now it is on the trial.
      if (trial) await addSignupToBrevo(user, { trial: true });
    },
  },
  // Brute-force protection (Phase 10, spec §43/§59). Better Auth enables rate
  // limiting in production; credential endpoints get much stricter per-IP caps.
  // Stored in Postgres (the rate_limit table): Netlify runs many short-lived
  // function instances, and an in-memory counter per instance is no limit
  // at all. (Add a "/request-password-reset" rule here if/when an email
  // password-reset flow is introduced.)
  rateLimit: {
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // Each one sends an email through our Resend quota.
      "/send-verification-email": { window: 60, max: 3 },
      // TOTP codes are 6 digits - throttle guessing hard (the plugin also
      // locks the account after repeated failures).
      "/two-factor/verify-totp": { window: 60, max: 6 },
      "/two-factor/verify-backup-code": { window: 60, max: 4 },
    },
  },
  // Google Authenticator-style TOTP two-factor auth. Enrollment happens at
  // signup (and from Settings); verification is required on every login for
  // enrolled users. Issuer is what shows up in the authenticator app.
  plugins: [expo(), twoFactor({ issuer: "MyKavo" })],
  advanced: {
    ipAddress: {
      // The rate limiter keys on this. Netlify's edge sets
      // x-nf-client-connection-ip from the connection itself, so a client
      // cannot forge it. x-forwarded-for is the fallback for local and
      // other hosts; Better Auth only trusts it when it holds ONE address.
      ipAddressHeaders: ["x-nf-client-connection-ip", "x-forwarded-for"],
    },
  },
  hooks: {
    // Server-side signup email vetting: structure, disposable domains, and a
    // DNS MX check - the address must belong to a domain that accepts mail.
    before: createAuthMiddleware(async (ctx) => {
      // Belt and braces for disabledPaths above: also refuse server-side
      // calls, which skip the HTTP router's path check.
      if (ctx.path === "/update-user") {
        throw new APIError("NOT_FOUND", { message: "Update your profile from Settings." });
      }

      // Resends come from the dashboard banner, signed in. Without a session
      // Better Auth would mail a link to any unverified address on request,
      // and since verifying signs the user in, inbox access alone would be
      // enough to get into an account past its password and 2FA.
      if (ctx.path === "/send-verification-email") {
        const session = await getSessionFromCtx(ctx);
        if (!session) {
          throw new APIError("UNAUTHORIZED", { message: "Sign in to resend the verification email." });
        }
        return;
      }

      if (ctx.path !== "/sign-up/email") return;

      // Name first: it is a pure string check, where the email check does a
      // DNS lookup. No reason to pay for a resolver round trip to reject a
      // row of dashes.
      const name = typeof ctx.body?.name === "string" ? ctx.body.name : "";
      const nameCheck = checkPersonName(name);
      if (!nameCheck.ok && nameCheck.reason) {
        logger.info("signup name rejected", { reason: nameCheck.reason });
        throw new APIError("BAD_REQUEST", {
          message: NAME_REJECTION_MESSAGES[nameCheck.reason],
        });
      }

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
          // A 14-day Pro trial, no card - but only for an address that is
          // already verified (Google sign-in). Email/password signups get it
          // in afterEmailVerification above, so unverified throwaway
          // accounts cannot farm trials. Never fails the signup.
          const trial = user.emailVerified
            ? await startTrialForVerifiedUser(user, workspace.id)
            : false;
          // Marketing export - fire-and-forget, never blocks signup.
          recordSignupToSheet({ email: user.email, name: user.name });

          // Tell the operator. Queued rather than sent here: this runs inside
          // the request that creates the account, and a push round trip must
          // never be able to slow that down or fail it. enqueue swallows its
          // own errors for the same reason.
          await enqueueAdminSignupAlert({ userId: user.id });

          // Welcome the customer. Fires here - on ACCOUNT CREATION - so it
          // reaches everyone once, whether they signed up with Google or with
          // an email and password; a hook on sign-in would send it again on
          // every visit, which is how a welcome becomes spam. Queued and
          // error-swallowing for the same reason as the line above.
          await enqueueWelcomeEmail({ userId: user.id });

          // Into Brevo's lists right away, for campaigns. Capped and
          // error-swallowing: it can never slow or fail the signup.
          await addSignupToBrevo(user, { trial });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
