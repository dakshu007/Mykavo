import type { Website } from "@mykavo/database";
import { prisma, Prisma } from "@mykavo/database";
import { assertCanAddWebsite, getEffectiveWebsiteLimit, LimitError } from "@/lib/limits";
import { assertSafeUrl, UnsafeUrlError } from "@/lib/security/ssrf";
import { normalizeUrl, parseUrlInput } from "@/lib/url";
import { logger } from "@/lib/logger";

export type CreateWebsiteResult =
  | { ok: true; website: Website }
  | { ok: false; reason: "INVALID" | "DNS" | "UNSAFE" | "LIMIT"; error: string; code?: string }
  | { ok: false; reason: "EXISTS"; error: string; website: Website };

/**
 * Add a website to a workspace - the one implementation behind the
 * dashboard's Add website and the Chrome extension's Protect this website.
 * Validates the URL, runs the full SSRF check (DNS included), enforces the
 * plan's website limit and refuses duplicates. Callers own authentication,
 * role checks and rate limiting.
 */
export async function createWebsite(
  workspaceId: string,
  input: { url: string; name?: string },
): Promise<CreateWebsiteResult> {
  const parsed = parseUrlInput(input.url);
  if (!parsed) return { ok: false, reason: "INVALID", error: "That doesn't look like a valid URL." };

  try {
    await assertSafeUrl(parsed.href);
  } catch (err) {
    return err instanceof UnsafeUrlError && err.code === "DNS_FAILURE"
      ? { ok: false, reason: "DNS", error: "We couldn't resolve that hostname. Check the spelling and try again." }
      : { ok: false, reason: "UNSAFE", error: "This URL can't be monitored." };
  }

  // Fast path: a workspace already at its limit gets the plan's message
  // without opening a transaction.
  const limitFailure = await checkWebsiteLimit(workspaceId);
  if (limitFailure) return limitFailure;
  const limit = await getEffectiveWebsiteLimit(workspaceId);

  const normalized = normalizeUrl(parsed, { stripAllParams: true });
  const name = input.name || parsed.hostname.replace(/^www\./, "");

  // Check and create under one per-workspace lock: parallel requests used to
  // all pass the count before any of them inserted, so a Free workspace
  // could end up with several websites. The count is re-read inside the
  // lock, on the transaction's own connection (no pool connection is needed
  // while the lock is held).
  let outcome: { kind: "created"; website: Website } | { kind: "exists"; website: Website } | { kind: "limit" };
  try {
    outcome = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`website-create:${workspaceId}`})::int8)`;
      const existing = await tx.website.findUnique({
        where: { workspaceId_normalizedUrl: { workspaceId, normalizedUrl: normalized } },
      });
      if (existing) return { kind: "exists" as const, website: existing };
      if (limit !== Infinity) {
        const count = await tx.website.count({ where: { workspaceId } });
        if (count >= limit) return { kind: "limit" as const };
      }
      const website = await tx.website.create({
        data: { workspaceId, name, url: parsed.href, normalizedUrl: normalized, status: "PENDING" },
      });
      return { kind: "created" as const, website };
    });
  } catch (err) {
    // A concurrent insert of the same URL that slipped past the lock (it
    // never should) still lands on the unique index.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.website.findUnique({
        where: { workspaceId_normalizedUrl: { workspaceId, normalizedUrl: normalized } },
      });
      if (existing) {
        return { ok: false, reason: "EXISTS", error: "This website is already in your workspace.", website: existing };
      }
    }
    throw err;
  }

  if (outcome.kind === "exists") {
    return {
      ok: false,
      reason: "EXISTS",
      error: "This website is already in your workspace.",
      website: outcome.website,
    };
  }
  if (outcome.kind === "limit") {
    // Re-run the plan check for its upgrade message; the website that won
    // the race is committed, so it now fails.
    return (
      (await checkWebsiteLimit(workspaceId)) ?? {
        ok: false,
        reason: "LIMIT",
        error: "Your plan's website limit is reached.",
        code: "WEBSITE_LIMIT",
      }
    );
  }

  const website = outcome.website;
  logger.info("website added", { workspaceId, websiteId: website.id });
  return { ok: true, website };
}

/** The LIMIT result when the workspace can't add a website, else null. */
async function checkWebsiteLimit(workspaceId: string): Promise<CreateWebsiteResult | null> {
  try {
    await assertCanAddWebsite(workspaceId);
    return null;
  } catch (err) {
    if (err instanceof LimitError) return { ok: false, reason: "LIMIT", error: err.message, code: err.code };
    throw err;
  }
}
