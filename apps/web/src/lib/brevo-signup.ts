import { isInternalEmail, marketingName, prisma } from "@mykavo/database";
import { addContactNow, brevoConfigured } from "@mykavo/email";
import { logger } from "@/lib/logger";

/**
 * Put a brand-new account into Brevo's "All users" and "No website yet"
 * lists the moment it signs up - no waiting for a sync. Signup starts the
 * Pro trial, which keeps it out of the "Free plan" list; only an account
 * whose trial did not start goes in there too. Runs inside the signup
 * request, so it is capped at a few seconds and never throws: a Brevo
 * hiccup must not cost anyone their signup, and the next sync adds whoever
 * this missed (and moves the contact to Free once the trial ends).
 */
export async function addSignupToBrevo(
  user: { id: string; email: string; name: string; createdAt: Date },
  opts: { trial: boolean },
): Promise<void> {
  if (!brevoConfigured()) return;
  const email = user.email.trim().toLowerCase();
  // The team's own test and admin accounts are not an audience.
  if (isInternalEmail(email)) return;
  try {
    const optedOut = Boolean(await prisma.emailOptOut.findUnique({ where: { email }, select: { id: true } }).catch(() => null));
    await Promise.race([
      addContactNow({
        email,
        userId: user.id,
        ...marketingName(user.name),
        plan: opts.trial ? "pro_trial" : "free",
        paid: false,
        trial: opts.trial,
        websites: 0,
        signedUpAt: user.createdAt,
        optedOut,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out after 4s")), 4000)),
    ]);
  } catch (err) {
    logger.warn("could not add signup to Brevo; the next sync will", {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
