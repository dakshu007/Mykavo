/**
 * Email templates (spec §27). Grouped scan summary and failure alert.
 * Plain HTML strings (no React Email dependency) - email clients need inline
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
  /**
   * "failed" - the site could not be scanned at all.
   * "incomplete" - the pages were captured, but MyKavo could not compare them
   *   against the baseline, so this scan is not evidence that nothing changed.
   *   Worth its own wording: telling someone their scan "failed" when their
   *   site is fine sends them looking in the wrong place.
   * Defaults to "failed".
   */
  kind?: "failed" | "incomplete";
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
      <span style="display:inline-block;font-size:17px;font-weight:600;letter-spacing:-0.01em">MyKavo</span>
    </div>
    <div style="padding:28px">${inner}</div>
    <div style="padding:20px 28px;border-top:1px solid #e4e7ee;font-size:12px;color:#9aa1b1">
      Know what changed. Fix what matters.
    </div>
  </div></body></html>`;
}

/** White-label shell: the agency's name heads the email; MyKavo remains as
 *  a small transparency line in the footer (third-party mail must say who
 *  actually sent it - and the From domain is ours either way). */
function shellBranded(inner: string, brandName: string | null): string {
  if (!brandName) return shell(inner);
  return `<!doctype html><html><body style="margin:0;background:#eceef4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #e4e7ee">
      <span style="display:inline-block;font-size:17px;font-weight:600;letter-spacing:-0.01em">${esc(brandName)}</span>
    </div>
    <div style="padding:28px">${inner}</div>
    <div style="padding:20px 28px;border-top:1px solid #e4e7ee;font-size:12px;color:#9aa1b1">
      Sent via MyKavo website monitoring
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

// ---------- Scheduled client report delivery ----------

export interface ClientReportDeliveryData {
  websiteName: string;
  websiteHost: string;
  /** e.g. "Jul 3 - Aug 2, 2026". */
  periodLabel: string;
  /** Agency name for white-label framing; null falls back to MyKavo voice. */
  brandName: string | null;
  scansRun: number;
  totalChanges: number;
  /** Rounded percentage (0-100), or null when no checks ran. */
  uptimePercent: number | null;
  /** Average response time in ms, or null when unknown. */
  avgResponseMs: number | null;
  /** Public /r/[token] report URL - the CTA target. */
  reportUrl: string;
}

/**
 * The client-facing scheduled report email (Pro). Sent TO THE AGENCY'S
 * CLIENT, so the voice is the agency's: "prepared by {brand}" leads and
 * MyKavo appears only as a small transparency line (required for third-party
 * mail; the From address is MyKavo's domain either way).
 */
export function clientReportDeliveryEmail(
  data: ClientReportDeliveryData,
): { subject: string; html: string; text: string } {
  const from = data.brandName ?? "MyKavo";
  const subject = `${data.websiteHost} website report - ${data.periodLabel}`;

  const statRow = (label: string, value: string) => `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #eef0f3;font-size:13px;color:#5c6270">${esc(label)}</td>
    <td style="padding:9px 0;border-bottom:1px solid #eef0f3;font-size:14px;font-weight:600;text-align:right;color:#16181d">${esc(value)}</td>
  </tr>`;

  const uptime = data.uptimePercent === null ? "-" : `${data.uptimePercent}%`;
  const response = data.avgResponseMs === null ? "-" : `${data.avgResponseMs} ms`;
  const changes =
    data.totalChanges === 0
      ? "None - all clear"
      : `${data.totalChanges} caught and reviewed`;

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#5c6270">Prepared by ${esc(from)}</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">Website report for ${esc(data.websiteName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · ${esc(data.periodLabel)}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${statRow("Uptime", uptime)}
      ${statRow("Average response time", response)}
      ${statRow("Unexpected changes", changes)}
      ${statRow("Monitoring scans run", String(data.scansRun))}
    </table>
    ${button(data.reportUrl, "View the full report")}
  `;

  const text =
    `Website report for ${data.websiteName} (${data.periodLabel})\n` +
    `Prepared by ${from}\n\n` +
    `Uptime: ${uptime}\n` +
    `Average response time: ${response}\n` +
    `Unexpected changes: ${changes}\n` +
    `Monitoring scans run: ${data.scansRun}\n\n` +
    `Full report: ${data.reportUrl}`;

  return { subject, html: shellBranded(inner, data.brandName), text };
}

// ---------- Deploy check verdict ----------

export interface DeployVerdictData {
  websiteName: string;
  websiteHost: string;
  scanTime: string;
  /** Caller-supplied release label from the hook body, e.g. "v2.4.1". */
  note: string | null;
  totalChanges: number;
  /** null when the deploy is clean. */
  highestSeverity: Severity | null;
  changes: ChangeLine[];
  dashboardUrl: string;
}

/**
 * Post-deploy verification verdict. Unlike scan summaries this ALWAYS sends -
 * "deploy verified" is the product moment, so a clean result gets its own
 * celebratory email rather than silence.
 */
export function deployVerdictEmail(data: DeployVerdictData): { subject: string; html: string; text: string } {
  const releaseTag = data.note ? ` (${data.note})` : "";
  const clean = data.totalChanges === 0 || data.highestSeverity === null;

  if (clean) {
    const subject = `✅ Deploy verified${releaseTag} - ${data.websiteHost} matches its baseline`;
    const inner = `
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#18794e">Deploy verified</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">No unexpected changes on ${esc(data.websiteName)}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)}${esc(releaseTag)} · checked ${esc(data.scanTime)}</p>
      <div style="background:#e6f6ee;border-radius:12px;padding:14px 16px;font-size:14px;color:#18794e;margin-bottom:24px">Every monitored page matches the approved baseline - availability, SEO tags, content, scripts, links, and visuals.</div>
      ${button(data.dashboardUrl, "Open dashboard")}
    `;
    const text =
      `Deploy verified${releaseTag} - ${data.websiteHost} matches its baseline\n\n` +
      `No unexpected changes on ${data.websiteName} (checked ${data.scanTime}).\n\n` +
      `Dashboard: ${data.dashboardUrl}`;
    return { subject, html: shell(inner), text };
  }

  const severityWord = label(data.highestSeverity ?? "INFO");
  const subject = `Deploy check${releaseTag}: ${data.totalChanges} change${data.totalChanges === 1 ? "" : "s"} on ${data.websiteHost} - highest ${severityWord}`;
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
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${SEVERITY_COLOR[data.highestSeverity ?? "INFO"]}">Deploy check</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${data.totalChanges} change${data.totalChanges === 1 ? "" : "s"} after deploying ${esc(data.websiteName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)}${esc(releaseTag)} · checked ${esc(data.scanTime)}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${rows}</table>
    ${button(data.dashboardUrl, "Review changes")}
  `;
  const text =
    `Deploy check${releaseTag}: ${data.totalChanges} change(s) on ${data.websiteHost} - highest ${severityWord}\n\n` +
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
  /** Whole days until expiry - zero or negative means already expired. */
  daysLeft: number;
  /** Formatted expiry date, e.g. "Jul 24, 2026". */
  expiresOn: string;
  dashboardUrl: string;
}

export function downAlertEmail(data: DownAlertData): { subject: string; html: string; text: string } {
  const subject = `\u{1F534} ${data.websiteHost} appears DOWN - ${data.reason} for ${data.downFor}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#e5484d">Website down</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)} appears to be down</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · down for ${esc(data.downFor)}</p>
    <div style="background:#fdeaeb;border-radius:12px;padding:14px 16px;font-size:14px;color:#b42318;margin-bottom:24px">${esc(data.reason)} - confirmed by two consecutive checks. We'll email you again when it recovers.</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `${data.websiteHost} appears DOWN - ${data.reason} for ${data.downFor}\n\n` +
    `Confirmed by two consecutive checks. We'll email you again when it recovers.\n\n` +
    `Dashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

export function recoveryAlertEmail(data: RecoveryAlertData): { subject: string; html: string; text: string } {
  const subject = `\u{2705} ${data.websiteHost} recovered - down for ${data.downFor}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#16a34a">Recovered</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)} is back up</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · total downtime ${esc(data.downFor)}</p>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `${data.websiteHost} recovered - down for ${data.downFor}\n\nDashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

/**
 * MyKavo monitoring itself. These two go to the operators, not to customers.
 *
 * When the worker cannot reach Postgres there are no scans, no uptime checks,
 * no alerts and no reports, and the dashboard looks entirely normal because
 * it reports what is in the database and the database stops changing. Email
 * is the only channel that still works, because Resend is an HTTPS call that
 * touches no database at all.
 */
export interface WorkerDbOutageData {
  /** Human duration, e.g. "42 minutes". */
  downFor: string;
  /** The error the probe last saw, already trimmed to something readable. */
  reason: string;
  /** True when this is a reminder about an outage already reported. */
  repeat: boolean;
  dashboardUrl: string;
}

export interface WorkerDbRecoveryData {
  downFor: string;
  dashboardUrl: string;
}

export function workerDbOutageEmail(data: WorkerDbOutageData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = data.repeat
    ? `\u{1F534} MyKavo worker STILL cannot reach the database - ${data.downFor}`
    : `\u{1F534} MyKavo worker cannot reach the database`;
  const lead = data.repeat
    ? "This outage was already reported and is still unresolved."
    : "Nothing is being scanned, no alerts are being sent, and no sweeps are running.";
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#e5484d">Worker offline</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">The scan worker has lost its database</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">Unreachable for ${esc(data.downFor)}</p>
    <div style="background:#fdeaeb;border-radius:12px;padding:14px 16px;font-size:14px;color:#b42318;margin-bottom:16px">${esc(lead)} The dashboard will look normal throughout, because it only shows what is in the database.</div>
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#5c6270">What the worker last saw</p>
    <div style="background:#f4f5f7;border-radius:10px;padding:12px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#3a3f4b;margin-bottom:24px;word-break:break-word">${esc(data.reason)}</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `MyKavo worker cannot reach the database - unreachable for ${data.downFor}\n\n` +
    `${lead} The dashboard will look normal throughout, because it only shows what is in the database.\n\n` +
    `What the worker last saw:\n${data.reason}\n\n` +
    `Dashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

export function workerDbRecoveryEmail(data: WorkerDbRecoveryData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `\u{2705} MyKavo worker reconnected - database was unreachable for ${data.downFor}`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#16a34a">Recovered</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">The scan worker is back</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">The database was unreachable for ${esc(data.downFor)}</p>
    <div style="background:#eefaf0;border-radius:12px;padding:14px 16px;font-size:14px;color:#16653a;margin-bottom:24px">Queued work resumes automatically. Scans whose jobs died during the outage are marked failed by the recovery sweep and need running again.</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text =
    `MyKavo worker reconnected - the database was unreachable for ${data.downFor}\n\n` +
    `Queued work resumes automatically. Scans whose jobs died during the outage are marked failed and need running again.\n\n` +
    `Dashboard: ${data.dashboardUrl}`;
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

// ---------- Performance-drop alert (weekly Lighthouse audits) ----------

/** One audit's scores; the alert only fires when both performance scores exist. */
export interface PerformanceDropSnapshot {
  performance: number;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcpMs: number | null;
}

export interface PerformanceDropData {
  websiteName: string;
  websiteHost: string;
  /** Path of the audited page, e.g. "/" or "/pricing". */
  pagePath: string;
  previous: PerformanceDropSnapshot;
  current: PerformanceDropSnapshot;
  dashboardUrl: string;
}

/** "90 → 60 (-30)"; "-" when either side is unknown. */
function scoreDelta(prev: number | null, curr: number | null): string {
  if (prev === null || curr === null) return "-";
  const d = curr - prev;
  const signed = d === 0 ? "±0" : d > 0 ? `+${d}` : String(d);
  return `${prev} → ${curr} (${signed})`;
}

function fmtLcp(v: number | null): string {
  if (v === null) return "-";
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`;
}

export function performanceDropEmail(data: PerformanceDropData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `\u{1F4C9} Performance dropped on ${data.websiteHost}: ${data.previous.performance} → ${data.current.performance}`;

  const rows: [string, number | null, number | null][] = [
    ["Performance", data.previous.performance, data.current.performance],
    ["Accessibility", data.previous.accessibility, data.current.accessibility],
    ["Best Practices", data.previous.bestPractices, data.current.bestPractices],
    ["SEO", data.previous.seo, data.current.seo],
  ];

  const deltaColor = (prev: number | null, curr: number | null): string => {
    if (prev === null || curr === null || curr === prev) return "#5c6270";
    return curr < prev ? "#e5484d" : "#16a34a";
  };

  const scoreRows = rows
    .map(
      ([name, prev, curr]) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#16181d;width:130px">${esc(name)}</td>
        <td style="padding:9px 0;border-bottom:1px solid #eef0f3;font-size:14px;font-weight:600;color:${deltaColor(prev, curr)};font-family:ui-monospace,Menlo,monospace">${esc(scoreDelta(prev, curr))}</td>
      </tr>`,
    )
    .join("");

  const lcpLine =
    data.previous.lcpMs !== null || data.current.lcpMs !== null
      ? `<p style="margin:0 0 8px;font-size:14px;color:#5c6270">Largest Contentful Paint: <span style="font-family:ui-monospace,Menlo,monospace;color:#16181d">${esc(fmtLcp(data.previous.lcpMs))} → ${esc(fmtLcp(data.current.lcpMs))}</span></p>`
      : "";

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#e5484d">Performance drop</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">Performance on ${esc(data.websiteName)} fell ${data.previous.performance} → ${data.current.performance}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270;font-family:ui-monospace,Menlo,monospace">${esc(data.websiteHost + data.pagePath)}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${scoreRows}</table>
    ${lcpLine}
    <div style="margin-top:24px">${button(data.dashboardUrl, "Open dashboard")}</div>
  `;

  const text =
    `Performance dropped on ${data.websiteHost}: ${data.previous.performance} → ${data.current.performance}\n\n` +
    `Audited page: ${data.websiteHost}${data.pagePath}\n\n` +
    rows.map(([name, prev, curr]) => `- ${name}: ${scoreDelta(prev, curr)}`).join("\n") +
    `\n- LCP: ${fmtLcp(data.previous.lcpMs)} → ${fmtLcp(data.current.lcpMs)}` +
    `\n\nDashboard: ${data.dashboardUrl}`;

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
  /** e.g. "Jul 3 - Jul 10, 2026". */
  periodLabel: string;
  scansRun: number;
  scansFailed: number;
  totalChanges: number;
  /** Non-zero severities only, highest first. */
  changesBySeverity: WeeklySeverityCount[];
  /** Rounded percentage (0-100), or null when no checks ran. */
  uptimePercent: number | null;
  /** Average response time in ms, or null when unknown. */
  avgResponseMs: number | null;
  /** Whole days until certificate expiry, or null when unknown. */
  sslDaysLeft: number | null;
  lighthouse: WeeklyLighthouseScores | null;
  /** True when there is nothing to worry about - reassuring variant. */
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
    `Weekly report for ${data.websiteHost} - ${changesWord}` +
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
        ? `<p style="margin:0 0 8px;font-size:14px;color:#b42318">SSL certificate has expired - renew it now.</p>`
        : data.sslDaysLeft <= 14
          ? `<p style="margin:0 0 8px;font-size:14px;color:#92600a">SSL certificate expires in ${data.sslDaysLeft} day${data.sslDaysLeft === 1 ? "" : "s"} - renewal recommended.</p>`
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
    ? `<div style="background:#e8f7ee;border-radius:12px;padding:14px 16px;font-size:14px;color:#166534;margin-bottom:20px">No unexpected changes - everything looks healthy.</div>`
    : "";

  const scansCaption = data.scansFailed > 0 ? `scans (${data.scansFailed} failed)` : "scans run";

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Weekly report</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · ${esc(data.periodLabel)}</p>
    ${quietBox}
    <table style="width:100%;border-collapse:separate;border-spacing:6px 0;margin:0 -6px 20px"><tr>
      ${statCell(data.uptimePercent !== null ? `${data.uptimePercent}%` : "-", "uptime")}
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
    ...(data.allQuiet ? ["No unexpected changes - everything looks healthy.", ""] : []),
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
  const subject = `${data.inviterName} invited you to ${data.workspaceName} on MyKavo`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Workspace invitation</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.inviterName)} invited you to ${esc(data.workspaceName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">You've been invited as a ${esc(data.roleLabel)}. MyKavo monitors websites for important changes and regressions - accept to see what this workspace is watching.</p>
    ${button(data.acceptUrl, "Accept invitation")}
    <p style="margin:20px 0 0;font-size:12px;color:#9aa1b1">This invitation expires in ${data.expiresInDays} day${data.expiresInDays === 1 ? "" : "s"}. If you weren't expecting it, you can safely ignore this email.</p>
  `;
  const text =
    `${data.inviterName} invited you to ${data.workspaceName} on MyKavo\n\n` +
    `You've been invited as a ${data.roleLabel}.\n\n` +
    `Accept: ${data.acceptUrl}\n\n` +
    `This invitation expires in ${data.expiresInDays} day${data.expiresInDays === 1 ? "" : "s"}. ` +
    `If you weren't expecting it, you can safely ignore this email.`;
  return { subject, html: shell(inner), text };
}

export function failureAlertEmail(data: FailureAlertData): { subject: string; html: string; text: string } {
  const incomplete = data.kind === "incomplete";
  const subject = incomplete
    ? `Scan incomplete for ${data.websiteHost} - changes were not checked`
    : `Scan failed for ${data.websiteHost}`;
  const eyebrow = incomplete ? "Scan incomplete" : "Scan failed";
  const heading = incomplete
    ? `Couldn't check ${esc(data.websiteName)} for changes`
    : `Couldn't scan ${esc(data.websiteName)}`;
  const accent = incomplete ? "#f97316" : "#e5484d";
  const panelBg = incomplete ? "#fff2e5" : "#fdeaeb";
  const panelInk = incomplete ? "#9a3412" : "#b42318";
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${accent}">${eyebrow}</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${heading}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(data.websiteHost)} · ${esc(data.scanTime)}</p>
    <div style="background:${panelBg};border-radius:12px;padding:14px 16px;font-size:14px;color:${panelInk};margin-bottom:24px">${esc(data.reason)}</div>
    ${button(data.dashboardUrl, "Open dashboard")}
  `;
  const text = `${subject}\n${data.reason}\n\nDashboard: ${data.dashboardUrl}`;
  return { subject, html: shell(inner), text };
}

// ---------- Paid-plan renewal reminder (billing sweep) ----------

export interface RenewalReminderData {
  /** "Pro" or "Agency". */
  planName: string;
  /** Days until the current period ends (>= 0). */
  daysLeft: number;
  /** Human date the period ends, e.g. "August 16, 2026". */
  renewsOn: string;
  priceMonthlyUsd: number;
  /** True when the subscription is set to cancel instead of renew. */
  cancelAtPeriodEnd: boolean;
  billingUrl: string;
}

export function renewalReminderEmail(data: RenewalReminderData): {
  subject: string;
  html: string;
  text: string;
} {
  const inDays =
    data.daysLeft <= 0
      ? "today"
      : data.daysLeft === 1
        ? "tomorrow"
        : `in ${data.daysLeft} days`;
  const subject = data.cancelAtPeriodEnd
    ? `Your MyKavo ${data.planName} access ends ${inDays} - renew now`
    : `Your MyKavo ${data.planName} plan renews ${inDays}`;
  const lead = data.cancelAtPeriodEnd
    ? `Your MyKavo subscription is about to expire - ${data.planName} access ends on ${data.renewsOn}. Renew now to keep daily scans, alerts and your full monitoring history.`
    : `Heads up: your MyKavo ${data.planName} plan renews on ${data.renewsOn} for $${data.priceMonthlyUsd}. No action needed - this is just a reminder so the charge never surprises you.`;
  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${data.cancelAtPeriodEnd ? "#e5484d" : "#8a8a7a"}">${data.cancelAtPeriodEnd ? "Subscription expiring" : "Upcoming renewal"}</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${data.cancelAtPeriodEnd ? `${esc(data.planName)} access ends ${esc(inDays)}` : `${esc(data.planName)} renews ${esc(inDays)}`}</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(lead)}</p>
    ${button(data.billingUrl, data.cancelAtPeriodEnd ? "Renew in Billing" : "Manage billing")}
    <p style="margin:20px 0 0;font-size:12px;color:#8a8f9c">You can change or cancel your plan anytime from the Billing page.</p>
  `;
  const text =
    `${subject}\n\n${lead}\n\nBilling: ${data.billingUrl}`;
  return { subject, html: shell(inner), text };
}

// ---------- Welcome (sent once, when an account is created) ----------

export interface WelcomeEmailData {
  /**
   * What to call them. May be empty, junk, or an address handle - whatever
   * was stored at signup - so the caller passes it through
   * displayPersonName() first and this template only decides whether to use
   * it or fall back to a greeting with no name in it.
   */
  name: string;
  /** Absolute link to the add-website wizard. */
  addWebsiteUrl: string;
  /** Absolute link to notification settings, where email alerts are switched on. */
  alertsUrl: string;
  /** Absolute link to the docs, for the "how it works" line. */
  docsUrl: string;
}

/**
 * The one email a new account gets, immediately after it is created.
 *
 * Written around the first-run loop rather than around the feature list (see
 * docs/FIRST_RUN.md): the job of this email is to get somebody to add one
 * website, because an account with no website is not a user yet. Listing the
 * audit, Search Console and everything else here would recreate, in the
 * inbox, exactly the eight-entry-points problem the app was just fixed for.
 *
 * Sent on ACCOUNT CREATION, not on sign-in - a "welcome back" on every login
 * is the fastest way into somebody's spam filter.
 *
 * It also says where alerts will go. Email alerts are on by default, to
 * this address (EMAIL_ALERTS_ON_BY_DEFAULT in @mykavo/shared), so the reader
 * should know to expect them - and where the switch is if they would rather
 * route them to a teammate, Slack, or nowhere.
 */
export function welcomeEmail(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Welcome to MyKavo - start monitoring your website";
  const first = data.name.trim().split(/\s+/)[0] ?? "";
  const greeting = first ? `Welcome, ${esc(first)}` : "Welcome to MyKavo";
  const greetingText = first ? `Welcome, ${first}` : "Welcome to MyKavo";

  const steps: [string, string][] = [
    ["Add a website", "MyKavo finds your pages from robots.txt and your sitemap."],
    ["Approve the baseline", "The first scan records the known-good state of every page you pick."],
    [
      "Get told when it changes",
      "Every scan after that is compared against that baseline. You hear from us only when something matters.",
    ],
  ];

  const stepsHtml = steps
    .map(
      ([title, body], i) => `
    <tr>
      <td style="padding:0 12px 14px 0;vertical-align:top;width:26px">
        <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:9999px;background:#eaeefe;color:#3556f4;font-size:12px;font-weight:600">${i + 1}</span>
      </td>
      <td style="padding:0 0 14px;vertical-align:top">
        <p style="margin:0 0 2px;font-size:14px;font-weight:600">${esc(title)}</p>
        <p style="margin:0;font-size:13px;color:#5c6270">${esc(body)}</p>
      </td>
    </tr>`,
    )
    .join("");

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Welcome aboard</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${greeting}</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#5c6270">Your account is ready. MyKavo watches the websites you care about and tells you when something important changes or breaks - so you hear it from us rather than from a client.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px">${stepsHtml}</table>
    ${button(data.addWebsiteUrl, "Add your first website")}
    <p style="margin:22px 0 0;font-size:13px;color:#5c6270">Adding a website starts its baseline scan straight away - you will see the first results in a couple of minutes. <a href="${esc(data.docsUrl)}" style="color:#3556f4;text-decoration:none">How MyKavo works</a></p>
    <div style="margin:22px 0 0;background:#f4f6fb;border-radius:12px;padding:14px 16px">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600">Alerts come to this address</p>
      <p style="margin:0;font-size:13px;color:#5c6270">When MyKavo finds a high or critical change, the alert lands here - one email per scan, never one per change. <a href="${esc(data.alertsUrl)}" style="color:#3556f4;text-decoration:none">Change where alerts go</a> to add a teammate or Slack, or switch email off.</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#9aa1b1">You are receiving this because an account was created with this address. Just reply if you get stuck - a real person reads it.</p>
  `;

  const text =
    `${greetingText}\n\n` +
    `Your account is ready. MyKavo watches the websites you care about and tells you when ` +
    `something important changes or breaks.\n\n` +
    steps.map(([title, body], i) => `${i + 1}. ${title} - ${body}`).join("\n") +
    `\n\nAdd your first website: ${data.addWebsiteUrl}\n\n` +
    `Adding a website starts its baseline scan straight away - you will see the first ` +
    `results in a couple of minutes.\n` +
    `How MyKavo works: ${data.docsUrl}\n\n` +
    `ALERTS COME TO THIS ADDRESS\n` +
    `When MyKavo finds a high or critical change, the alert lands here - one email per ` +
    `scan, never one per change. Change where alerts go (add a teammate or Slack, or ` +
    `switch email off):\n` +
    `${data.alertsUrl}\n\n` +
    `You are receiving this because an account was created with this address. ` +
    `Just reply if you get stuck - a real person reads it.`;

  return { subject, html: shell(inner), text };
}

// ---------- Activation: first website nudge ----------

export interface FirstWebsiteNudgeData {
  /** Already made presentable by the caller. May be empty. */
  name: string;
  addWebsiteUrl: string;
  docsUrl: string;
}

/** Subject line, exported because the worker de-duplicates on it. */
export const FIRST_WEBSITE_NUDGE_SUBJECT = "Your MyKavo account is ready - add your first website";

/**
 * Sent once, a day or more after signup, to an account that has not added a
 * website. An account with no website is not a user yet: MyKavo has nothing
 * to watch and so can never send the alert that shows what it is for.
 *
 * One reminder, and it says so. A sequence of "still there?" mails is how a
 * sending domain earns a spam-folder reputation that then swallows the real
 * alerts.
 */
export function firstWebsiteNudgeEmail(data: FirstWebsiteNudgeData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = FIRST_WEBSITE_NUDGE_SUBJECT;
  const first = data.name.trim().split(/\s+/)[0] ?? "";
  const hi = first ? `Hi ${esc(first)},` : "Hi,";
  const hiText = first ? `Hi ${first},` : "Hi,";

  const catches = [
    "A page that starts returning 404 or 500",
    "A noindex tag or canonical change that quietly drops you from Google",
    "An analytics or payment script that disappears after a deploy",
    "A signup or checkout button that goes missing",
  ];

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">One step left</p>
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:600;letter-spacing:-0.01em">Add your first website</h1>
    <p style="margin:0 0 14px;font-size:14px;color:#5c6270">${hi} your MyKavo account is set up, but it is not watching anything yet. Adding a website takes about a minute: paste the URL, pick the pages that matter, and MyKavo records a baseline. After that you hear from us only when something important changes, like:</p>
    <ul style="margin:0 0 22px;padding-left:18px;font-size:14px;color:#16181d">
      ${catches.map((c) => `<li style="margin:0 0 6px">${esc(c)}</li>`).join("")}
    </ul>
    ${button(data.addWebsiteUrl, "Add your first website")}
    <p style="margin:22px 0 0;font-size:13px;color:#5c6270">New to it? <a href="${esc(data.docsUrl)}" style="color:#3556f4;text-decoration:none">How MyKavo works</a> takes two minutes to read.</p>
    <p style="margin:16px 0 0;font-size:12px;color:#9aa1b1">This is the only reminder we will send. If something got in the way, just reply - a real person reads it.</p>
  `;

  const text =
    `${hiText} your MyKavo account is set up, but it is not watching anything yet.\n\n` +
    `Adding a website takes about a minute: paste the URL, pick the pages that matter, ` +
    `and MyKavo records a baseline. After that you hear from us only when something ` +
    `important changes, like:\n\n` +
    catches.map((c) => `- ${c}`).join("\n") +
    `\n\nAdd your first website: ${data.addWebsiteUrl}\n` +
    `How MyKavo works: ${data.docsUrl}\n\n` +
    `This is the only reminder we will send. If something got in the way, just reply - ` +
    `a real person reads it.`;

  return { subject, html: shell(inner), text };
}

// ---------- Activation: baseline ready ----------

export interface BaselineReadyData {
  websiteName: string;
  websiteHost: string;
  pagesScanned: number;
  /** Dashboard link to the website. */
  websiteUrl: string;
  /** e.g. "Tuesday, September 30" - null when no scan is scheduled. */
  nextScan: string | null;
  /** "daily" | "weekly" | ... - how often it is scanned. */
  frequency: string;
  /** Where alerts for this workspace go right now. */
  alertRecipients: string[];
  alertsUrl: string;
}

/** Every baseline-ready subject starts with this; the worker de-duplicates on it. */
export const BASELINE_READY_SUBJECT_PREFIX = "Baseline ready for";

/**
 * Sent once per website, when its first baseline scan finishes. Baseline
 * scans create no change events and so send no alert - which left people
 * adding a site, closing the tab, and never learning that it worked. This
 * closes that loop: what was captured, when MyKavo looks again, and where
 * the alert will land if something changes.
 */
export function baselineReadyEmail(data: BaselineReadyData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${BASELINE_READY_SUBJECT_PREFIX} ${data.websiteHost} - MyKavo is now watching`;
  const pagesWord = `${data.pagesScanned} page${data.pagesScanned === 1 ? "" : "s"}`;
  const recipients = data.alertRecipients.join(", ");

  const rows: [string, string][] = [
    ["Baseline", `${pagesWord} captured and approved`],
    ["Scans", data.nextScan ? `${data.frequency}, next on ${data.nextScan}` : data.frequency],
    ["Alerts go to", recipients],
  ];

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#1f9d55">Monitoring is on</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(data.websiteName)} has a baseline</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">MyKavo recorded the known-good state of ${esc(pagesWord)} on ${esc(data.websiteHost)}. Every scan from now on is compared against it, and you hear from us when something important changes.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) => `<tr>
        <td style="padding:9px 0;border-top:1px solid #e4e7ee;font-size:13px;color:#5c6270;width:120px;vertical-align:top">${esc(k)}</td>
        <td style="padding:9px 0;border-top:1px solid #e4e7ee;font-size:14px;font-weight:500">${esc(v)}</td>
      </tr>`,
        )
        .join("")}
    </table>
    ${button(data.websiteUrl, "See the baseline")}
    <p style="margin:22px 0 0;font-size:13px;color:#5c6270">Want alerts in Slack too, or somewhere else? <a href="${esc(data.alertsUrl)}" style="color:#3556f4;text-decoration:none">Change where alerts go</a>.</p>
  `;

  const text =
    `${data.websiteName} has a baseline - monitoring is on.\n\n` +
    `MyKavo recorded the known-good state of ${pagesWord} on ${data.websiteHost}. ` +
    `Every scan from now on is compared against it, and you hear from us when something ` +
    `important changes.\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nSee the baseline: ${data.websiteUrl}\n` +
    `Change where alerts go: ${data.alertsUrl}`;

  return { subject, html: shell(inner), text };
}

// ---------- Android app access approved ----------

export interface AppAccessApprovedData {
  /** Already made presentable by the caller. May be a fallback label. */
  name: string;
  /**
   * Absolute link to the dashboard download page, with the auto-start flag.
   * Signing in is required, so this lands on /login?next=... for a signed-out
   * reader and comes straight back here afterwards.
   */
  downloadUrl: string;
  /** The address the request was made with - the one they must sign in as. */
  email: string;
}

/**
 * "Your MyKavo Android app is ready."
 *
 * The one email in the app-access flow. It has a job beyond celebrating: it
 * has to say WHICH account to sign in with. Access is granted to an address,
 * and somebody who requested with a work address and then signs in with a
 * personal one sees no download and concludes the approval never happened.
 * So the address is printed, in the email, next to the button.
 */
export function appAccessApprovedEmail(data: AppAccessApprovedData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your MyKavo Android app is ready to download";
  const first = data.name.trim().split(/\s+/)[0] ?? "";
  const greeting = first ? `Good news, ${esc(first)}` : "Good news";
  const greetingText = first ? `Good news, ${first}` : "Good news";

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Android app approved</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${greeting} - your app is ready</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5c6270">MyKavo for Android is approved for your account. Open the link below and the download starts on its own, on your phone or your desktop.</p>
    ${button(data.downloadUrl, "Download the Android app")}
    <div style="margin:22px 0 0;background:#f4f6fb;border-radius:12px;padding:14px 16px">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600">Sign in with this address</p>
      <p style="margin:0;font-size:13px;color:#5c6270">The download is tied to <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${esc(data.email)}</span>. Signing in with a different address will not show it. From then on it also lives in your dashboard, under <strong>Android app</strong>.</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#9aa1b1">Android may warn you about installing outside the Play Store - that is expected while MyKavo is in review. Just reply if anything goes wrong; a real person reads it.</p>
  `;

  const text =
    `${greetingText} - your app is ready\n\n` +
    `MyKavo for Android is approved for your account. Open the link below and ` +
    `the download starts on its own, on your phone or your desktop.\n\n` +
    `${data.downloadUrl}\n\n` +
    `SIGN IN WITH THIS ADDRESS\n` +
    `The download is tied to ${data.email}. Signing in with a different address ` +
    `will not show it. From then on it also lives in your dashboard, under ` +
    `"Android app".\n\n` +
    `Android may warn you about installing outside the Play Store - that is ` +
    `expected while MyKavo is in review. Just reply if anything goes wrong; ` +
    `a real person reads it.`;

  return { subject, html: shell(inner), text };
}
