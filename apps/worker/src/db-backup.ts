/**
 * Nightly database backup, proven by a real restore.
 *
 *   1. pg_dump the `public` schema onto the worker server's disk
 *      (full on Sundays, core on other nights - see @mykavo/shared db-backup).
 *   2. Restore it into a throwaway Postgres that listens on a unix socket
 *      only, and compare key table row counts with the live database. A
 *      backup that has never been restored is a hope, not a backup.
 *   3. Copy Sunday's full dump to R2, so losing the server does not lose
 *      the backups with it.
 *   4. Prune old dumps (local and R2).
 *
 * Any failure emails ALERT_EMAILS / ADMIN_EMAILS. Monitoring never depends on
 * this job: it only reads from the database.
 *
 * The Postgres 17 client and server binaries come from the worker image
 * (infra/worker/Dockerfile). Where they are missing - a laptop running the
 * worker for development - the job logs once and does nothing.
 */

import { spawn } from "node:child_process";
import { access, mkdir, readdir, readFile, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@mykavo/database";
import { sendEmail, workerBackupFailedEmail } from "@mykavo/email";
import { getDefaultStorage } from "@mykavo/scanner";
import {
  RESTORE_CHECK_TABLES,
  backupFileName,
  backupKind,
  backupR2Key,
  compareRestoredCounts,
  localBackupsToPrune,
  pgDumpArgs,
  r2BackupKeysToPrune,
  toLibpqUrl,
} from "@mykavo/shared";
import { alertRecipients } from "./db-watch";
import { logger } from "./logger";

const DATA_DIR = process.env.WORKER_DATA_DIR ?? "/data";
const BACKUP_DIR = join(DATA_DIR, "backups", "db");
const RESTORE_DIR = join(DATA_DIR, "restore-check");
const PG_BIN = process.env.PG_BIN_DIR ?? "/usr/lib/postgresql/17/bin";
const DUMP_TIMEOUT_MS = 30 * 60 * 1000;
const STEP_TIMEOUT_MS = 15 * 60 * 1000;

class BackupStepError extends Error {
  constructor(
    readonly step: string,
    message: string,
  ) {
    super(message);
  }
}

/** Splits the password out so it travels in the environment, never in argv or logs. */
function connection(databaseUrl: string): { url: string; password: string } {
  const url = new URL(toLibpqUrl(databaseUrl));
  const password = decodeURIComponent(url.password);
  url.password = "";
  return { url: url.toString(), password };
}

function run(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; timeoutMs?: number; secret?: string } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), options.timeoutMs ?? STEP_TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) return resolve(stdout);
      let detail = (stderr || stdout).replace(/\s+/g, " ").trim();
      if (options.secret) detail = detail.split(options.secret).join("***");
      const why = signal ? `killed by ${signal} (timeout?)` : `exit code ${code}`;
      reject(new Error(`${command.split("/").pop()} failed: ${why}. ${detail}`.slice(0, 800)));
    });
  });
}

async function binariesPresent(): Promise<boolean> {
  try {
    await access(join(PG_BIN, "pg_dump"));
    await access(join(PG_BIN, "postgres"));
    return true;
  } catch {
    return false;
  }
}

const quote = (table: string) => `"${table.replace(/"/g, '""')}"`;

async function liveCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of RESTORE_CHECK_TABLES) {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `select count(*) as c from public.${quote(table)}`,
    );
    counts[table] = Number(rows[0]?.c ?? 0);
  }
  return counts;
}

async function restoreCheck(file: string): Promise<Record<string, number>> {
  await rm(RESTORE_DIR, { recursive: true, force: true });
  await mkdir(RESTORE_DIR, { recursive: true });
  const pgdata = join(RESTORE_DIR, "pgdata");
  const socket = ["-h", RESTORE_DIR, "-U", "mykavo"];
  let started = false;
  try {
    await run(join(PG_BIN, "initdb"), ["-D", pgdata, "-U", "mykavo", "--auth=trust", "-E", "UTF8", "--no-locale"]);
    // Unix socket only, no TCP: nothing else on this machine - least of all
    // the browsers scanning untrusted pages - can reach the copy.
    await run(join(PG_BIN, "pg_ctl"), [
      "-D",
      pgdata,
      "-l",
      join(RESTORE_DIR, "postgres.log"),
      "-w",
      "-t",
      "120",
      "-o",
      `-c listen_addresses='' -c unix_socket_directories='${RESTORE_DIR}' -c fsync=off -c full_page_writes=off -c synchronous_commit=off`,
      "start",
    ]);
    started = true;
    // The dump recreates the `public` schema itself, so restore into a fresh
    // database whose default `public` schema is dropped first.
    await run(join(PG_BIN, "psql"), [...socket, "-d", "postgres", "-c", "create database restorecheck"]);
    await run(join(PG_BIN, "psql"), [...socket, "-d", "restorecheck", "-c", "drop schema public cascade"]);
    await run(join(PG_BIN, "pg_restore"), [
      ...socket,
      "-d",
      "restorecheck",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      file,
    ]);
    const present = (
      await run(join(PG_BIN, "psql"), [
        ...socket,
        "-d",
        "restorecheck",
        "-At",
        "-c",
        "select tablename from pg_tables where schemaname = 'public'",
      ])
    )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const counts: Record<string, number> = {};
    for (const table of RESTORE_CHECK_TABLES) {
      if (!present.includes(table)) continue;
      const out = await run(join(PG_BIN, "psql"), [
        ...socket,
        "-d",
        "restorecheck",
        "-At",
        "-c",
        `select count(*) from public.${quote(table)}`,
      ]);
      counts[table] = Number(out.trim());
    }
    return counts;
  } finally {
    if (started) {
      await run(join(PG_BIN, "pg_ctl"), ["-D", pgdata, "-m", "fast", "-w", "stop"]).catch((err) =>
        logger.warn("restore-check postgres did not stop cleanly", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
    await rm(RESTORE_DIR, { recursive: true, force: true });
  }
}

async function copyToR2(file: string, fileName: string, now: Date): Promise<boolean> {
  if (process.env.ARTIFACT_STORE !== "r2") return false;
  const storage = getDefaultStorage();
  await storage.put(backupR2Key(fileName), await readFile(file), "application/octet-stream");
  for (const key of r2BackupKeysToPrune(now)) {
    await storage.delete(key).catch(() => {});
  }
  return true;
}

async function pruneLocal(now: Date): Promise<string[]> {
  const names = await readdir(BACKUP_DIR);
  const stale = localBackupsToPrune(names, now);
  for (const name of stale) await rm(join(BACKUP_DIR, name), { force: true });
  // Leftovers from a dump that died mid-write.
  for (const name of names.filter((n) => n.endsWith(".partial"))) {
    await rm(join(BACKUP_DIR, name), { force: true });
  }
  return stale;
}

async function alert(step: string, fileName: string, err: unknown): Promise<void> {
  const reason = err instanceof Error ? err.message : String(err);
  logger.error("database backup failed", { step, fileName, reason });
  const recipients = alertRecipients();
  if (recipients.length === 0) return;
  const message = workerBackupFailedEmail({ step, fileName, reason });
  const sent = await sendEmail({ to: recipients, subject: message.subject, html: message.html, text: message.text });
  if (!sent.ok) logger.error("could not send the backup failure alert", { error: sent.error });
}

export async function runDatabaseBackup(now = new Date()): Promise<void> {
  const databaseUrl = process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) return;
  if (!(await binariesPresent())) {
    // On a laptop that is expected. On the server it means the image build
    // could not install Postgres, and silence would look exactly like health.
    if (process.env.BACKUPS_REQUIRED === "1") {
      await alert("setup", backupFileName(now, backupKind(now)), `Postgres 17 binaries not found in ${PG_BIN}. The worker image build could not install them; rebuild the image.`);
    } else {
      logger.warn("database backup skipped - Postgres 17 binaries not found", { pgBin: PG_BIN });
    }
    return;
  }

  const kind = backupKind(now);
  const fileName = backupFileName(now, kind);
  const file = join(BACKUP_DIR, fileName);
  const started = Date.now();

  try {
    await mkdir(BACKUP_DIR, { recursive: true });

    const { url, password } = connection(databaseUrl);
    const partial = `${file}.partial`;
    try {
      await run(join(PG_BIN, "pg_dump"), pgDumpArgs({ kind, file: partial, dbUrl: url }), {
        env: { PGPASSWORD: password },
        timeoutMs: DUMP_TIMEOUT_MS,
        secret: password,
      });
      await rename(partial, file);
    } catch (err) {
      await rm(partial, { force: true });
      throw new BackupStepError("dump", err instanceof Error ? err.message : String(err));
    }
    const bytes = (await stat(file)).size;

    let restored: Record<string, number>;
    try {
      restored = await restoreCheck(file);
    } catch (err) {
      throw new BackupStepError("restore check", err instanceof Error ? err.message : String(err));
    }
    const mismatches = compareRestoredCounts(await liveCounts(), restored);
    if (mismatches.length > 0) {
      const detail = mismatches
        .map((m) => `${m.table}: live ${m.live}, restored ${m.restored < 0 ? "missing" : m.restored}`)
        .join("; ");
      throw new BackupStepError("restore check", `Row counts do not match - ${detail}`);
    }

    let offServer = false;
    if (kind === "full") {
      try {
        offServer = await copyToR2(file, fileName, now);
      } catch (err) {
        throw new BackupStepError("off-server copy", err instanceof Error ? err.message : String(err));
      }
    }

    const pruned = await pruneLocal(now);
    logger.info("database backup completed", {
      fileName,
      kind,
      bytes,
      restoreChecked: true,
      offServerCopy: offServer,
      pruned: pruned.length,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    const step = err instanceof BackupStepError ? err.step : "backup";
    await alert(step, fileName, err);
  }
}
