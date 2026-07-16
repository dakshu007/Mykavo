import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getSession } from "@/lib/session";
import { WORKSPACE_COOKIE } from "@/lib/team";

const schema = z.object({ workspaceId: z.string().min(1).max(64) });

/**
 * Switch the current workspace. Membership is verified server-side before the
 * httpOnly cookie is set - the cookie is a hint for resolution, never an
 * authority (resolution re-verifies membership on every request).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, workspaceId: body.workspaceId },
    select: { workspaceId: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You're not a member of that workspace." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, membership.workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
