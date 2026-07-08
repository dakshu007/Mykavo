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
