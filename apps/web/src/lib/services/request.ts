import { z } from "zod";

/**
 * MyKavo Services: the "we fix it for you" request.
 *
 * One module owns the vocabulary (kinds, urgencies, platforms), the
 * validation the public endpoint applies, and the escaped email the team
 * receives, so the form, the route and the tests can never disagree about
 * what a valid request looks like. No prices live here on purpose: every
 * job gets a fixed quote, agreed before any work starts.
 */

export const SERVICE_KINDS = ["fix", "care_plan", "other"] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  fix: "One-off fix",
  care_plan: "Care plan",
  other: "Something else",
};

export const SERVICE_URGENCIES = ["today", "this_week", "no_rush"] as const;
export type ServiceUrgency = (typeof SERVICE_URGENCIES)[number];

export const SERVICE_URGENCY_LABELS: Record<ServiceUrgency, string> = {
  today: "Today",
  this_week: "This week",
  no_rush: "No rush",
};

export const SERVICE_PLATFORMS = [
  "wordpress",
  "shopify",
  "webflow",
  "custom",
  "other",
  "not_sure",
] as const;
export type ServicePlatform = (typeof SERVICE_PLATFORMS)[number];

export const SERVICE_PLATFORM_LABELS: Record<ServicePlatform, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  webflow: "Webflow",
  custom: "Custom HTML or hand-coded site",
  other: "Something else",
  not_sure: "Not sure",
};

/** Where every request is delivered. */
export const SERVICES_INBOX = "support@mykavo.app";

/** Field limits, shared by the form (maxLength) and the schema. */
export const SERVICE_LIMITS = {
  name: 120,
  email: 200,
  websiteUrl: 500,
  messageMin: 10,
  message: 4000,
} as const;

/** True for a kind query value the form may preselect. */
export function isServiceKind(value: string | null | undefined): value is ServiceKind {
  return typeof value === "string" && (SERVICE_KINDS as readonly string[]).includes(value);
}

/**
 * Accepts "example.com" as well as "https://example.com": a site owner
 * typing their own address should not have to know about schemes. Anything
 * that already names a scheme keeps it, so "ftp://" or "javascript:" are
 * judged as written and rejected below rather than silently rewritten.
 */
export function normalizeWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") return trimmed;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** http(s) only, a real hostname, and no embedded credentials. */
export function isAcceptableWebsiteUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username !== "" || url.password !== "") return false;
  // A dotted hostname rules out "https://hello" and similar typos.
  return url.hostname.includes(".") && !url.hostname.startsWith(".") && !url.hostname.endsWith(".");
}

/** Change ids are cuids: short, alphanumeric. Anything else is not one of ours. */
const changeIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{8,64}$/i, "Invalid change reference");

export function isChangeId(value: string | null | undefined): value is string {
  return typeof value === "string" && changeIdSchema.safeParse(value).success;
}

export const serviceRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(SERVICE_LIMITS.name, "Keep your name under 120 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(SERVICE_LIMITS.email, "That email address is too long")
    .email("Enter a valid email address"),
  websiteUrl: z
    .string()
    .max(SERVICE_LIMITS.websiteUrl, "That website address is too long")
    .transform(normalizeWebsiteUrl)
    .refine(isAcceptableWebsiteUrl, "Enter your website address, for example https://example.com"),
  message: z
    .string()
    .trim()
    .min(SERVICE_LIMITS.messageMin, "Tell us a little more about what is wrong")
    .max(SERVICE_LIMITS.message, "Keep the description under 4,000 characters"),
  urgency: z.enum(SERVICE_URGENCIES, { error: "Choose how urgent this is" }),
  platform: z.enum(SERVICE_PLATFORMS).optional(),
  kind: z.enum(SERVICE_KINDS).default("fix"),
  changeEventId: changeIdSchema.optional(),
  /**
   * Honeypot. Hidden from people, tempting to bots. Not constrained here:
   * rejecting it with a field-specific 400 would tell a bot which input to
   * leave alone. The route checks it after parsing and answers 200.
   */
  company_website_url: z.string().max(500).optional(),
});

export type ServiceRequestInput = z.input<typeof serviceRequestSchema>;
export type ServiceRequestData = z.output<typeof serviceRequestSchema>;

/** First human-readable validation message, for the form's error line. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

/** Escape text for an HTML email body. Every interpolated value goes through this. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** One line, bounded: subjects must never carry a newline or run on forever. */
function subjectSafe(value: string, max = 80): string {
  const flat = value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export interface ServiceRequestEmailContext {
  requestId: string;
  /** Absolute link to the change in the dashboard, when the request came from one. */
  changeUrl?: string | null;
  /** Set when the requester was signed in. */
  workspaceName?: string | null;
}

export interface ServiceRequestEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * The internal notification. Values are user input, so the HTML version
 * escapes every one of them and never renders a link from the requester's
 * text: the website address is shown as text, not as an href.
 */
export function buildServiceRequestEmail(
  data: ServiceRequestData,
  context: ServiceRequestEmailContext,
): ServiceRequestEmail {
  const kind = SERVICE_KIND_LABELS[data.kind];
  const urgency = SERVICE_URGENCY_LABELS[data.urgency];
  const platform = data.platform ? SERVICE_PLATFORM_LABELS[data.platform] : "Not given";

  const subject = subjectSafe(
    `Service request (${kind}, ${urgency}): ${hostOf(data.websiteUrl)}`,
    120,
  );

  const rows: Array<[string, string]> = [
    ["Name", data.name],
    ["Email", data.email],
    ["Website", data.websiteUrl],
    ["Type", kind],
    ["Urgency", urgency],
    ["Platform", platform],
    ["Request ID", context.requestId],
  ];
  if (context.workspaceName) rows.push(["Workspace", context.workspaceName]);
  if (context.changeUrl) rows.push(["MyKavo change", context.changeUrl]);

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6B6B60;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0;color:#151515">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.6;color:#151515">
<p style="margin:0 0 12px"><strong>New service request</strong></p>
<table style="border-collapse:collapse;margin:0 0 16px">${htmlRows}</table>
<p style="margin:0 0 6px;color:#6B6B60">What's wrong</p>
<div style="white-space:pre-wrap;border:1px solid #e5e5e0;border-radius:8px;padding:12px;background:#FBFAF3">${escapeHtml(data.message)}</div>
<p style="margin:16px 0 0;color:#6B6B60">Reply to this email to answer ${escapeHtml(data.name)} directly (${escapeHtml(data.email)}).</p>
</div>`;

  const text = [
    "New service request",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "What's wrong:",
    data.message,
  ].join("\n");

  return { subject, html, text };
}

export interface ChangePrefillSource {
  id: string;
  title: string;
  severity: string;
  detectedAt: Date;
  websiteUrl: string;
  pageUrl: string | null;
}

export interface ChangePrefill {
  changeId: string;
  websiteUrl: string;
  title: string;
  message: string;
}

/**
 * The short description the form starts with when someone arrives from a
 * change in their dashboard. Plain text only: the form renders it in a
 * textarea, and React escapes it.
 */
export function buildChangePrefill(change: ChangePrefillSource): ChangePrefill {
  const severity = change.severity.charAt(0) + change.severity.slice(1).toLowerCase();
  const where = change.pageUrl ?? change.websiteUrl;
  const when = change.detectedAt.toLocaleDateString("en-US", { dateStyle: "medium" });
  const title = subjectSafe(change.title, 200);
  return {
    changeId: change.id,
    websiteUrl: change.websiteUrl,
    title,
    message: `MyKavo flagged this change and I would like help fixing it.\n\nChange: ${title}\nSeverity: ${severity}\nPage: ${where}\nDetected: ${when}\n\nAnything else you should know: `,
  };
}
