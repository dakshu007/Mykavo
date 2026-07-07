import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { extractSnapshot } from "@/lib/tools/snapshot";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

const USER_MESSAGES: Record<UnsafeUrlError["code"], string> = {
  INVALID_URL: "That doesn't look like a valid URL.",
  SCHEME_NOT_ALLOWED: "Only http:// and https:// URLs can be inspected.",
  CREDENTIALS_IN_URL: "URLs containing credentials are not supported.",
  BLOCKED_HOST: "This host can't be inspected.",
  BLOCKED_IP: "This host can't be inspected.",
  DNS_FAILURE: "We couldn't resolve that hostname. Check the spelling and try again.",
  TOO_MANY_REDIRECTS: "The page redirected too many times.",
  RESPONSE_TOO_LARGE: "The page is too large to inspect with the free tool (2 MB limit).",
  TIMEOUT: "The website took too long to respond.",
  FETCH_FAILED: "We couldn't reach that website. It may be down or blocking requests.",
};

export async function POST(request: Request) {
  const limit = rateLimit(`inspect:${clientKey(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
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
    return NextResponse.json(
      { error: "That doesn't look like a valid URL." },
      { status: 400 },
    );
  }

  try {
    const fetched = await safeFetch(parsed.href);
    const snapshot = extractSnapshot(fetched, parsed.href);
    return NextResponse.json({ snapshot });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[inspect-url] unexpected failure", err);
    return NextResponse.json(
      { error: "Something went wrong inspecting that page. Please try again." },
      { status: 500 },
    );
  }
}
