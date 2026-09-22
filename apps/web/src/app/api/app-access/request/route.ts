import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import {
  checkPersonName,
  NAME_REJECTION_MESSAGES,
  normalizeAccessEmail,
  REQUEST_RECEIVED_MESSAGE,
} from "@mykavo/shared";
import { validateSignupEmail, EMAIL_VALIDATION_MESSAGES } from "@/lib/email-validation";
import { logger } from "@/lib/logger";

/**
 * Public "request the Android app" submission.
 *
 * Public means unauthenticated, which means bots will find it. Same three
 * defences as the demo form (apps/web/src/app/api/leads/route.ts): a honeypot
 * real people never see, a per-IP rate limit, and strict validation with hard
 * length caps.
 *
 * ONE RESPONSE FOR EVERY OUTCOME THAT IS NOT A VALIDATION ERROR.
 * A first request, a repeat request, and a request from an address already
 * approved all answer with the same message. Distinguishing them would tell
 * an anonymous caller whether a given address is in the system, which is a
 * membership oracle nobody needs - and telling a person their second
 * submission was a duplicate only makes them wonder whether the first worked.
 *
 * A REPEAT SUBMISSION NEVER RESETS A DECISION. The upsert deliberately
 * updates only the name: if it wrote `status: PENDING` an approved user could
 * revoke their own access by filling the form again, and a declined one could
 * jump back into the queue on demand.
 */

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  source: z.string().trim().max(40).optional(),
  /**
   * Honeypot. Not length-constrained here on purpose: rejecting a filled
   * honeypot with a 400 that names the field tells the next bot exactly which
   * input to leave alone. Checked after parsing, answered with a 200.
   */
  company_website_url: z.string().max(500).optional(),
});

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const submissions = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    submissions.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissions.set(ip, recent);
  if (submissions.size > 5000) {
    for (const [key, times] of submissions) {
      if (times.every((t) => now - t >= WINDOW_MS)) submissions.delete(key);
    }
  }
  return false;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

const received = { ok: true as const, message: REQUEST_RECEIVED_MESSAGE };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  const { name, email, source } = parsed.data;

  // Honeypot filled - a bot. Answer exactly as success so it learns nothing.
  if (parsed.data.company_website_url) {
    logger.info("app access request rejected by honeypot", { ip: clientIp(request) });
    return NextResponse.json(received);
  }

  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests from this network. Try again later." },
      { status: 429 },
    );
  }

  const nameCheck = checkPersonName(name);
  if (!nameCheck.ok) {
    return NextResponse.json(
      { error: NAME_REJECTION_MESSAGES[nameCheck.reason ?? "empty"] },
      { status: 400 },
    );
  }

  // The closest thing to "is this a real address" that can be done without
  // sending mail: structure, a disposable-provider blocklist, and an MX
  // lookup so the domain must actually accept mail. Ownership is proved later
  // by the approval email arriving at all.
  const emailCheck = await validateSignupEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json(
      { error: EMAIL_VALIDATION_MESSAGES[emailCheck.reason] },
      { status: 400 },
    );
  }

  try {
    await prisma.appAccessRequest.upsert({
      where: { email: normalizeAccessEmail(email) },
      create: {
        name,
        email: normalizeAccessEmail(email),
        source: source ?? "landing",
      },
      // Only the name. See the note above: writing `status` here would let
      // anyone reset their own decision by resubmitting the form.
      update: { name },
    });
    logger.info("app access requested", { email: normalizeAccessEmail(email), source });
  } catch (err) {
    logger.error("could not record an app access request", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not record your request. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(received);
}
