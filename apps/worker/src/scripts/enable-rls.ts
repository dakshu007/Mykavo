/**
 * Enable Row Level Security on every table in the `public` schema.
 *
 * Why this is safe for MyKavo: the app talks to Postgres exclusively through
 * Prisma as the role that OWNS these tables, and table owners bypass RLS
 * (we deliberately do NOT use FORCE ROW LEVEL SECURITY). What it protects:
 * Supabase's auto-generated PostgREST Data API - with RLS enabled and no
 * policies defined, the anon/authenticated API roles can read/write NOTHING,
 * closing that surface completely.
 *
 * Idempotent - re-run after any migration that creates new tables (Prisma
 * migrations create tables with RLS disabled by default).
 *
 * Usage: DATABASE_URL=… pnpm --dir apps/worker exec tsx src/scripts/enable-rls.ts
 */

import { prisma } from "@mykavo/database";

async function main() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;

  let enabled = 0;
  for (const t of tables) {
    if (t.rowsecurity) {
      console.log(`ok      ${t.tablename} (already enabled)`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "public"."${t.tablename.replace(/"/g, '""')}" ENABLE ROW LEVEL SECURITY`,
    );
    enabled += 1;
    console.log(`enabled ${t.tablename}`);
  }
  console.log(`done - ${enabled} enabled, ${tables.length} total tables`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
