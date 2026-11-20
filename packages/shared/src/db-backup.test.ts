import { describe, expect, it } from "vitest";
import {
  backupFileName,
  backupKind,
  compareRestoredCounts,
  localBackupsToPrune,
  parseBackupFileName,
  pgDumpArgs,
  r2BackupKeysToPrune,
  r2CoreBackupKeysToPrune,
  toLibpqUrl,
} from "./db-backup";

describe("backupKind", () => {
  it("dumps everything on Sundays and the core tables otherwise", () => {
    expect(backupKind(new Date("2026-11-01T02:30:00Z"))).toBe("full"); // Sunday
    expect(backupKind(new Date("2026-10-28T02:30:00Z"))).toBe("core"); // Wednesday
  });
});

describe("file names", () => {
  it("round-trips", () => {
    const name = backupFileName(new Date("2026-10-28T02:30:00Z"), "core");
    expect(name).toBe("mykavo-2026-10-28-core.dump");
    expect(parseBackupFileName(name)).toEqual({ day: "2026-10-28", kind: "core" });
  });

  it("ignores anything else in the folder", () => {
    expect(parseBackupFileName("mykavo-2026-10-28-core.dump.tmp")).toBeNull();
    expect(parseBackupFileName("notes.txt")).toBeNull();
  });
});

describe("toLibpqUrl", () => {
  it("drops Prisma-only parameters and keeps libpq ones", () => {
    const url = toLibpqUrl(
      "postgresql://u:p@host:5432/postgres?connection_limit=3&pgbouncer=true&sslmode=require",
    );
    expect(url).toBe("postgresql://u:p@host:5432/postgres?sslmode=require");
  });
});

describe("pgDumpArgs", () => {
  it("skips weekly table data on core nights and legacy link rows always", () => {
    const core = pgDumpArgs({ kind: "core", file: "/x.dump", dbUrl: "postgresql://h/db" });
    expect(core).toContain("--exclude-table-data=public.page_link");
    expect(core).toContain("--exclude-table-data=public.health_check");
    expect(core).toContain("--exclude-table-data=public.gsc_page_daily");
    expect(core).toContain("--schema=public");
    expect(core.at(-1)).toBe("--dbname=postgresql://h/db");

    const full = pgDumpArgs({ kind: "full", file: "/x.dump", dbUrl: "postgresql://h/db" });
    const fullExcluded = full.filter((a) => a.startsWith("--exclude-table-data"));
    expect(fullExcluded).toEqual([
      "--exclude-table-data=public.page_link",
      "--exclude-table-data=public.page_script",
    ]);
  });

  it("never skips rows a restore cannot rebuild", () => {
    const core = pgDumpArgs({ kind: "core", file: "/x.dump", dbUrl: "postgresql://h/db" });
    for (const table of ["user", "workspace", "website", "monitored_page", "baseline", "page_snapshot", "change_event", "subscription", "scan"]) {
      expect(core).not.toContain(`--exclude-table-data=public.${table}`);
    }
  });
});

describe("localBackupsToPrune", () => {
  const now = new Date("2026-10-28T02:30:00Z");

  it("keeps core dumps 30 days and full dumps 180 days", () => {
    const names = [
      "mykavo-2026-10-27-core.dump",
      "mykavo-2026-09-28-core.dump", // 30 days: kept
      "mykavo-2026-09-27-core.dump", // 31 days: pruned
      "mykavo-2026-05-03-full.dump", // 178 days: kept
      "mykavo-2026-04-26-full.dump", // 185 days: pruned
      "something-else.dump",
    ];
    expect(localBackupsToPrune(names, now)).toEqual([
      "mykavo-2026-09-27-core.dump",
      "mykavo-2026-04-26-full.dump",
    ]);
  });
});

describe("r2BackupKeysToPrune", () => {
  it("targets the Sundays just past an eight week window", () => {
    const keys = r2BackupKeysToPrune(new Date("2026-11-01T02:30:00Z"));
    expect(keys[0]).toBe("backups/db/mykavo-2026-08-30-full.dump"); // 9 weeks back
    expect(keys).toHaveLength(4);
    for (const key of keys) {
      const day = key.match(/(\d{4}-\d{2}-\d{2})/)![1];
      expect(new Date(`${day}T00:00:00Z`).getUTCDay()).toBe(0);
    }
  });
});

describe("r2CoreBackupKeysToPrune", () => {
  it("targets the week of core dumps just past a 14 day window", () => {
    const keys = r2CoreBackupKeysToPrune(new Date("2026-11-20T02:30:00Z"));
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("backups/db/mykavo-2026-11-05-core.dump"); // 15 days back
    expect(keys[6]).toBe("backups/db/mykavo-2026-10-30-core.dump");
  });
});

describe("compareRestoredCounts", () => {
  it("tolerates small drift and flags real loss or missing tables", () => {
    const live = { website: 17, change_event: 1828, scan: 481, user: 40 };
    const restored = { website: 17, change_event: 1800, scan: 300 };
    expect(compareRestoredCounts(live, restored)).toEqual([
      { table: "scan", live: 481, restored: 300 },
      { table: "user", live: 40, restored: -1 },
    ]);
  });
});
