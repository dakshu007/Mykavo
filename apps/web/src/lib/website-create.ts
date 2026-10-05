import type { Website } from "@mykavo/database";
import { prisma } from "@mykavo/database";
import { assertCanAddWebsite, LimitError } from "@/lib/limits";
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

  try {
    await assertCanAddWebsite(workspaceId);
  } catch (err) {
    if (err instanceof LimitError) return { ok: false, reason: "LIMIT", error: err.message, code: err.code };
    throw err;
  }

  const normalized = normalizeUrl(parsed, { stripAllParams: true });
  const existing = await prisma.website.findUnique({
    where: { workspaceId_normalizedUrl: { workspaceId, normalizedUrl: normalized } },
  });
  if (existing) {
    return { ok: false, reason: "EXISTS", error: "This website is already in your workspace.", website: existing };
  }

  const website = await prisma.website.create({
    data: {
      workspaceId,
      name: input.name || parsed.hostname.replace(/^www\./, ""),
      url: parsed.href,
      normalizedUrl: normalized,
      status: "PENDING",
    },
  });
  logger.info("website added", { workspaceId, websiteId: website.id });
  return { ok: true, website };
}
