import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import {
  detectPlugins,
  detectThemes,
  detectWordPressSignals,
  parseThemeHeader,
  type DetectedTheme,
  type ThemeHeader,
  type WordPressReport,
} from "@/lib/tools/wordpress-detect";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/** Read a theme's style.css header. A missing or blocked stylesheet is fine. */
async function readHeader(stylesheetUrl: string): Promise<ThemeHeader | null> {
  try {
    const res = await safeFetch(stylesheetUrl, { timeoutMs: 6_000, maxBytes: 256 * 1024 });
    return res.status >= 200 && res.status < 300 ? parseThemeHeader(res.body) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`wordpress-detect:${clientKey(request)}`, { limit: 10, windowMs: 60_000 });
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
    const html = fetched.body;
    const { signals, version } = detectWordPressSignals(html);
    const found = detectThemes(html, fetched.finalUrl);

    // Headers for at most two themes (the active one and, for a child theme,
    // its parent), fetched in parallel through the same SSRF guard.
    const headers = await Promise.all(found.slice(0, 2).map((t) => readHeader(t.stylesheetUrl)));
    const themes: DetectedTheme[] = found.map((t, i) => ({ ...t, header: headers[i] ?? null }));

    const report: WordPressReport = {
      url: parsed.href,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      isWordPress: signals.length > 0,
      signals,
      wordpressVersion: version,
      themes,
      plugins: detectPlugins(html),
    };
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[wordpress-detect] unexpected failure", err);
    return NextResponse.json({ error: "Something went wrong scanning that site. Please try again." }, { status: 500 });
  }
}
