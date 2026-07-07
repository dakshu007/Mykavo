import { NextResponse } from "next/server";
import { z } from "zod";
import { getWaitlistStore } from "@/lib/waitlist-store";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().trim().max(64).optional().default("unknown"),
});

export async function POST(request: Request) {
  const limit = rateLimit(`waitlist:${clientKey(request)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    await getWaitlistStore().add({
      email: parsed.email,
      source: parsed.source,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[waitlist] store failure", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Deduplication is intentionally not revealed to the client.
  return NextResponse.json({ ok: true });
}
