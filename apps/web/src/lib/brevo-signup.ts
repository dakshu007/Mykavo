import { marketingName, prisma } from "@mykavo/database";
import { addContactNow, brevoConfigured } from "@mykavo/email";
import { logger } from "@/lib/logger";

/**
 * Put a brand-new account into Brevo's "All users", "Free plan" and "No
 * website yet" lists the moment it signs up - no waiting for a sync. Runs
 * inside the signup request, so it is capped at a few seconds and never
 * throws: a Brevo hiccup must not cost anyone their signup, and the next
 * sync adds whoever this missed.
 */
export async function addSignupToBrevo(user: { id: string; email: string; name: string; createdAt: Date }): Promise<void> {
  if (!brevoConfigured()) return;
  const email = user.email.trim().toLowerCase();
  try {
    const optedOut = Boolean(await prisma.emailOptOut.findUnique({ where: { email }, select: { id: true } }).catch(() => null));
    await Promise.race([
      addContactNow({
        email,
        userId: user.id,
        ...marketingName(user.name),
        plan: "free",
        paid: false,
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
