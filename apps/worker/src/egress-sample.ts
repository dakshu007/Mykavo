/**
 * Records the database server's outbound network counter once an hour, so the
 * admin usage page can show how much egress this billing cycle has used.
 *
 * Supabase bills egress but offers no API that returns the figure. Its Metrics
 * API (Prometheus text) does expose node_network_transmit_bytes_total - the
 * bytes the database server has sent - as a counter since the server started.
 * One reading an hour, differenced on the usage page, gives usage per day and
 * per cycle. It is an estimate: Supabase meters egress its own way (the
 * shared pooler, for one, is counted on its side), so the page says so.
 *
 * Needs SUPABASE_METRICS_KEY (a secret API key, sb_secret_..., or the legacy
 * service_role key). The project ref comes from SUPABASE_PROJECT_REF, or from
 * the pooler user in DATABASE_URL ("postgres.<ref>"). Without a key it does
 * nothing. Several worker processes may each sample; duplicate readings add
 * nothing, because only differences count.
 */

import { prisma } from "@mykavo/database";
import { EGRESS_METRIC, projectRefFromDatabaseUrl, transmitBytesFromMetrics } from "@mykavo/shared";
import { logger } from "./logger";

const INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_MS = 60 * 1000;
const TIMEOUT_MS = 20_000;
const KEEP_DAYS = 120;

async function sampleOnce(ref: string, key: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://${ref}.supabase.co/customer/v1/privileged/metrics`, {
      headers: { authorization: `Basic ${Buffer.from(`service_role:${key}`).toString("base64")}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      await res.body?.cancel();
      logger.warn("egress sample: metrics endpoint refused", { status: res.status });
      return;
    }
    const bytes = transmitBytesFromMetrics(await res.text());
    if (bytes === null) {
      logger.warn("egress sample: node_network_transmit_bytes_total not in the metrics");
      return;
    }
    await prisma.usageSample.create({ data: { metric: EGRESS_METRIC, value: bytes } });
    await prisma.usageSample.deleteMany({
      where: { metric: EGRESS_METRIC, sampledAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } },
    });
  } catch (err) {
    logger.warn("egress sample failed", { error: err instanceof Error ? err.message : String(err) });
  } finally {
    clearTimeout(timer);
  }
}

export function startEgressSampler(): () => void {
  const key = process.env.SUPABASE_METRICS_KEY;
  const ref = process.env.SUPABASE_PROJECT_REF || projectRefFromDatabaseUrl(process.env.DATABASE_URL);
  if (!key || !ref) {
    logger.info("egress sampler off", { reason: key ? "no project ref" : "SUPABASE_METRICS_KEY not set" });
    return () => {};
  }
  const first = setTimeout(() => void sampleOnce(ref, key), FIRST_RUN_MS);
  const every = setInterval(() => void sampleOnce(ref, key), INTERVAL_MS);
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
