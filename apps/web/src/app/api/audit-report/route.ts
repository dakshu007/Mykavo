import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getPlan } from "@/config/plans";
import { signupHref, displayHost } from "@/lib/attribution/monitor-link";
import { emailDomain, validateSignupEmail, EMAIL_VALIDATION_MESSAGES } from "@/lib/email-validation";
import { leadAuditRefusal } from "@/lib/lead-audit";
import { enqueueLeadAudit } from "@/lib/queue";
import { assertSafeUrl, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";
import { parseUrlInput } from "@/lib/url";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
  email: z.string().trim().min(3).max(254),
  /** Honeypot: hidden from people, filled in by naive bots. */
  company: z.string().max(200).optional(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Email me a free site audit" - the homepage's lead capture.
 *
 * Validates the site (SSRF) and the address (format, disposable, MX), counts
 * recent requests from the audit_lead table, records the lead and hands the
 * crawl to the worker, which emails the report a few minutes later. Nothing
 * slow happens in this request.
 */
export async function POST(request: Request) {
  const ip = clientKey(request);
  const burst = rateLimit(`audit-report:${ip}`, { limit: 3, windowMs: 60_000 });
  if (!burst.allowed) {
    return NextResponse.json(
      { error: "Too many requests - please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(burst.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Enter your website and your email." }, { status: 400 });
  }

  const parsed = parseUrlInput(input.url);
  if (!parsed) {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  // Origin + path, no query or fragment: the crawl's starting point.
  const url = `${parsed.origin}${parsed.pathname === "/" ? "/" : parsed.pathname}`;
  const host = displayHost(url);

  if (input.company) {
    // A bot filled the hidden field. Look successful, do nothing.
    return NextResponse.json({ ok: true, host });
  }

  const email = input.email.toLowerCase();
  // Cheap format check first, so a typo is reported before any DNS lookup.
  if (!emailDomain(email)) {
    return NextResponse.json({ error: EMAIL_VALIDATION_MESSAGES.format }, { status: 400 });
  }

  try {
    await assertSafeUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    return NextResponse.json({ error: "We couldn't reach that website. Check the address." }, { status: 400 });
  }

  const emailCheck = await validateSignupEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: EMAIL_VALIDATION_MESSAGES[emailCheck.reason] }, { status: 400 });
  }

  const ipHash = createHash("sha256").update(`audit-lead:${ip}`).digest("hex");
  const since = new Date(Date.now() - DAY_MS);
  const [emailCount, ipCount, hostCount, dayCount, queued] = await Promise.all([
    prisma.auditLead.count({ where: { email, createdAt: { gte: since } } }),
    prisma.auditLead.count({ where: { ipHash, createdAt: { gte: since } } }),
    prisma.auditLead.count({ where: { host, createdAt: { gte: since } } }),
    prisma.auditLead.count({ where: { createdAt: { gte: since } } }),
    prisma.auditLead.count({ where: { status: "QUEUED", createdAt: { gte: since } } }),
  ]);
  const refusal = leadAuditRefusal({ email: emailCount, ip: ipCount, host: hostCount, day: dayCount, queued });
  if (refusal) return NextResponse.json({ error: refusal }, { status: 429 });

  const lead = await prisma.auditLead.create({ data: { email, url, host, ipHash } });
  try {
    await enqueueLeadAudit({
      leadId: lead.id,
      maxPages: getPlan("free").limits.siteAuditPages,
      proAuditPages: getPlan("pro").limits.siteAuditPages,
      fullReportPath: signupHref({ url, from: "audit-email", google: false }),
      proPath: "/pricing?from=audit-email",
    });
  } catch (err) {
    console.error("[audit-report] enqueue failed", err);
    await prisma.auditLead
      .update({ where: { id: lead.id }, data: { status: "FAILED", errorMessage: "enqueue failed" } })
      .catch(() => {});
    return NextResponse.json(
      { error: "Something went wrong starting your audit. Please try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, host });
}
