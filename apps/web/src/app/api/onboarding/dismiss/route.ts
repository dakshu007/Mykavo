import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, resolveCurrentMembership } from "@/lib/session";
import {
  ONBOARDING_DISMISSED_COOKIE,
  ONBOARDING_DISMISSED_MAX_AGE,
} from "@/lib/onboarding";

/**
 * Dismisses the getting-started checklist for the CURRENT workspace by
 * setting a 90-day cookie (value = workspaceId). Purely a UI preference -
 * no database state; the checklist also auto-hides once the required steps
 * are complete regardless of this cookie.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await resolveCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "No workspace." }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ONBOARDING_DISMISSED_COOKIE, membership.workspace.id, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONBOARDING_DISMISSED_MAX_AGE,
  });
  return NextResponse.json({ ok: true });
}
