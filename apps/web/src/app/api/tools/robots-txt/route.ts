import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import {
  isAllowed,
  parseRobotsTxt,
  ROBOTS_TEST_AGENTS,
  robotsPath,
  robotsStatusEffect,
  robotsTxtUrl,
  type RobotsTxtReport,
} from "@/lib/tools/robots-txt";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/** Shown in the results; a real robots.txt is a few KB, this is plenty. */
const MAX_LINES = 400;

export async function POST(request: Request) {
  const limit = rateLimit(`robots-txt:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
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

  const page = parseUrlInput(input.url);
  if (!page) {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  try {
    const robotsUrl = robotsTxtUrl(page);
    const fetched = await safeFetch(robotsUrl, { maxBytes: 512 * 1024 });
    const effect = robotsStatusEffect(fetched.status);
    const text = effect === "parse" ? fetched.body : "";
    const parsed = parseRobotsTxt(text);
    const path = robotsPath(page);

    const results = ROBOTS_TEST_AGENTS.map((a) => {
      if (effect !== "parse") {
        return { agent: a.label, owner: a.owner, allowed: effect === "allow-all", rule: null, line: null, group: null };
      }
      const v = isAllowed(parsed, a.token, path);
      return {
        agent: a.label,
        owner: a.owner,
        allowed: v.allowed,
        rule: v.rule ? `${v.rule.type === "allow" ? "Allow" : "Disallow"}: ${v.rule.path}` : null,
        line: v.rule?.line ?? null,
        group: v.matchedAgent,
      };
    });

    const warnings: string[] = [];
    if (effect === "allow-all") {
      warnings.push(`robots.txt returned HTTP ${fetched.status}, so crawlers treat the whole site as allowed.`);
    }
    if (effect === "disallow-all") {
      warnings.push(
        `robots.txt returned HTTP ${fetched.status}. Google treats a server error here as "block everything" until it recovers.`,
      );
    }
    if (effect === "parse") {
      if (isAllowed(parsed, "Googlebot", "/").allowed === false) {
        warnings.push("Googlebot is blocked from the homepage (Disallow: /). The whole site may drop out of Google.");
      }
      for (const asset of ["/wp-includes/js/jquery/jquery.min.js", "/assets/app.css", "/static/main.js"]) {
        if (!isAllowed(parsed, "Googlebot", asset).allowed && isAllowed(parsed, "Googlebot", "/").allowed) {
          warnings.push("CSS or JavaScript appears to be blocked for Googlebot, which stops Google rendering your pages properly.");
          break;
        }
      }
      if (parsed.sitemaps.length === 0) warnings.push("No Sitemap: line. Adding one helps crawlers find your pages.");
    }

    const allLines = text.split(/\r\n|\r|\n/);
    const report: RobotsTxtReport = {
      testedUrl: page.href,
      robotsUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      effect,
      results,
      sitemaps: parsed.sitemaps.slice(0, 20),
      warnings,
      lines: allLines.slice(0, MAX_LINES),
      truncated: allLines.length > MAX_LINES,
    };
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[robots-txt] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong reading that robots.txt. Please try again." }, { status: 500 });
  }
}
