import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";

/**
 * Keep-warm target, pinged by the worker every few minutes (see
 * apps/worker/src/keep-warm.ts).
 *
 * The whole app runs in one serverless function. Left idle, it is shut down,
 * and the next visitor to the dashboard pays for a cold start - booting the
 * server, loading Prisma, opening a database connection - which is most of
 * the multi-second wait on a first click. Touching the database here keeps
 * the function AND its connection warm. Returns nothing sensitive.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let db = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = false;
  }
  return NextResponse.json(
    { ok: true, db, ms: Date.now() - startedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
