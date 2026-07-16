/**
 * Site-health sweep (uptime + SSL expiry). Runs on a pg-boss cron every
 * HEALTH_CRON (default 5 minutes): one plain GET per ACTIVE website — no
 * Playwright — recording the result and driving the incident state machine
 * in @mykavo/shared. Alerts go through email and the workspace's chat
 * channels. Framed as site health inside change monitoring, not a
 * standalone uptime product (spec §1).
 */

import { connect as tlsConnect } from "node:tls";
import { prisma } from "@mykavo/database";
import {
  recordHealthCheck,
  getLatestHealthCheck,
  findOpenHealthIncident,
  openHealthIncident,
  resolveHealthIncident,
  markHealthIncidentNotified,
} from "@mykavo/database";
import {
  isHttpUp,
  decideDownIncident,
  decideSslIncident,
  daysUntil,
  shouldRenotify,
  formatDowntime,
} from "@mykavo/shared";
import {
  sendEmail,
  downAlertEmail,
  recoveryAlertEmail,
  sslExpiryAlertEmail,
} from "@mykavo/email";
import { resolveEmailConfig, fanOutToChannels } from "./notify";
import { logger } from "./logger";

const PROBE_TIMEOUT_MS = 10_000;
const SWEEP_CONCURRENCY = 5;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyKavoBot/0.1; +https://mykavo.app/bot) site health check";

const dashboardBase = process.env.APP_URL ?? "http://localhost:3000";

interface HealthWebsite {
  id: string;
  name: string;
  url: string;
  workspaceId: string;
  muteAlertsUntil: Date | null;
}

interface ProbeResult {
  up: boolean;
  httpStatus: number | null;
  responseTimeMs: number | null;
  errorCode: string | null;
}

/** One availability probe: GET the homepage, following redirects. */
async function probe(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT },
    });
    const responseTimeMs = Date.now() - started;
    res.body?.cancel().catch(() => undefined);
    return {
      up: isHttpUp(res.status),
      httpStatus: res.status,
      responseTimeMs,
      errorCode: isHttpUp(res.status) ? null : `HTTP_${res.status}`,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      up: false,
      httpStatus: null,
      responseTimeMs: null,
      errorCode: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Certificate expiry for an https host; null for http or on any failure. */
function probeSslValidTo(url: string): Promise<Date | null> {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return Promise.resolve(null);
    host = u.hostname;
  } catch {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const socket = tlsConnect({ host, port: 443, servername: host, timeout: PROBE_TIMEOUT_MS });
    const done = (value: Date | null) => {
      socket.destroy();
      resolve(value);
    };
    socket.on("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const validTo = cert && typeof cert.valid_to === "string" ? new Date(cert.valid_to) : null;
      done(validTo && !Number.isNaN(validTo.getTime()) ? validTo : null);
    });
    socket.on("timeout", () => done(null));
    socket.on("error", () => done(null));
  });
}

function describeFailure(result: ProbeResult): string {
  if (result.errorCode === "TIMEOUT") return "request timed out";
  if (result.errorCode === "NETWORK_ERROR") return "connection failed";
  return result.httpStatus !== null ? `HTTP ${result.httpStatus}` : "no response";
}

async function alertHealth(
  website: HealthWebsite,
  email: { subject: string; html: string; text: string },
  channelTitle: string,
  channelLines: string[],
  severity: string,
): Promise<void> {
  // Maintenance window (spec §25): incidents are still recorded by the
  // callers — just don't send anything (no emails, channels, or rows).
  if (website.muteAlertsUntil && website.muteAlertsUntil > new Date()) {
    logger.info("alerts muted, skipped", {
      websiteId: website.id,
      workspaceId: website.workspaceId,
      muteAlertsUntil: website.muteAlertsUntil.toISOString(),
    });
    return;
  }
  const dashboardUrl = `${dashboardBase}/dashboard/websites/${website.id}`;
  const config = await resolveEmailConfig(website.workspaceId);
  if (config?.failureAlerts) {
    const result = await sendEmail({
      to: config.recipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    await prisma.notification.create({
      data: {
        workspaceId: website.workspaceId,
        websiteId: website.id,
        channelType: "EMAIL",
        recipient: config.recipients.join(", "),
        subject: email.subject,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });
  }
  await fanOutToChannels(website.workspaceId, website.id, null, {
    title: channelTitle,
    lines: channelLines,
    url: dashboardUrl,
    severity,
  });
}

/** Check one website: probe, record, run incident machines, alert. */
async function checkWebsite(website: HealthWebsite): Promise<void> {
  const host = (() => {
    try {
      return new URL(website.url).hostname;
    } catch {
      return website.url;
    }
  })();
  const dashboardUrl = `${dashboardBase}/dashboard/websites/${website.id}`;
  const now = new Date();

  const previous = await getLatestHealthCheck(prisma, website.id);
  const [result, sslValidTo] = await Promise.all([
    probe(website.url),
    probeSslValidTo(website.url),
  ]);
  await recordHealthCheck(prisma, {
    websiteId: website.id,
    up: result.up,
    httpStatus: result.httpStatus,
    responseTimeMs: result.responseTimeMs,
    sslValidTo,
    errorCode: result.errorCode,
  });

  // --- DOWN incident machine ---
  const openDown = await findOpenHealthIncident(prisma, website.id, "DOWN");
  const downAction = decideDownIncident({
    currentUp: result.up,
    previousUp: previous?.up ?? null,
    hasOpenIncident: openDown !== null,
  });

  if (downAction === "open") {
    const reason = describeFailure(result);
    const incident = await openHealthIncident(prisma, {
      websiteId: website.id,
      kind: "DOWN",
      detail: reason,
    });
    const downFor = "10+ minutes"; // two consecutive 5-minute checks
    await alertHealth(
      website,
      downAlertEmail({ websiteName: website.name, websiteHost: host, reason, downFor, dashboardUrl }),
      `🔴 ${host} appears DOWN`,
      [`${reason} for ${downFor}`, `Checked ${now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`],
      "CRITICAL",
    );
    await markHealthIncidentNotified(prisma, incident.id, now);
    logger.info("down incident opened", { websiteId: website.id, workspaceId: website.workspaceId, reason });
  } else if (downAction === "resolve" && openDown) {
    await resolveHealthIncident(prisma, openDown.id, now);
    const downFor = formatDowntime(now.getTime() - openDown.openedAt.getTime());
    await alertHealth(
      website,
      recoveryAlertEmail({ websiteName: website.name, websiteHost: host, downFor, dashboardUrl }),
      `✅ ${host} recovered`,
      [`Back up after ${downFor} of downtime.`],
      "INFO",
    );
    logger.info("down incident resolved", { websiteId: website.id, workspaceId: website.workspaceId, downFor });
  } else if (!result.up && openDown && shouldRenotify(openDown.lastNotifiedAt, now)) {
    // Still down 24h+ after the last alert — remind once a day.
    const reason = describeFailure(result);
    const downFor = formatDowntime(now.getTime() - openDown.openedAt.getTime());
    await alertHealth(
      website,
      downAlertEmail({ websiteName: website.name, websiteHost: host, reason, downFor, dashboardUrl }),
      `🔴 ${host} is still DOWN`,
      [`${reason} for ${downFor}`],
      "CRITICAL",
    );
    await markHealthIncidentNotified(prisma, openDown.id, now);
  }

  // --- SSL_EXPIRING incident machine ---
  const openSsl = await findOpenHealthIncident(prisma, website.id, "SSL_EXPIRING");
  const sslAction = decideSslIncident({ sslValidTo, hasOpenIncident: openSsl !== null, now });

  if (sslAction === "open" && sslValidTo) {
    const daysLeft = daysUntil(sslValidTo, now);
    const expiresOn = sslValidTo.toLocaleDateString("en-US", { dateStyle: "medium" });
    const detail = `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${expiresOn})`;
    const incident = await openHealthIncident(prisma, {
      websiteId: website.id,
      kind: "SSL_EXPIRING",
      detail,
    });
    await alertHealth(
      website,
      sslExpiryAlertEmail({ websiteName: website.name, websiteHost: host, daysLeft, expiresOn, dashboardUrl }),
      `⚠️ SSL certificate for ${host} ${daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`,
      [`Valid until ${expiresOn}. Renew it before visitors see browser warnings.`],
      daysLeft <= 3 ? "CRITICAL" : "HIGH",
    );
    await markHealthIncidentNotified(prisma, incident.id, now);
    logger.info("ssl incident opened", { websiteId: website.id, workspaceId: website.workspaceId, daysLeft });
  } else if (sslAction === "resolve" && openSsl) {
    await resolveHealthIncident(prisma, openSsl.id, now);
    logger.info("ssl incident resolved (certificate renewed)", {
      websiteId: website.id,
      workspaceId: website.workspaceId,
    });
  } else if (openSsl && sslValidTo && shouldRenotify(openSsl.lastNotifiedAt, now)) {
    // Still expiring — daily reminder with the updated countdown.
    const daysLeft = daysUntil(sslValidTo, now);
    const expiresOn = sslValidTo.toLocaleDateString("en-US", { dateStyle: "medium" });
    await alertHealth(
      website,
      sslExpiryAlertEmail({ websiteName: website.name, websiteHost: host, daysLeft, expiresOn, dashboardUrl }),
      `⚠️ SSL certificate for ${host} ${daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`,
      [`Valid until ${expiresOn}.`],
      daysLeft <= 3 ? "CRITICAL" : "HIGH",
    );
    await markHealthIncidentNotified(prisma, openSsl.id, now, `expires in ${daysLeft} days (${expiresOn})`);
  }
}

/** Sweep every ACTIVE website with bounded concurrency. Never throws. */
export async function runHealthSweep(): Promise<void> {
  const websites = await prisma.website.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, url: true, workspaceId: true, muteAlertsUntil: true },
  });
  if (websites.length === 0) return;

  let cursor = 0;
  let failures = 0;
  const workers = Array.from({ length: Math.min(SWEEP_CONCURRENCY, websites.length) }, async () => {
    while (cursor < websites.length) {
      const website = websites[cursor++];
      try {
        await checkWebsite(website);
      } catch (err) {
        failures++;
        logger.error("health check failed", { websiteId: website.id }, err as Error);
      }
    }
  });
  await Promise.all(workers);
  logger.info("health sweep finished", { websites: websites.length, failures });
}
