import { NextResponse } from "next/server";
import { z } from "zod";
import { recordLead, type LeadKind } from "@/lib/lead-sheet";
import { logger } from "@/lib/logger";

/**
 * Public submission endpoint for the demo, guest-post and partner forms.
 *
 * Public means unauthenticated, which means it will be found by bots. Three
 * defences, in increasing order of how much they actually matter:
 *
 *  1. A honeypot field that real users never see and never fill.
 *  2. A per-IP rate limit, so one source cannot flood the sheet.
 *  3. Strict validation with hard length caps, so nothing enormous is
 *     forwarded to Google and nothing unexpected reaches the sheet.
 *
 * The response deliberately does not distinguish "stored in the sheet" from
 * "logged only". Whether the marketing spreadsheet is reachable is not the
 * sender's problem, and telling them their enquiry half-failed would only
 * prompt a duplicate submission.
 */

const KINDS = ["demo", "guest-post", "partner-agency", "partner-tech"] as const;

const schema = z.object({
  kind: z.enum(KINDS),
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  company: z.string().trim().max(160).optional(),
  website: z.string().trim().max(300).optional(),
  message: z.string().trim().max(4000).optional(),
  details: z.record(z.string(), z.string().max(500)).optional(),
  /**
   * Honeypot. Named to look worth filling in to a bot, hidden from people.
   *
   * Deliberately NOT constrained to length zero here. Validating it would
   * reject a filled honeypot with a 400 naming the offending field, which
   * tells the next bot exactly which input to leave alone. It is checked
   * after parsing instead, and answered with a 200 that reveals nothing.
   */
  company_website_url: z.string().max(500).optional(),
});

/**
 * In-memory per-IP limiter.
 *
 * Adequate because the web app runs as a single deployment, and because the
 * cost of a miss here is a spreadsheet row rather than anything dangerous. If
 * this ever runs on several instances it becomes per-instance and the cap
 * multiplies - worth moving to the database at that point, not before.
 */
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

  // Opportunistic cleanup so the map cannot grow without bound.
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

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later, or email support@mykavo.app." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? "Please check the form and try again.")
        : "Please check the form and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // A filled honeypot is a bot. Answer 200 so it learns nothing, and record
  // nothing - a 400 here just teaches the next bot to leave the field alone.
  if (body.company_website_url) {
    logger.info("lead honeypot triggered", { kind: body.kind });
    return NextResponse.json({ ok: true });
  }

  await recordLead({
    kind: body.kind as LeadKind,
    name: body.name,
    email: body.email,
    company: body.company,
    website: body.website,
    message: body.message,
    details: body.details,
  });

  return NextResponse.json({ ok: true });
}
