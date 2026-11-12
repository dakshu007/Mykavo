import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { createAuthMiddleware, APIError, getSessionFromCtx } from "better-auth/api";
import { prisma, startTrial, TRIAL_DAYS } from "@mykavo/database";
import { sendEmail, verificationCodeEmail, verifyEmailEmail } from "@mykavo/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { validateSignupEmail, EMAIL_VALIDATION_MESSAGES } from "@/lib/email-validation";
import { checkPersonName, NAME_REJECTION_MESSAGES } from "@mykavo/shared";
import { recordSignupToSheet } from "@/lib/signup-sheet";
import { enqueueAdminSignupAlert, enqueueWelcomeEmail } from "@/lib/queue";
import { addSignupToBrevo } from "@/lib/brevo-signup";
import {
  EMAIL_CODE_ALLOWED_ATTEMPTS,
  EMAIL_CODE_EXPIRES_IN_SECONDS,
  EMAIL_CODE_LENGTH,
  needsEmailCode,
  resendWaitSeconds,
} from "@/lib/email-code";

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
 * The latest code issued for an address, for the resend cooldown. Codes are
 * stored by the emailOTP plugin under this identifier.
 */
async function lastCodeIssuedAt(email: string): Promise<Date | null> {
  const row = await prisma.verification
    .findFirst({
      where: { identifier: `email-verification-otp-${email}` },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    .catch(() => null);
  return row?.createdAt ?? null;
}

/** The account a code request or check is about, when it is one that needs a code. */
async function codeAccount(rawEmail: unknown) {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email) return null;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
  });
  return needsEmailCode(user) ? user : null;
}

/**
 * Everything a new account sets in motion besides its workspace: the
 * signup sheet, the admin alert, the welcome email and the Brevo contact.
 * Google sign-ins (verified on arrival) run it at account creation; email
 * and password accounts that need a code run it once they have typed it,
 * so an address nobody can read never gets a welcome email or a place in
 * the marketing lists.
 */
async function announceNewAccount(
  user: { id: string; email: string; name: string; createdAt: Date },
  trial: boolean,
): Promise<void> {
  // Marketing export - fire-and-forget, never blocks signup.
  recordSignupToSheet({ email: user.email, name: user.name });

  // Tell the operator. Queued rather than sent here: this runs inside the
  // request that creates (or confirms) the account, and a push round trip
  // must never be able to slow that down or fail it. enqueue swallows its
  // own errors for the same reason.
  await enqueueAdminSignupAlert({ userId: user.id });

  // Welcome the customer, once (the worker de-duplicates). Never on sign-in:
  // a welcome on every visit is how a welcome becomes spam.
  await enqueueWelcomeEmail({ userId: user.id });

  // Into Brevo's lists right away, for campaigns. Capped and
  // error-swallowing: it can never slow or fail the signup.
  await addSignupToBrevo(user, { trial });
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
  disabledPaths: [
    "/update-user",
    // emailOTP is only used to confirm a new address. Its other endpoints
    // would open new ways in (passwordless sign-in, password reset by code,
    // email change) that skip the password and 2FA: off.
    "/sign-in/email-otp",
    "/email-otp/check-verification-otp",
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/reset-password",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Signing up never signs in: a new account must first type the 6-digit
    // code emailed to it (emailOTP below). Sign-in for those accounts is
    // held back the same way in the before hook.
    //
    // NOT requireEmailVerification: that would also lock out the password
    // accounts created before codes existed, which were never verified. They
    // are grandfathered (lib/email-code.ts): they sign in as before, the
    // dashboard banner asks them to confirm by link, and admin rights, the
    // admin plan and the Pro trial all wait for verification.
    autoSignIn: false,
  },
  // Address verification by LINK, for the grandfathered accounts above: sent
  // from the dashboard banner. New accounts confirm with a code instead
  // (emailOTP below), so nothing is sent by link at signup. Verifying either
  // way signs the user in and starts their Pro trial.
  emailVerification: {
    sendOnSignUp: false,
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
      if (needsEmailCode({ emailVerified: false, createdAt: user.createdAt })) {
        // A new account that just typed its code: everything its signup
        // held back until the address was proven (see announceNewAccount).
        await announceNewAccount(user, trial);
      } else if (trial) {
        // A grandfathered account confirming by link: its signup already put
        // it in Brevo as Free; now it is on the trial.
        await addSignupToBrevo(user, { trial: true });
      }
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
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      // A code is 6 digits and dies after a few wrong guesses (emailOTP
      // allowedAttempts); this caps how fast anyone can burn through codes.
      "/email-otp/verify-email": { window: 60, max: 6 },
      // TOTP codes are 6 digits - throttle guessing hard (the plugin also
      // locks the account after repeated failures).
      "/two-factor/verify-totp": { window: 60, max: 6 },
      "/two-factor/verify-backup-code": { window: 60, max: 4 },
    },
  },
  // Google Authenticator-style TOTP two-factor auth. Enrollment happens at
  // signup (and from Settings); verification is required on every login for
  // enrolled users. Issuer is what shows up in the authenticator app.
  plugins: [
    expo(),
    twoFactor({ issuer: "MyKavo" }),
    // 6-digit email codes for new email/password accounts (lib/email-code.ts).
    // Only the confirm-your-address flow is used: the plugin's passwordless
    // sign-in, password reset and email change endpoints are disabled below.
    emailOTP({
      otpLength: EMAIL_CODE_LENGTH,
      expiresIn: EMAIL_CODE_EXPIRES_IN_SECONDS,
      allowedAttempts: EMAIL_CODE_ALLOWED_ATTEMPTS,
      // Stored as a hash, like a password: a leaked verification table must
      // not be a list of working codes.
      storeOTP: "hashed",
      sendVerificationOnSignUp: true,
      rateLimit: { window: 60, max: 6 },
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        if (type !== "email-verification") return;
        const user = await prisma.user
          .findUnique({ where: { email: email.toLowerCase() }, select: { id: true, name: true } })
          .catch(() => null);
        if (process.env.NODE_ENV === "development") {
          // Local only: there is usually no mail provider, and the flow must
          // be testable end to end. Never in production.
          logger.info("email code (development only)", { email, code: otp });
        }
        const message = verificationCodeEmail({
          name: user?.name ?? "",
          code: otp,
          expiresInMinutes: EMAIL_CODE_EXPIRES_IN_SECONDS / 60,
        });
        const result = await sendEmail({ to: [email], ...message });
        if (result.ok) {
          logger.info("email code sent", { userId: user?.id, provider: result.provider });
          return;
        }
        // Never log the code itself.
        logger.warn("email code failed", { userId: user?.id, provider: result.provider, error: result.error });
        // At signup the account exists and must not fail over email (the
        // verify screen can send another); a resend the user is waiting on
        // should say it did not go.
        if (ctx?.path === "/email-otp/send-verification-otp") {
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "We could not send the code just now. Please try again in a minute.",
          });
        }
      },
    }),
  ],
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

      // A code is only for an account that needs one: new, unverified, email
      // and password. Confirming signs the account in, so it must never work
      // for a verified account (or a grandfathered one, which may have 2FA):
      // that would let inbox access alone get past a password and 2FA.
      if (ctx.path === "/email-otp/send-verification-otp" || ctx.path === "/email-otp/verify-email") {
        if (ctx.path === "/email-otp/send-verification-otp" && ctx.body?.type !== "email-verification") {
          throw new APIError("BAD_REQUEST", { message: "Invalid code type." });
        }
        const account = await codeAccount(ctx.body?.email);
        if (!account) {
          throw new APIError("BAD_REQUEST", {
            message: "This email has nothing to confirm. Sign in instead.",
          });
        }
        if (ctx.path === "/email-otp/send-verification-otp") {
          const wait = resendWaitSeconds(await lastCodeIssuedAt(account.email));
          if (wait > 0) {
            throw new APIError("TOO_MANY_REQUESTS", {
              message: `A code is already on its way. You can ask for another in ${wait} seconds.`,
            });
          }
        }
        return;
      }

      // Signing in to a new account that has not typed its code yet: check
      // the password first (a wrong one fails as usual, below), then send the
      // caller to the code screen instead of a session. The screen asks for
      // the code itself, so a wrong password never sends an email.
      if (ctx.path === "/sign-in/email") {
        const account = await codeAccount(ctx.body?.email);
        if (!account) return;
        const password = typeof ctx.body?.password === "string" ? ctx.body.password : "";
        const credential = await prisma.account.findFirst({
          where: { userId: account.id, providerId: "credential" },
          select: { password: true },
        });
        if (!credential?.password || !password) return;
        const ok = await ctx.context.password.verify({ hash: credential.password, password });
        if (!ok) return;
        throw new APIError("FORBIDDEN", {
          code: "EMAIL_NOT_VERIFIED",
          // The web form shows the code screen; the mobile app shows this.
          message: "Confirm your email to finish signing in. Sign in at mykavo.app once to get your code.",
        });
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

      // With autoSignIn off, Better Auth answers a signup for an address
      // that already has an account with a quiet fake success. Say so
      // plainly instead, as the form always has.
      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true },
      });
      if (existing) {
        throw new APIError("UNPROCESSABLE_ENTITY", {
          code: "USER_ALREADY_EXISTS",
          message: "An account with this email already exists. Sign in instead.",
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
          // A new email/password account has not proven its address yet: it
          // gets its workspace now, and its trial, welcome email, admin alert
          // and marketing contact once it types its code
          // (afterEmailVerification above). Throwaway addresses never get
          // past this point.
          if (needsEmailCode(user)) return;

          // A 14-day Pro trial, no card - but only for an address that is
          // already verified (Google sign-in), so unverified throwaway
          // accounts cannot farm trials. Never fails the signup.
          const trial = user.emailVerified
            ? await startTrialForVerifiedUser(user, workspace.id)
            : false;
          await announceNewAccount(user, trial);
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
