import { NextResponse } from "next/server";

/**
 * OpenAI's domain check for publishing MyKavo in the ChatGPT plugin
 * directory: the portal shows a challenge token, which must be served here
 * as plain text. The token is not a secret (anyone can read this URL); it
 * only proves we control mykavo.app. Set OPENAI_APPS_CHALLENGE, or the
 * fallback below, to the token the portal shows.
 */
const TOKEN = "";

export function GET() {
  const token = (process.env.OPENAI_APPS_CHALLENGE ?? TOKEN).trim();
  if (!token) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(token, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
