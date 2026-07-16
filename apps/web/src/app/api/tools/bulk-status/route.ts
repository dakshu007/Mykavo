import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import {
  BULK_CONCURRENCY,
  MAX_BULK_URLS,
  checkUrlStatus,
  mapWithConcurrency,
} from "@/lib/tools/status-check";

const bodySchema = z.object({
  urls: z.array(z.string().trim().min(1).max(2048)).min(1).max(MAX_BULK_URLS),
});

export async function POST(request: Request) {
  // Stricter than the single-URL tools: each request fans out to up to 20 fetches.
  const limit = rateLimit(`bulk-status:${clientKey(request)}`, {
    limit: 5,
    windowMs: 60_000,
  });
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
    return NextResponse.json(
      { error: `Please enter between 1 and ${MAX_BULK_URLS} URLs, one per line.` },
      { status: 400 },
    );
  }

  try {
    // Individual URL failures are reported per-row, never fail the batch.
    const results = await mapWithConcurrency(input.urls, BULK_CONCURRENCY, (url) =>
      checkUrlStatus(url),
    );
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[bulk-status] unexpected failure", err);
    return NextResponse.json(
      { error: "Something went wrong checking those URLs. Please try again." },
      { status: 500 },
    );
  }
}
