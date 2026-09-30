import { OPEN_STATUSES, prisma, type ChangeSeverity, type Prisma } from "@mykavo/database";
import { AUDIT_CHECKS } from "@mykavo/seo-audit";
import { appBaseUrl } from "@/lib/app-url";
import type { ApiKeyContext } from "./api-keys";
import { ToolInputError, textResult, type McpTool } from "./protocol";

/**
 * MyKavo's MCP tools. Read-only, and every query is scoped to the API key's
 * workspace - the key is the only identity here, so nothing a model sends
 * in arguments can reach another workspace's data.
 */

const SEVERITIES: ChangeSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const DAY_MS = 24 * 60 * 60 * 1000;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const clip = (v: string | null | undefined, n = 300) => (v && v.length > n ? `${v.slice(0, n)}…` : (v ?? null));

function intArg(args: Record<string, unknown>, key: string, fallback: number, min: number, max: number): number {
  const v = args[key];
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ToolInputError(`${key} must be a number.`);
  return Math.min(max, Math.max(min, Math.round(n)));
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * A website named by id, exact name, or domain - whatever the person said.
 * Throws a readable error listing the options when nothing (or too much)
 * matches, so the model can ask or retry.
 */
async function resolveWebsite(workspaceId: string, ref: unknown): Promise<{ id: string; name: string; url: string } | null> {
  if (ref === undefined || ref === null || ref === "") return null;
  if (typeof ref !== "string") throw new ToolInputError("website must be a string (id, name or domain).");
  const sites = await prisma.website.findMany({
    where: { workspaceId },
    select: { id: true, name: true, url: true },
  });
  const q = ref.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const byId = sites.find((s) => s.id === ref.trim());
  if (byId) return byId;
  const exact = sites.filter(
    (s) => s.name.toLowerCase() === ref.trim().toLowerCase() || hostOf(s.url).replace(/^www\./, "") === q,
  );
  const loose = exact.length
    ? exact
    : sites.filter((s) => s.name.toLowerCase().includes(q) || hostOf(s.url).includes(q));
  if (loose.length === 1) return loose[0];
  const options = sites.map((s) => `${s.name} (${hostOf(s.url)})`).join(", ") || "none";
  throw new ToolInputError(
    loose.length === 0
      ? `No website matches "${ref}". Websites in this workspace: ${options}.`
      : `"${ref}" matches several websites: ${loose.map((s) => s.name).join(", ")}. Be more specific.`,
  );
}

const websiteArg = {
  type: "string",
  description: "Website id, name or domain (e.g. \"example.com\"). Omit for every website.",
};

export const MCP_TOOLS: McpTool<ApiKeyContext>[] = [
  {
    name: "workspace_summary",
    title: "Workspace summary",
    description:
      "Start here. How many websites are monitored, open changes by severity, the most serious open issues, and when scans last ran. Answers \"is anything wrong with my sites?\"",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async (_args, ctx) => {
      const [websites, bySeverity, worst] = await Promise.all([
        prisma.website.findMany({
          where: { workspaceId: ctx.workspaceId },
          select: { name: true, url: true, status: true, lastScanAt: true },
        }),
        prisma.changeEvent.groupBy({
          by: ["severity"],
          where: { website: { workspaceId: ctx.workspaceId }, status: { in: OPEN_STATUSES } },
          _count: { _all: true },
        }),
        prisma.changeEvent.findMany({
          where: {
            website: { workspaceId: ctx.workspaceId },
            status: { in: OPEN_STATUSES },
            severity: { in: ["CRITICAL", "HIGH"] },
          },
          orderBy: [{ detectedAt: "desc" }],
          take: 10,
          select: {
            id: true,
            title: true,
            severity: true,
            detectedAt: true,
            website: { select: { name: true } },
            monitoredPage: { select: { url: true } },
          },
        }),
      ]);
      const open = Object.fromEntries(SEVERITIES.map((s) => [s, bySeverity.find((b) => b.severity === s)?._count._all ?? 0]));
      const openTotal = Object.values(open).reduce((a, b) => a + b, 0);
      const serious = open.CRITICAL + open.HIGH;
      return textResult(
        `${ctx.workspaceName}: ${websites.length} website${websites.length === 1 ? "" : "s"} monitored, ${openTotal} open change${openTotal === 1 ? "" : "s"}${serious ? `, ${serious} critical or high` : ", nothing critical or high"}.`,
        {
          workspace: ctx.workspaceName,
          websites: websites.map((w) => ({ name: w.name, domain: hostOf(w.url), status: w.status, lastScanAt: iso(w.lastScanAt) })),
          openChangesBySeverity: open,
          mostSeriousOpen: worst.map((c) => ({
            id: c.id,
            severity: c.severity,
            title: c.title,
            website: c.website.name,
            page: c.monitoredPage ? pathOf(c.monitoredPage.url) : "site-wide",
            detectedAt: iso(c.detectedAt),
          })),
          dashboard: `${appBaseUrl()}/dashboard`,
        },
      );
    },
  },
  {
    name: "list_websites",
    title: "List websites",
    description: "Every monitored website with its status, last and next scan, monitored page count and open changes.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async (_args, ctx) => {
      const sites = await prisma.website.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          url: true,
          status: true,
          scanFrequency: true,
          lastScanAt: true,
          nextScanAt: true,
          _count: { select: { monitoredPages: { where: { enabled: true } } } },
        },
      });
      const open = await prisma.changeEvent.groupBy({
        by: ["websiteId", "severity"],
        where: { website: { workspaceId: ctx.workspaceId }, status: { in: OPEN_STATUSES } },
        _count: { _all: true },
      });
      return textResult(
        `${sites.length} website${sites.length === 1 ? "" : "s"}.`,
        sites.map((s) => {
          const mine = open.filter((o) => o.websiteId === s.id);
          const worst = SEVERITIES.find((sev) => mine.some((o) => o.severity === sev)) ?? null;
          return {
            id: s.id,
            name: s.name,
            url: s.url,
            status: s.status,
            scanFrequency: s.scanFrequency,
            lastScanAt: iso(s.lastScanAt),
            nextScanAt: iso(s.nextScanAt),
            monitoredPages: s._count.monitoredPages,
            openChanges: mine.reduce((a, o) => a + o._count._all, 0),
            highestOpenSeverity: worst,
          };
        }),
      );
    },
  },
  {
    name: "get_changes",
    title: "Get changes",
    description:
      "Detected changes, newest first: severity, category, page, title and before/after values. Filter by website, minimum severity, open or all, and how many days back.",
    inputSchema: {
      type: "object",
      properties: {
        website: websiteArg,
        min_severity: { type: "string", enum: SEVERITIES, description: "Only this severity and worse. Default INFO (everything)." },
        status: { type: "string", enum: ["open", "all"], description: "open (default) = not yet approved, resolved or ignored." },
        days: { type: "number", description: "How many days back to look. Default 30, max 365." },
        limit: { type: "number", description: "Max changes to return. Default 20, max 50." },
      },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const site = await resolveWebsite(ctx.workspaceId, args.website);
      const min = typeof args.min_severity === "string" ? args.min_severity.toUpperCase() : "INFO";
      if (!SEVERITIES.includes(min as ChangeSeverity)) throw new ToolInputError(`min_severity must be one of ${SEVERITIES.join(", ")}.`);
      const allowed = SEVERITIES.slice(0, SEVERITIES.indexOf(min as ChangeSeverity) + 1);
      const days = intArg(args, "days", 30, 1, 365);
      const limit = intArg(args, "limit", 20, 1, 50);
      const where: Prisma.ChangeEventWhereInput = {
        website: { workspaceId: ctx.workspaceId },
        websiteId: site?.id,
        severity: { in: allowed },
        status: args.status === "all" ? undefined : { in: OPEN_STATUSES },
        detectedAt: { gte: new Date(Date.now() - days * DAY_MS) },
      };
      const changes = await prisma.changeEvent.findMany({
        where,
        orderBy: [{ detectedAt: "desc" }],
        take: limit,
        select: {
          id: true,
          severity: true,
          category: true,
          status: true,
          title: true,
          previousValue: true,
          currentValue: true,
          detectedAt: true,
          website: { select: { name: true } },
          monitoredPage: { select: { url: true } },
        },
      });
      return textResult(
        `${changes.length} change${changes.length === 1 ? "" : "s"}${site ? ` on ${site.name}` : ""} in the last ${days} days (${args.status === "all" ? "all statuses" : "open only"}, ${min} and worse).`,
        changes.map((c) => ({
          id: c.id,
          severity: c.severity,
          category: c.category,
          status: c.status,
          title: c.title,
          website: c.website.name,
          page: c.monitoredPage ? pathOf(c.monitoredPage.url) : "site-wide",
          before: clip(c.previousValue, 160),
          after: clip(c.currentValue, 160),
          detectedAt: iso(c.detectedAt),
        })),
      );
    },
  },
  {
    name: "get_change",
    title: "Get one change",
    description: "Everything about one change: what happened, why it matters, before and after, and a link to its before-and-after view in MyKavo.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The change id from get_changes or workspace_summary." } },
      required: ["id"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      if (typeof args.id !== "string" || !args.id.trim()) throw new ToolInputError("id is required.");
      const c = await prisma.changeEvent.findFirst({
        where: { id: args.id.trim(), website: { workspaceId: ctx.workspaceId } },
        select: {
          id: true,
          severity: true,
          category: true,
          changeType: true,
          status: true,
          title: true,
          description: true,
          previousValue: true,
          currentValue: true,
          detectedAt: true,
          website: { select: { name: true, url: true } },
          monitoredPage: { select: { url: true } },
        },
      });
      if (!c) throw new ToolInputError(`No change with id ${args.id} in this workspace.`);
      return textResult(`${c.severity}: ${c.title}`, {
        ...c,
        previousValue: clip(c.previousValue, 2000),
        currentValue: clip(c.currentValue, 2000),
        website: c.website.name,
        page: c.monitoredPage?.url ?? `${c.website.url} (site-wide)`,
        detectedAt: iso(c.detectedAt),
        link: `${appBaseUrl()}/dashboard/changes/${c.id}`,
      });
    },
  },
  {
    name: "get_scans",
    title: "Get scans",
    description: "Recent scans, newest first: when, why (scheduled, manual, deploy), pages scanned or failed, changes found and the worst severity.",
    inputSchema: {
      type: "object",
      properties: {
        website: websiteArg,
        limit: { type: "number", description: "Max scans. Default 10, max 30." },
      },
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const site = await resolveWebsite(ctx.workspaceId, args.website);
      const limit = intArg(args, "limit", 10, 1, 30);
      const scans = await prisma.scan.findMany({
        where: { website: { workspaceId: ctx.workspaceId }, websiteId: site?.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          status: true,
          triggerType: true,
          createdAt: true,
          completedAt: true,
          pagesScanned: true,
          pagesFailed: true,
          changesDetected: true,
          highestSeverity: true,
          errorMessage: true,
          website: { select: { name: true } },
        },
      });
      return textResult(
        `${scans.length} recent scan${scans.length === 1 ? "" : "s"}${site ? ` of ${site.name}` : ""}.`,
        scans.map((s) => ({
          id: s.id,
          website: s.website.name,
          status: s.status,
          trigger: s.triggerType,
          startedAt: iso(s.createdAt),
          completedAt: iso(s.completedAt),
          pagesScanned: s.pagesScanned,
          pagesFailed: s.pagesFailed,
          changesDetected: s.changesDetected,
          highestSeverity: s.highestSeverity,
          error: clip(s.errorMessage, 200),
        })),
      );
    },
  },
  {
    name: "get_site_audit",
    title: "Get site audit",
    description:
      "The latest completed Site Audit for a website: health score, error/warning/notice counts and the top issues with how to fix them - including the AI search (AEO/GEO) checks.",
    inputSchema: {
      type: "object",
      properties: { website: { ...websiteArg, description: "Website id, name or domain." } },
      required: ["website"],
      additionalProperties: false,
    },
    run: async (args, ctx) => {
      const site = await resolveWebsite(ctx.workspaceId, args.website);
      if (!site) throw new ToolInputError("website is required.");
      const audit = await prisma.siteAudit.findFirst({
        where: { websiteId: site.id, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: {
          completedAt: true,
          healthScore: true,
          pagesCrawled: true,
          errorCount: true,
          warningCount: true,
          noticeCount: true,
          issues: true,
        },
      });
      if (!audit) return textResult(`${site.name} has no completed Site Audit yet. Run one from the MyKavo dashboard.`);
      const groups = Array.isArray(audit.issues) ? (audit.issues as Array<{ checkId?: string; count?: number }>) : [];
      const order = { ERROR: 0, WARNING: 1, NOTICE: 2 } as const;
      const top = groups
        .filter((g) => g.checkId && AUDIT_CHECKS[g.checkId])
        .map((g) => ({ def: AUDIT_CHECKS[g.checkId!], id: g.checkId!, count: g.count ?? 0 }))
        .sort((a, b) => order[a.def.severity] - order[b.def.severity] || b.count - a.count)
        .slice(0, 15)
        .map((g) => ({
          severity: g.def.severity,
          category: g.def.category,
          issue: g.def.title,
          pages: g.count,
          fix: g.def.fix,
        }));
      return textResult(
        `${site.name}: health ${audit.healthScore ?? "-"}/100 from ${audit.pagesCrawled} pages - ${audit.errorCount} errors, ${audit.warningCount} warnings, ${audit.noticeCount} notices.`,
        { completedAt: iso(audit.completedAt), topIssues: top, link: `${appBaseUrl()}/dashboard/site-audit` },
      );
    },
  },
];
