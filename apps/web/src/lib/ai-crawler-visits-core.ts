import { z } from "zod";
import { aiVisitAgent, type AiCrawlerPurpose } from "@mykavo/shared";

/**
 * AI crawler visits, as the WordPress plugin reports them and as the
 * dashboard and MCP tool show them. Pure: parsing and summarising only, so
 * both are unit-tested without a database.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The plugin sends 14 days; accept a little more, refuse anything older. */
export const MAX_REPORT_AGE_DAYS = 40;

const pathSchema = z.object({
  path: z.string().min(1).max(300),
  hits: z.number().int().min(0).max(10_000_000),
  errors: z.number().int().min(0).max(10_000_000).default(0),
});

const agentSchema = z.object({
  agent: z.string().min(1).max(40),
  hits: z.number().int().min(0).max(10_000_000),
  errors: z.number().int().min(0).max(10_000_000).default(0),
  paths: z.array(pathSchema).max(20).default([]),
});

export const visitReportSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.string().regex(DAY),
        agents: z.array(agentSchema).max(40),
      }),
    )
    .max(45),
});

export type VisitReport = z.infer<typeof visitReportSchema>;

export interface VisitRow {
  day: string;
  agent: string;
  hits: number;
  errors: number;
  topPaths: Array<{ path: string; hits: number; errors: number }>;
}

/**
 * The rows a report should write. Unknown crawler names are dropped (the
 * plugin only counts known ones, so anything else is not from it), as are
 * days in the future or too old to matter, and paths that are not paths.
 */
export function rowsFromReport(report: VisitReport, now: Date = new Date()): VisitRow[] {
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  const oldest = new Date(now.getTime() - MAX_REPORT_AGE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const byKey = new Map<string, VisitRow>();

  for (const day of report.days) {
    const parsed = new Date(`${day.day}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day.day) continue;
    // A site's clock may run a few hours ahead of UTC; tomorrow is the limit.
    if (day.day > tomorrow || day.day < oldest) continue;
    for (const a of day.agents) {
      const known = aiVisitAgent(a.agent);
      if (!known) continue;
      const topPaths = a.paths
        .filter((p) => p.path.startsWith("/"))
        .map((p) => ({ path: p.path.slice(0, 300), hits: p.hits, errors: Math.min(p.errors, p.hits) }))
        .sort((x, y) => y.hits - x.hits)
        .slice(0, 10);
      const key = `${day.day}|${known.agent}`;
      const prev = byKey.get(key);
      // The same crawler listed twice for one day: add them up.
      byKey.set(key, {
        day: day.day,
        agent: known.agent,
        hits: (prev?.hits ?? 0) + a.hits,
        errors: (prev?.errors ?? 0) + Math.min(a.errors, a.hits),
        topPaths: prev ? mergePaths(prev.topPaths, topPaths) : topPaths,
      });
    }
  }
  return [...byKey.values()];
}

function mergePaths(a: VisitRow["topPaths"], b: VisitRow["topPaths"]): VisitRow["topPaths"] {
  const m = new Map<string, { path: string; hits: number; errors: number }>();
  for (const p of [...a, ...b]) {
    const prev = m.get(p.path);
    m.set(p.path, { path: p.path, hits: (prev?.hits ?? 0) + p.hits, errors: (prev?.errors ?? 0) + p.errors });
  }
  return [...m.values()].sort((x, y) => y.hits - x.hits).slice(0, 10);
}

export interface CrawlerSummary {
  agent: string;
  owner: string;
  purpose: AiCrawlerPurpose;
  hits: number;
  errors: number;
  /** "YYYY-MM-DD" of the latest day with a visit. */
  lastSeen: string;
}

export interface VisitSummary {
  days: number;
  total: number;
  errors: number;
  /** Visits from search and user-triggered crawlers: the ones behind AI answers. */
  answerHits: number;
  crawlers: CrawlerSummary[];
  daily: Array<{ day: string; hits: number }>;
  pages: Array<{ path: string; hits: number; errors: number; agents: string[] }>;
  /** Newest day with data, or null. */
  latestDay: string | null;
}

interface StoredRow {
  day: Date | string;
  agent: string;
  hits: number;
  errors: number;
  topPaths: unknown;
}

function dayString(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

function storedPaths(value: unknown): VisitRow["topPaths"] {
  if (!Array.isArray(value)) return [];
  const out: VisitRow["topPaths"] = [];
  for (const p of value) {
    if (!p || typeof p !== "object") continue;
    const { path, hits, errors } = p as Record<string, unknown>;
    if (typeof path !== "string" || typeof hits !== "number") continue;
    out.push({ path, hits, errors: typeof errors === "number" ? errors : 0 });
  }
  return out;
}

/**
 * Summarise stored rows over the last `days` days (UTC, including today).
 * Page totals come from each day's top paths, so they are a lower bound for
 * pages outside a day's top ten - good enough to rank the most-read pages.
 */
export function summarizeVisits(rows: StoredRow[], days = 30, now: Date = new Date()): VisitSummary {
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }
  const inWindow = new Set(dayKeys);
  const daily = new Map<string, number>(dayKeys.map((d) => [d, 0]));
  const crawlers = new Map<string, CrawlerSummary>();
  const pages = new Map<string, { path: string; hits: number; errors: number; agents: Set<string> }>();
  let total = 0;
  let errors = 0;
  let latestDay: string | null = null;

  for (const row of rows) {
    const day = dayString(row.day);
    if (!inWindow.has(day)) continue;
    const known = aiVisitAgent(row.agent);
    if (!known || row.hits <= 0) continue;
    total += row.hits;
    errors += row.errors;
    daily.set(day, (daily.get(day) ?? 0) + row.hits);
    if (!latestDay || day > latestDay) latestDay = day;

    const c = crawlers.get(known.agent) ?? {
      agent: known.agent,
      owner: known.owner,
      purpose: known.purpose,
      hits: 0,
      errors: 0,
      lastSeen: day,
    };
    c.hits += row.hits;
    c.errors += row.errors;
    if (day > c.lastSeen) c.lastSeen = day;
    crawlers.set(known.agent, c);

    for (const p of storedPaths(row.topPaths)) {
      const page = pages.get(p.path) ?? { path: p.path, hits: 0, errors: 0, agents: new Set<string>() };
      page.hits += p.hits;
      page.errors += p.errors;
      page.agents.add(known.agent);
      pages.set(p.path, page);
    }
  }

  const crawlerList = [...crawlers.values()].sort((a, b) => b.hits - a.hits);
  return {
    days,
    total,
    errors,
    answerHits: crawlerList.filter((c) => c.purpose !== "training").reduce((n, c) => n + c.hits, 0),
    crawlers: crawlerList,
    daily: dayKeys.map((day) => ({ day, hits: daily.get(day) ?? 0 })),
    pages: [...pages.values()]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map((p) => ({ path: p.path, hits: p.hits, errors: p.errors, agents: [...p.agents].sort() })),
    latestDay,
  };
}
