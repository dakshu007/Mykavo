import { NextResponse } from "next/server";
import { z } from "zod";
import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { extractScripts, type ScriptDetectionReport } from "@/lib/tools/snapshot";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export async function POST(request: Request) {
  const limit = rateLimit(`detect-scripts:${clientKey(request)}`, {
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
    const report: ScriptDetectionReport = {
      url: parsed.href,
      finalUrl: fetched.finalUrl,
      httpStatus: fetched.status,
      scripts: extractScripts(fetched.body, fetched.finalUrl),
    };
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    console.error("[detect-scripts] unexpected failure", err);
    return NextResponse.json(
      { error: "Something went wrong scanning that page. Please try again." },
      { status: 500 },
    );
  }
}
