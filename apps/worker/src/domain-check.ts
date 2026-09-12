/**
 * Weekly RDAP sweep: when does each monitored domain expire?
 *
 * Registrations change once a year, so this is deliberately slow and cheap -
 * a weekly pass, one domain at a time, sharing results between websites that
 * happen to sit on the same registrable domain.
 */

import { prisma, type Prisma } from "@mykavo/database";
import {
  registrableDomain,
  rdapUrl,
  parseRdap,
  safeFetch,
  UnsafeUrlError,
} from "@mykavo/shared";
import { logger } from "./logger";

/** Re-check a domain no more often than this. */
const REFRESH_AFTER_DAYS = 7;
/** Politeness gap between registry lookups. */
const DELAY_MS = 1_000;
/** Cap per sweep, so one run can never become an unbounded crawl. */
const MAX_PER_SWEEP = 200;

export type DomainLookupError =
  | "NO_REGISTRABLE_DOMAIN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNSUPPORTED_TLD"
  | "LOOKUP_FAILED"
  | "BLOCKED_URL";

interface LookupResult {
  expiresAt: Date | null;
  registrar: string | null;
  statuses: string[];
  error: DomainLookupError | null;
}

/** One RDAP lookup. Never throws - every failure becomes a structured code. */
export async function lookupDomain(hostname: string): Promise<LookupResult> {
  const empty = { expiresAt: null, registrar: null, statuses: [] };
  const domain = registrableDomain(hostname);
  if (!domain) return { ...empty, error: "NO_REGISTRABLE_DOMAIN" };

  try {
    // Through safeFetch like every other outbound request: rdap.org redirects
    // to registry servers we do not control, so the destination must be
    // revalidated at each hop (spec §11).
    // No Accept header: safeFetch deliberately exposes a narrow option set,
    // and rdap.org serves JSON by default. Not worth widening the SSRF-facing
    // surface for a content type we already get.
    const result = await safeFetch(rdapUrl(domain), {
      timeoutMs: 10_000,
      maxBytes: 512 * 1024,
    });

    if (result.status === 404) return { ...empty, error: "NOT_FOUND" };
    if (result.status === 429) return { ...empty, error: "RATE_LIMITED" };
    // Several ccTLDs run no public RDAP service at all. That is a fact about
    // the registry, not a fault, and must not be retried every week as an error.
    if (result.status === 400 || result.status === 501) {
      return { ...empty, error: "UNSUPPORTED_TLD" };
    }
    if (result.status < 200 || result.status >= 300) {
      return { ...empty, error: "LOOKUP_FAILED" };
    }

    const parsed = parseRdap(domain, JSON.parse(result.body));
    return {
      expiresAt: parsed.expiresAt,
      registrar: parsed.registrar,
      statuses: parsed.statuses,
      error: null,
    };
  } catch (err) {
    if (err instanceof UnsafeUrlError) return { ...empty, error: "BLOCKED_URL" };
    return { ...empty, error: "LOOKUP_FAILED" };
  }
}

/**
 * Check every website whose domain has not been looked up recently.
 *
 * Websites are grouped by registrable domain so an agency monitoring six sites
 * on one domain costs one request, not six.
 */
export async function runDomainSweep(): Promise<void> {
  const staleBefore = new Date(Date.now() - REFRESH_AFTER_DAYS * 86_400_000);

  const websites = await prisma.website.findMany({
    where: {
      status: { notIn: ["PAUSED", "ERROR"] },
      OR: [{ domainCheckedAt: null }, { domainCheckedAt: { lt: staleBefore } }],
    },
    select: { id: true, url: true },
    take: MAX_PER_SWEEP,
    orderBy: { domainCheckedAt: { sort: "asc", nulls: "first" } },
  });

  if (websites.length === 0) return;

  // Group first: one lookup serves every website on the same domain.
  const byDomain = new Map<string, string[]>();
  const unresolvable: string[] = [];
  for (const site of websites) {
    let host: string;
    try {
      host = new URL(site.url).hostname;
    } catch {
      unresolvable.push(site.id);
      continue;
    }
    const domain = registrableDomain(host);
    if (!domain) {
      unresolvable.push(site.id);
      continue;
    }
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), site.id]);
  }

  if (unresolvable.length > 0) {
    await prisma.website.updateMany({
      where: { id: { in: unresolvable } },
      data: { domainCheckedAt: new Date(), domainLookupError: "NO_REGISTRABLE_DOMAIN" },
    });
  }

  let resolved = 0;
  let failed = 0;
  for (const [domain, websiteIds] of byDomain) {
    const result = await lookupDomain(domain);
    if (result.error) failed++;
    else resolved++;

    await prisma.website.updateMany({
      where: { id: { in: websiteIds } },
      data: {
        domainName: domain,
        // Only overwrite the facts on success: a rate-limited week must not
        // erase a date we already knew and replace it with silence.
        ...(result.error
          ? {}
          : {
              domainExpiresAt: result.expiresAt,
              domainRegistrar: result.registrar,
              domainStatuses: result.statuses as unknown as Prisma.InputJsonValue,
            }),
        domainCheckedAt: new Date(),
        domainLookupError: result.error,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  logger.info("domain sweep finished", {
    domains: byDomain.size,
    websites: websites.length,
    resolved,
    failed,
    unresolvable: unresolvable.length,
  });
}
