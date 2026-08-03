/**
 * Server-side E-E-A-T orchestration: SSRF-guarded page fetch, then resolve
 * the site-level aux signals (about/contact/privacy/terms) - links found on
 * the page short-circuit; anything unlinked gets ONE quick probe of the
 * conventional path. Shared by the public tool route and the dashboard page.
 */

import { safeFetch } from "@/lib/security/ssrf";
import {
  analyzeEeat,
  extractEeatFacts,
  EEAT_AUX_PATHS,
  type EeatAuxSignals,
  type EeatReport,
} from "./eeat";

async function probeExists(url: string): Promise<boolean> {
  try {
    const res = await safeFetch(url, { timeoutMs: 8000 });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

export async function runEeatAnalysis(url: string): Promise<EeatReport> {
  const fetched = await safeFetch(url);
  if (fetched.status >= 400) {
    throw new Error(`The page returned HTTP ${fetched.status} - fix that before analyzing E-E-A-T.`);
  }
  const finalUrl = fetched.finalUrl;
  const facts = extractEeatFacts(finalUrl, fetched.body);
  const origin = new URL(finalUrl).origin;

  const aux: EeatAuxSignals = { ...facts.linkedPages };
  const pending = (Object.keys(aux) as (keyof EeatAuxSignals)[]).filter((k) => !aux[k]);
  // Probe unlinked conventional paths concurrently (first candidate only -
  // second candidates checked only if the first misses).
  await Promise.all(
    pending.map(async (key) => {
      for (const path of EEAT_AUX_PATHS[key]) {
        if (await probeExists(`${origin}${path}`)) {
          aux[key] = true;
          return;
        }
      }
    }),
  );

  return analyzeEeat(finalUrl, fetched.body, aux);
}
