import { NextResponse } from "next/server";
import { z } from "zod";
import { UnsafeUrlError } from "@/lib/security/ssrf";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { parseUrlInput } from "@/lib/url";
import { runEeatAnalysis } from "@/lib/tools/eeat-server";
import { SAFE_FETCH_USER_MESSAGES } from "@/lib/tools/user-messages";

const bodySchema = z.object({ url: z.string().trim().min(1).max(2048) });

/** Free E-E-A-T analyzer (public, rate-limited - the acquisition tool). */
export async function POST(request: Request) {
  const limit = rateLimit(`eeat:${clientKey(request)}`, { limit: 6, windowMs: 60_000 });
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
    const report = await runEeatAnalysis(parsed.href);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: SAFE_FETCH_USER_MESSAGES[err.code] }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes("HTTP")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[eeat] unexpected failure", err);
    return NextResponse.json(
      { error: "Something went wrong analyzing that page. Please try again." },
      { status: 500 },
    );
  }
}
