import { NextResponse } from "next/server";
import { GSC_SCOPE, signOauthState } from "@mykavo/shared";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { gscConfigured, gscKey } from "@/lib/gsc";
import { appBaseUrl } from "@/lib/app-url";
import { env } from "@/lib/env";

/** Start the Google OAuth flow for a website (readonly scope only). */
export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN");
  if (denied) return denied;
  if (!gscConfigured()) {
    return NextResponse.json({ error: "Google integration is not configured." }, { status: 503 });
  }

  const websiteId = new URL(request.url).searchParams.get("website") ?? "";
  const website = await getOwnedWebsite(ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", `${appBaseUrl()}/api/gsc/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", GSC_SCOPE);
  authorize.searchParams.set("access_type", "offline");
  authorize.searchParams.set("prompt", "consent");
  authorize.searchParams.set("state", signOauthState(website.id, gscKey()));
  return NextResponse.redirect(authorize);
}
