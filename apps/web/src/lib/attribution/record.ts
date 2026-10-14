import { cookies } from "next/headers";
import { isMissingTableError, prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";
import { CTA_COOKIE, cleanPlacement, decodeFirstTouch, FIRST_TOUCH_COOKIE } from "./core";

/** Accounts younger than this get their source recorded on dashboard load. */
const RECORD_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
/** The analytics event only fires within the first hour, so old accounts never count as new. */
const EVENT_WINDOW_MS = 60 * 60 * 1000;

export interface NewSignup {
  landing: string;
  referrer: string;
  cta: string;
  method: string;
}

/**
 * Records where a new account came from (once) and returns what the
 * account_created event should carry, or null when the account is not new.
 * Costs nothing for existing accounts: it returns before any query.
 */
export async function recordSignupAttribution(user: { id: string; createdAt: Date | string }): Promise<NewSignup | null> {
  const age = Date.now() - new Date(user.createdAt).getTime();
  if (!(age >= 0 && age < RECORD_WINDOW_MS)) return null;
  try {
    let row = await prisma.signupAttribution.findUnique({ where: { userId: user.id } });
    if (!row) {
      const jar = await cookies();
      const first = decodeFirstTouch(jar.get(FIRST_TOUCH_COOKIE)?.value);
      const cta = cleanPlacement(jar.get(CTA_COOKIE)?.value);
      const google = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "google" },
        select: { id: true },
      });
      row = await prisma.signupAttribution.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          landing: first?.landing ?? "(unknown)",
          referrer: first?.referrer ?? "",
          cta,
          method: google ? "google" : "email",
        },
        update: {},
      });
    }
    if (age >= EVENT_WINDOW_MS) return null;
    return { landing: row.landing, referrer: row.referrer, cta: row.cta ?? "", method: row.method };
  } catch (err) {
    if (!isMissingTableError(err)) logger.warn("could not record signup attribution", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
