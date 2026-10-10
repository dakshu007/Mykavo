import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { buildNoindexReport, type NoindexReport } from "@/lib/tools/noindex";
import { isAllowed, parseRobotsTxt, robotsPath, robotsStatusEffect, robotsTxtUrl } from "@/lib/tools/robots-txt";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/** Can Googlebot crawl this URL at all? Failures are reported, never fatal. */
async function checkRobotsTxt(finalUrl: string): Promise<NoindexReport["robotsTxt"]> {
  const page = new URL(finalUrl);
  try {
    const res = await safeFetch(robotsTxtUrl(page), { timeoutMs: 6_000, maxBytes: 512 * 1024 });
    const effect = robotsStatusEffect(res.status);
    if (effect === "allow-all") {
      return { checked: true, status: res.status, blocked: false, rule: null, note: "No robots.txt file, so nothing is blocked." };
    }
    if (effect === "disallow-all") {
      return {
        checked: true,
        status: res.status,
        blocked: true,
        rule: null,
        note: `robots.txt returns HTTP ${res.status}. Google treats a server error here as "block everything" until it recovers.`,
      };
    }
    const verdict = isAllowed(parseRobotsTxt(res.body), "Googlebot", robotsPath(page));
    return {
      checked: true,
      status: res.status,
      blocked: !verdict.allowed,
      rule: verdict.rule ? `${verdict.rule.type === "allow" ? "Allow" : "Disallow"}: ${verdict.rule.path}` : null,
      note: null,
    };
  } catch {
    return { checked: false, status: null, blocked: false, rule: null, note: "We couldn't fetch robots.txt for this site." };
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`noindex:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
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
    const robotsTxt = await checkRobotsTxt(fetched.finalUrl);
    const report = buildNoindexReport({
      url: parsed.href,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      redirectCount: fetched.redirectChain.length,
      html: fetched.body,
      xRobotsTag: fetched.headers.get("x-robots-tag"),
      robotsTxt,
    });
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[noindex] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong checking that page. Please try again." }, { status: 500 });
  }
}
