import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { mapWithConcurrency } from "@/lib/tools/status-check";
import { appliesToGoogle, extractRobotsMetas, hasNoindex, parseXRobotsTag, readCanonical } from "@/lib/tools/noindex";
import {
  checkHreflangCode,
  extractHreflangLinks,
  MAX_ALTERNATES_FETCHED,
  pageLevelIssues,
  parseLinkHeaderHreflang,
  sameUrl,
  type AlternateCheck,
  type HreflangLink,
  type HreflangReport,
} from "@/lib/tools/hreflang";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

function resolve(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Fetch one alternate and check it links back, is indexable and self-canonical. */
async function checkAlternate(
  link: HreflangLink,
  origin: { requested: string; final: string; status: number },
): Promise<AlternateCheck> {
  const base: AlternateCheck = {
    hreflang: link.hreflang,
    href: link.href,
    code: checkHreflangCode(link.hreflang),
    self: false,
    fetched: false,
    status: null,
    finalUrl: null,
    redirected: false,
    returnLink: null,
    noindex: null,
    canonicalElsewhere: null,
    error: null,
  };
  const target = resolve(link.href, origin.final);
  if (!target) return { ...base, error: "Not a valid http(s) URL." };
  // The self-reference is the page we already have - no second fetch.
  if (sameUrl(target, origin.final) || sameUrl(target, origin.requested)) {
    return { ...base, self: true, status: origin.status, finalUrl: origin.final, returnLink: true };
  }
  try {
    const res = await safeFetch(target, { timeoutMs: 8_000 });
    const links = [...extractHreflangLinks(res.body), ...parseLinkHeaderHreflang(res.headers.get("link"))];
    const returnLink = links.some((l) => {
      const u = resolve(l.href, res.finalUrl);
      return u !== null && (sameUrl(u, origin.final) || sameUrl(u, origin.requested));
    });
    const sources = [...extractRobotsMetas(res.body), ...parseXRobotsTag(res.headers.get("x-robots-tag"))];
    const canonical = readCanonical(res.body);
    const canonicalUrl = canonical ? resolve(canonical, res.finalUrl) : null;
    return {
      ...base,
      fetched: true,
      status: res.status,
      finalUrl: res.finalUrl,
      redirected: res.redirectChain.length > 0,
      returnLink,
      noindex: sources.some((s) => appliesToGoogle(s) && hasNoindex(s.value)),
      canonicalElsewhere: canonicalUrl !== null && !sameUrl(canonicalUrl, res.finalUrl),
    };
  } catch (err) {
    return {
      ...base,
      fetched: true,
      error: err instanceof UnsafeUrlError ? SAFE_FETCH_USER_MESSAGES[err.code] : "Couldn't fetch this URL.",
    };
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`hreflang:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests - please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Please enter a URL." }, { status: 400 });
  }

  const parsed = parseUrlInput(input.url);
  if (!parsed) {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  try {
    const fetched = await safeFetch(parsed.href);
    const all = [...extractHreflangLinks(fetched.body), ...parseLinkHeaderHreflang(fetched.headers.get("link"))];
    // The same code + URL from both the HTML and the header is one entry.
    const unique = all.filter(
      (l, i) => all.findIndex((o) => o.hreflang.toLowerCase() === l.hreflang.toLowerCase() && o.href === l.href) === i,
    );
    const { issues, notes } = pageLevelIssues(unique, fetched.finalUrl);

    const origin = { requested: parsed.href, final: fetched.finalUrl, status: fetched.status };
    const toFetch = unique.slice(0, MAX_ALTERNATES_FETCHED);
    const checked = await mapWithConcurrency(toFetch, 4, (l) => checkAlternate(l, origin));
    const rest: AlternateCheck[] = unique.slice(MAX_ALTERNATES_FETCHED).map((l) => ({
      hreflang: l.hreflang,
      href: l.href,
      code: checkHreflangCode(l.hreflang),
      self: false,
      fetched: false,
      status: null,
      finalUrl: null,
      redirected: false,
      returnLink: null,
      noindex: null,
      canonicalElsewhere: null,
      error: null,
    }));

    for (const a of checked) {
      if (a.returnLink === false) issues.push(`${a.href} (${a.hreflang}) doesn't link back to this page.`);
      if (a.status !== null && (a.status < 200 || a.status >= 300)) issues.push(`${a.href} (${a.hreflang}) returns HTTP ${a.status}.`);
      if (a.noindex) issues.push(`${a.href} (${a.hreflang}) is noindex, so it can't appear in search.`);
      if (a.canonicalElsewhere) issues.push(`${a.href} (${a.hreflang}) has a canonical pointing to a different URL.`);
    }

    const report: HreflangReport = {
      url: parsed.href,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      alternates: [...checked, ...rest],
      issues,
      notes,
      unfetchedCount: rest.length,
    };
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[hreflang] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong checking that page. Please try again." }, { status: 500 });
  }
}
