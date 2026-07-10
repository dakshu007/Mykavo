/**
 * Email templates (spec §27). Grouped scan summary and failure alert.
 * Plain HTML strings (no React Email dependency) — email clients need inline
 * styles anyway. All interpolated values are HTML-escaped.
 */

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ChangeLine {
  severity: Severity;
  title: string;
  pagePath: string;
}

export interface ScanSummaryData {
  websiteName: string;
  websiteHost: string;
  scanTime: string;
  totalChanges: number;
  highestSeverity: Severity;
  changes: ChangeLine[];
  dashboardUrl: string;
}

export interface FailureAlertData {
  websiteName: string;
  websiteHost: string;
  scanTime: string;
  reason: string;
  dashboardUrl: string;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: "#e5484d",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#3556f4",
  INFO: "#6b7280",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function label(sev: Severity): string {
  return sev.charAt(0) + sev.slice(1).toLowerCase();
}

function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#eceef4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #e4e7ee">
      <span style="display:inline-block;font-size:17px;font-weight:600;letter-spacing:-0.01em">Fluxen</span>
    </div>
    <div style="padding:28px">${inner}</div>
    <div style="padding:20px 28px;border-top:1px solid #e4e7ee;font-size:12px;color:#9aa1b1">
      Know what changed. Fix what matters.
    </div>
  </div></body></html>`;
}

function button(url: string, text: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:#3556f4;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;padding:11px 22px;border-radius:9999px">${esc(text)}</a>`;
}

export function scanSummaryEmail(data: ScanSummaryData): { subject: string; html: string; text: string } {
  const isCritical = data.highestSeverity === "CRITICAL";
  const severityWord = isCritical ? "Critical" : label(data.highestSeverity);
  const subject = `${severityWord} changes detected on ${data.websiteHost}`;

  const rows = data.changes
    .map(
      (c) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3;vertical-align:top;width:84px">
          <span style="display:inline-block;font-size:11px;font-weight:700;color:${SEVERITY_COLOR[c.severity]}">${label(c.severity)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eef0f3">
          <div style="font-size:14px;font-weight:500;color:#16181d">${esc(c.title)}</div>
          <div style="font-size:12px;color:#9aa1b1;font-family:ui-monospace,Menlo,monospace">${esc(data.websiteHost + c.pagePath)}</div>
        </td>
      </tr>`,
    )
    .join("");

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${SEVERITY_COLOR[data.highestSeverity]}">${esc(severityWord)} changes</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${data.totalChanges} change${data.totalChanges === 1 ? "" : "s"} on ${esc(data.websiteName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · scanned ${esc(data.scanTime)}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${rows}</table>
    ${button(data.dashboardUrl, "Review changes")}
  `;

  const text =
    `${severityWord} changes detected on ${data.websiteHost}\n\n` +
    `${data.totalChanges} change(s) on ${data.websiteName} (scanned ${data.scanTime}):\n` +
    data.changes.map((c) => `- [${label(c.severity)}] ${c.title} (${c.pagePath})`).join("\n") +
    `\n\nReview: ${data.dashboardUrl}`;

  return { subject, html: shell(inner), text };
}

// ---------- Site health alerts (uptime + SSL expiry) ----------

export interface DownAlertData {
  websiteName: string;
  websiteHost: string;
  /** Short failure description, e.g. "HTTP 503" or "request timed out". */
  reason: string;
  /** Human duration, e.g. "10+ minutes", "3h 12m". */
  downFor: string;
  dashboardUrl: string;
}

export interface RecoveryAlertData {
  websiteName: string;
  websiteHost: string;
  /** Total outage duration, e.g. "23m". */
  downFor: string;
  dashboardUrl: string;
}

export interface SslExpiryAlertData {
  websiteName: string;
  websiteHost: string;
  /** Whole days until expiry — zero or negative means already expired. */
  daysLeft: number;
  /** Formatted expiry date, e.g. "Jul 24, 2026". */
  expiresOn: string;
  dashboardUrl: string;
}

export function downAlertEmail(data: DownAlertData): { subject: string; html: string; text: string } {
  const subject = `\u{1F534} ${data.websiteHost} appears DOWN — ${data.reason} for ${data.downFor}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#e5484d">Website down</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)} appears to be down</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · down for ${esc(data.downFor)}</p>
    <div style="background:#fdeaeb;border-radius:12px;padding:14px 16px;font-size:14px;color:#b42318;margin-bottom:24px">${esc(data.reason)} — confirmed by two consecutive checks. We'll email you again when it recovers.</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `${data.websiteHost} appears DOWN — ${data.reason} for ${data.downFor}\n\n` +
    `Confirmed by two consecutive checks. We'll email you again when it recovers.\n\n` +
    `Dashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

export function recoveryAlertEmail(data: RecoveryAlertData): { subject: string; html: string; text: string } {
  const subject = `\u{2705} ${data.websiteHost} recovered — down for ${data.downFor}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#16a34a">Recovered</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)} is back up</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · total downtime ${esc(data.downFor)}</p>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `${data.websiteHost} recovered — down for ${data.downFor}\n\nDashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

export function sslExpiryAlertEmail(data: SslExpiryAlertData): { subject: string; html: string; text: string } {
  const expired = data.daysLeft <= 0;
  const when = expired
    ? `expired on ${data.expiresOn}`
    : `expires in ${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} (${data.expiresOn})`;
  const subject = `\u{26A0}\u{FE0F} SSL certificate for ${data.websiteHost} ${expired ? "has expired" : `expires in ${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"}`}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${expired ? "#e5484d" : "#f59e0b"}">SSL certificate ${expired ? "expired" : "expiring"}</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">Certificate for ${esc(data.websiteName)} ${esc(when)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)}</p>
    <div style="background:${expired ? "#fdeaeb" : "#fdf3e0"};border-radius:12px;padding:14px 16px;font-size:14px;color:${expired ? "#b42318" : "#92600a"};margin-bottom:24px">Renew the certificate before visitors see browser security warnings. We'll remind you daily until it's renewed.</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `SSL certificate for ${data.websiteHost} ${when}\n\n` +
    `Renew the certificate before visitors see browser security warnings.\n\n` +
    `Dashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

// ---------- Weekly client-ready report (spec §37 "client-ready reports") ----------

export interface WeeklySeverityCount {
  severity: Severity;
  count: number;
}

export interface WeeklyLighthouseScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

export interface WeeklyReportData {
  websiteName: string;
  websiteHost: string;
  /** e.g. "Jul 3 – Jul 10, 2026". */
  periodLabel: string;
  scansRun: number;
  scansFailed: number;
  totalChanges: number;
  /** Non-zero severities only, highest first. */
  changesBySeverity: WeeklySeverityCount[];
  /** Rounded percentage (0–100), or null when no checks ran. */
  uptimePercent: number | null;
  /** Average response time in ms, or null when unknown. */
  avgResponseMs: number | null;
  /** Whole days until certificate expiry, or null when unknown. */
  sslDaysLeft: number | null;
  lighthouse: WeeklyLighthouseScores | null;
  /** True when there is nothing to worry about — reassuring variant. */
  allQuiet: boolean;
  dashboardUrl: string;
}

function statCell(value: string, caption: string): string {
  return `<td style="width:33%;padding:14px 16px;background:#f5f6fa;border-radius:12px">
    <div style="font-size:20px;font-weight:600;letter-spacing:-0.01em;color:#16181d">${esc(value)}</div>
    <div style="font-size:12px;color:#5c6270;margin-top:2px">${esc(caption)}</div>
  </td>`;
}

/**
 * Weekly summary an agency can forward to its client: uptime, scans, changes
 * by severity, SSL and Lighthouse status, with an "all quiet" variant when
 * there is nothing to report.
 */
export function weeklyReportEmail(data: WeeklyReportData): { subject: string; html: string; text: string } {
  const changesWord = data.totalChanges === 0 ? "no changes" : `${data.totalChanges} change${data.totalChanges === 1 ? "" : "s"}`;
  const subject =
    `Weekly report for ${data.websiteHost} — ${changesWord}` +
    (data.uptimePercent !== null ? `, ${data.uptimePercent}% uptime` : "");

  const severityRows = data.changesBySeverity
    .map(
      (line) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #eef0f3;width:110px">
          <span style="display:inline-block;font-size:11px;font-weight:700;color:${SEVERITY_COLOR[line.severity]}">${label(line.severity)}</span>
        </td>
        <td style="padding:9px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#16181d">${line.count} change${line.count === 1 ? "" : "s"}</td>
      </tr>`,
    )
    .join("");

  const sslLine =
    data.sslDaysLeft === null
      ? ""
      : data.sslDaysLeft <= 0
        ? `<p style="margin:0 0 8px;font-size:14px;color:#b42318">SSL certificate has expired — renew it now.</p>`
        : data.sslDaysLeft <= 14
          ? `<p style="margin:0 0 8px;font-size:14px;color:#92600a">SSL certificate expires in ${data.sslDaysLeft} day${data.sslDaysLeft === 1 ? "" : "s"} — renewal recommended.</p>`
          : `<p style="margin:0 0 8px;font-size:14px;color:#5c6270">SSL certificate valid for another ${data.sslDaysLeft} days.</p>`;

  const lighthouseParts = data.lighthouse
    ? [
        ["Performance", data.lighthouse.performance],
        ["Accessibility", data.lighthouse.accessibility],
        ["Best Practices", data.lighthouse.bestPractices],
        ["SEO", data.lighthouse.seo],
      ]
        .filter((entry): entry is [string, number] => entry[1] !== null)
        .map(([name, score]) => `${name} ${score}`)
    : [];
  const lighthouseLine =
    lighthouseParts.length > 0
      ? `<p style="margin:0 0 8px;font-size:14px;color:#5c6270">Lighthouse: ${esc(lighthouseParts.join(" · "))}</p>`
      : "";

  const quietBox = data.allQuiet
    ? `<div style="background:#e8f7ee;border-radius:12px;padding:14px 16px;font-size:14px;color:#166534;margin-bottom:20px">No unexpected changes — everything looks healthy.</div>`
    : "";

  const scansCaption = data.scansFailed > 0 ? `scans (${data.scansFailed} failed)` : "scans run";

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Weekly report</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · ${esc(data.periodLabel)}</p>
    ${quietBox}
    <table style="width:100%;border-collapse:separate;border-spacing:6px 0;margin:0 -6px 20px"><tr>
      ${statCell(data.uptimePercent !== null ? `${data.uptimePercent}%` : "—", "uptime")}
      ${statCell(String(data.scansRun), scansCaption)}
      ${statCell(String(data.totalChanges), data.totalChanges === 1 ? "change detected" : "changes detected")}
    </tr></table>
    ${severityRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">${severityRows}</table>` : ""}
    ${data.avgResponseMs !== null ? `<p style="margin:0 0 8px;font-size:14px;color:#5c6270">Average response time: ${data.avgResponseMs} ms.</p>` : ""}
    ${sslLine}
    ${lighthouseLine}
    <div style="margin-top:24px">${button(data.dashboardUrl, "Open dashboard")}</div>
  `;

  const textLines = [
    `Weekly report for ${data.websiteHost} (${data.periodLabel})`,
    "",
    ...(data.allQuiet ? ["No unexpected changes — everything looks healthy.", ""] : []),
    `Uptime: ${data.uptimePercent !== null ? `${data.uptimePercent}%` : "n/a"}`,
    `Scans: ${data.scansRun} run${data.scansFailed > 0 ? `, ${data.scansFailed} failed` : ""}`,
    `Changes: ${data.totalChanges}`,
    ...data.changesBySeverity.map((line) => `- [${label(line.severity)}] ${line.count} change${line.count === 1 ? "" : "s"}`),
    ...(data.avgResponseMs !== null ? [`Average response time: ${data.avgResponseMs} ms`] : []),
    ...(data.sslDaysLeft !== null
      ? [
          data.sslDaysLeft <= 0
            ? "SSL certificate has expired."
            : `SSL certificate valid for another ${data.sslDaysLeft} day${data.sslDaysLeft === 1 ? "" : "s"}.`,
        ]
      : []),
    ...(lighthouseParts.length > 0 ? [`Lighthouse: ${lighthouseParts.join(" · ")}`] : []),
    "",
    `Dashboard: ${data.dashboardUrl}`,
  ];

  return { subject, html: shell(inner), text: textLines.join("\n") };
}

// ---------- Workspace invites (multi-user workspaces) ----------

export interface WorkspaceInviteData {
  /** Display name of the person sending the invite. */
  inviterName: string;
  workspaceName: string;
  /** Human role label, e.g. "Admin", "Member", "Viewer". */
  roleLabel: string;
  /** Absolute accept link: {APP_URL}/invite/{token}. */
  acceptUrl: string;
  /** Whole days until the invite expires. */
  expiresInDays: number;
}

export function workspaceInviteEmail(data: WorkspaceInviteData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${data.inviterName} invited you to ${data.workspaceName} on Fluxen`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Workspace invitation</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.inviterName)} invited you to ${esc(data.workspaceName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">You've been invited as a ${esc(data.roleLabel)}. Fluxen monitors websites for important changes and regressions — accept to see what this workspace is watching.</p>
    ${button(data.acceptUrl, "Accept invitation")}
    <p style="margin:20px 0 0;font-size:12px;color:#9aa1b1">This invitation expires in ${data.expiresInDays} day${data.expiresInDays === 1 ? "" : "s"}. If you weren't expecting it, you can safely ignore this email.</p>
  `;
  const text =
    `${data.inviterName} invited you to ${data.workspaceName} on Fluxen\n\n` +
    `You've been invited as a ${data.roleLabel}.\n\n` +
    `Accept: ${data.acceptUrl}\n\n` +
    `This invitation expires in ${data.expiresInDays} day${data.expiresInDays === 1 ? "" : "s"}. ` +
    `If you weren't expecting it, you can safely ignore this email.`;
  return { subject, html: shell(inner), text };
}

export function failureAlertEmail(data: FailureAlertData): { subject: string; html: string; text: string } {
  const subject = `Scan failed for ${data.websiteHost}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#e5484d">Scan failed</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">Couldn't scan ${esc(data.websiteName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · ${esc(data.scanTime)}</p>
    <div style="background:#fdeaeb;border-radius:12px;padding:14px 16px;font-size:14px;color:#b42318;margin-bottom:24px">${esc(data.reason)}</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text = `Scan failed for ${data.websiteHost}\n${data.reason}\n\nDashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}
