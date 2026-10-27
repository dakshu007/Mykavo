/**
 * Database backups: the decisions, kept pure so they can be tested.
 *
 * The worker (apps/worker/src/db-backup.ts) runs pg_dump every night onto
 * the server's own disk, proves each dump restores into a throwaway Postgres,
 * and copies the weekly full dump to R2 so a lost server does not take the
 * backups with it.
 *
 * WHY TWO KINDS OF DUMP
 * ---------------------
 * Every byte pg_dump reads counts against Supabase's 5 GB/month egress quota,
 * which this project already blew through once (October 2026). A full dump
 * every night would cost ~2.4 GB a month on its own. So:
 *
 *   - FULL (Sundays): every table, every row.
 *   - CORE (other nights): every table's schema, and every table's rows
 *     EXCEPT the three high-volume history tables below, which together are
 *     most of the database but are rebuilt by the next scan anyway.
 *
 * Worst case after a disaster: restore the latest core dump for accounts,
 * websites, baselines and changes, plus the latest full dump's history.
 */

/** Rows skipped by the nightly core dump. Schema is still dumped. */
export const CORE_EXCLUDED_DATA_TABLES = ["page_link", "page_script", "health_check"] as const;

export type BackupKind = "full" | "core";

/** Sundays (UTC) get a full dump; every other night a core dump. */
export function backupKind(now: Date): BackupKind {
  return now.getUTCDay() === 0 ? "full" : "core";
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function backupFileName(now: Date, kind: BackupKind): string {
  return `mykavo-${isoDay(now)}-${kind}.dump`;
}

const FILE_PATTERN = /^mykavo-(\d{4}-\d{2}-\d{2})-(full|core)\.dump$/;

export function parseBackupFileName(name: string): { day: string; kind: BackupKind } | null {
  const match = FILE_PATTERN.exec(name);
  if (!match) return null;
  return { day: match[1], kind: match[2] as BackupKind };
}

/** R2 key for the off-server copy of a full dump. */
export function backupR2Key(fileName: string): string {
  return `backups/db/${fileName}`;
}

/**
 * libpq (pg_dump, psql) rejects query parameters it does not know, and the
 * worker's DATABASE_URL carries Prisma-only ones like `connection_limit` and
 * `pgbouncer`. Keep only what libpq understands.
 */
const LIBPQ_PARAMS = new Set([
  "sslmode",
  "sslrootcert",
  "sslcert",
  "sslkey",
  "channel_binding",
  "connect_timeout",
  "application_name",
  "options",
  "target_session_attrs",
]);

export function toLibpqUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  for (const key of [...url.searchParams.keys()]) {
    if (!LIBPQ_PARAMS.has(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

/**
 * pg_dump arguments. Only the `public` schema: everything MyKavo owns lives
 * there, while Supabase's own schemas (auth, storage, vault, extensions)
 * belong to the platform and would not restore into a plain Postgres.
 * Ownership and grants are dropped for the same reason.
 */
export function pgDumpArgs(options: { kind: BackupKind; file: string; dbUrl: string }): string[] {
  const args = [
    "--format=custom",
    "--compress=9",
    "--schema=public",
    "--no-owner",
    "--no-privileges",
    "--no-publications",
    "--no-subscriptions",
    "--no-security-labels",
    `--file=${options.file}`,
  ];
  if (options.kind === "core") {
    for (const table of CORE_EXCLUDED_DATA_TABLES) {
      args.push(`--exclude-table-data=public.${table}`);
    }
  }
  args.push(`--dbname=${options.dbUrl}`);
  return args;
}

export interface BackupRetention {
  /** Days a nightly core dump is kept on the server. */
  coreDays: number;
  /** Days a weekly full dump is kept on the server. */
  fullDays: number;
}

export const DEFAULT_BACKUP_RETENTION: BackupRetention = { coreDays: 30, fullDays: 180 };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local dump files old enough to delete. Unrecognised files are never touched. */
export function localBackupsToPrune(
  fileNames: readonly string[],
  now: Date,
  retention: BackupRetention = DEFAULT_BACKUP_RETENTION,
): string[] {
  const today = Date.parse(isoDay(now));
  return fileNames.filter((name) => {
    const parsed = parseBackupFileName(name);
    if (!parsed) return false;
    const ageDays = (today - Date.parse(parsed.day)) / DAY_MS;
    const keepDays = parsed.kind === "full" ? retention.fullDays : retention.coreDays;
    return ageDays > keepDays;
  });
}

/**
 * R2 keeps the last `keepWeeks` full dumps. Deletes are computed rather than
 * listed: the full dumps from the four Sundays just past the window. A missed
 * week leaves at most a few extra objects behind, and delete is idempotent.
 */
export function r2BackupKeysToPrune(now: Date, keepWeeks = 8): string[] {
  const keys: string[] = [];
  for (let week = keepWeeks + 1; week <= keepWeeks + 4; week += 1) {
    const day = new Date(Date.parse(isoDay(now)) - week * 7 * DAY_MS);
    // Align to that week's Sunday, whatever day today is.
    day.setUTCDate(day.getUTCDate() - day.getUTCDay());
    keys.push(backupR2Key(backupFileName(day, "full")));
  }
  return [...new Set(keys)];
}

/**
 * Tables whose restored row count must closely match the live database.
 * These are the rows a restore exists to save; they change slowly, so a big
 * gap means the dump or the restore lost data.
 */
export const RESTORE_CHECK_TABLES = [
  "user",
  "workspace",
  "workspace_member",
  "website",
  "monitored_page",
  "baseline",
  "scan",
  "change_event",
  "subscription",
] as const;

export interface RowCountMismatch {
  table: string;
  live: number;
  restored: number;
}

/**
 * Compares restored counts with live counts taken just after the restore.
 * Live keeps moving (new scans, new changes, a retention sweep), so a small
 * drift is expected: allow 5 rows or 2%, whichever is larger. A table missing
 * from the restore is always a mismatch.
 */
export function compareRestoredCounts(
  live: Readonly<Record<string, number>>,
  restored: Readonly<Record<string, number | undefined>>,
): RowCountMismatch[] {
  const mismatches: RowCountMismatch[] = [];
  for (const [table, liveCount] of Object.entries(live)) {
    const restoredCount = restored[table];
    if (restoredCount === undefined) {
      mismatches.push({ table, live: liveCount, restored: -1 });
      continue;
    }
    const allowed = Math.max(5, Math.ceil(liveCount * 0.02));
    if (Math.abs(liveCount - restoredCount) > allowed) {
      mismatches.push({ table, live: liveCount, restored: restoredCount });
    }
  }
  return mismatches;
}
