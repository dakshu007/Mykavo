/**
 * Runs AI Keyword Agent jobs from the "ai-agent" queue: site setup, deep
 * analysis and post writing (packages/keyword-agent). The web app creates the
 * ai_job row (and reserves quota) before queueing; this file does the work,
 * keeps the row's step and progress current for the page that polls it, and
 * always ends the job as done or failed. A failed job gets its quota back.
 *
 * Jobs are never retried by pg-boss (retryLimit 0): a retry would spend money
 * again. A job left "running" by a crash is failed and refunded by the next
 * job or the nightly retention pass.
 */
import { getWorkspaceEntitlement, prisma, Prisma } from "@mykavo/database";
import { sendEmail } from "@mykavo/email";
import type { AiAgentJob } from "@mykavo/shared";
import {
  AgentError,
  SiteReadError,
  buildProfile,
  collectAutocomplete,
  createAgentClient,
  profileInput,
  profilePages,
  readSite,
  runDeepAnalysis,
  writeJobInput,
  writePost,
  type AgentDeps,
  type AgentRun,
  type AutocompleteCacheStore,
} from "@mykavo/keyword-agent";
import { logger } from "./logger";

const DAY_MS = 86_400_000;

/** Per-job spending ceilings (micro-USD), on top of the monthly agent cap. */
const JOB_CEILING: Record<string, number> = {
  setup: 20_000, // $0.02: one Haiku call
  deep: 600_000, // $0.60: two Haiku, one research, one Sonnet call
  write: 400_000, // $0.40: one Sonnet call
};

/** A job running longer than this was orphaned by a crash. */
const STALE_RUNNING_MS = 30 * 60_000;
const STALE_QUEUED_MS = 3 * 60 * 60_000;

let client: AgentDeps["client"] | null = null;
function anthropic(): AgentDeps["client"] {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AgentError("failed", "The AI writer isn't set up on this server yet.");
  client ??= createAgentClient(key);
  return client;
}

const autocompleteCache: AutocompleteCacheStore = {
  async get(query, country, language) {
    const row = await prisma.autocompleteCache.findUnique({
      where: { query_country_language: { query, country, language } },
      select: { suggestions: true, fetchedAt: true },
    });
    if (!row || Date.now() - row.fetchedAt.getTime() > 30 * DAY_MS) return null;
    return Array.isArray(row.suggestions) ? row.suggestions.filter((s): s is string => typeof s === "string") : null;
  },
  async put(query, country, language, suggestions) {
    await prisma.autocompleteCache.upsert({
      where: { query_country_language: { query, country, language } },
      create: { query, country, language, suggestions },
      update: { suggestions, fetchedAt: new Date() },
    });
  },
};

async function progress(aiJobId: string, step: string, value: number): Promise<void> {
  await prisma.aiJob.update({ where: { id: aiJobId }, data: { step, progress: value } }).catch(() => {});
}

/** Fails and refunds jobs a crash left behind. Safe to run any time. */
export async function failStaleAgentJobs(now = Date.now()): Promise<number> {
  const stale = await prisma.aiJob.findMany({
    where: {
      OR: [
        { status: "running", startedAt: { lt: new Date(now - STALE_RUNNING_MS) } },
        { status: "queued", createdAt: { lt: new Date(now - STALE_QUEUED_MS) } },
      ],
    },
    select: { id: true },
    take: 100,
  });
  for (const job of stale) {
    await finishFailed(job.id, "This job was interrupted. Your allowance has been returned; please try again.");
  }
  return stale.length;
}

async function finishFailed(aiJobId: string, message: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.aiJob.updateMany({
      where: { id: aiJobId, status: { in: ["queued", "running"] } },
      data: { status: "failed", error: message.slice(0, 300), finishedAt: now },
    }),
    prisma.aiQuotaUse.updateMany({ where: { aiJobId, refundedAt: null }, data: { refundedAt: now } }),
  ]);
  // A failed rewrite gives its free regeneration back.
  const job = await prisma.aiJob.findUnique({ where: { id: aiJobId }, select: { kind: true, input: true } });
  const input = writeJobInput.safeParse(job?.input);
  if (job?.kind === "write" && input.success && input.data.postId) {
    await prisma.contentPost
      .updateMany({ where: { id: input.data.postId, regenerationsUsed: { gt: 0 } }, data: { regenerationsUsed: { decrement: 1 } } })
      .catch(() => {});
  }
}

function userMessage(err: unknown): string {
  if (err instanceof AgentError || err instanceof SiteReadError) return err.message;
  return "Something went wrong on our side. Your allowance has been returned; please try again.";
}

export async function runAiAgentJob(job: AiAgentJob): Promise<void> {
  await failStaleAgentJobs().catch(() => {});

  const row = await prisma.aiJob.findUnique({
    where: { id: job.aiJobId },
    include: { website: { select: { id: true, name: true, url: true } } },
  });
  // Idempotent: a finished job is never run (or charged) twice.
  if (!row || row.status === "done" || row.status === "failed") return;

  await prisma.aiJob.update({
    where: { id: row.id },
    data: { status: "running", startedAt: new Date(), step: "Starting", progress: 5 },
  });

  try {
    const ent = await getWorkspaceEntitlement(prisma, row.workspaceId);
    const run: AgentRun = {
      aiJobId: row.id,
      workspaceId: row.workspaceId,
      websiteId: row.websiteId,
      plan: ent?.planId ?? "free",
      maxCostMicroUsd: JOB_CEILING[row.kind] ?? 100_000,
      spentMicroUsd: 0,
    };
    const deps: AgentDeps = {
      db: prisma,
      client: anthropic(),
      budgetUsd: process.env.AI_AGENT_MONTHLY_BUDGET_USD,
    };

    let resultId: string;
    if (row.kind === "setup") resultId = await runSetup(deps, run, row.website);
    else if (row.kind === "deep") resultId = await runDeep(deps, run, row.website);
    else if (row.kind === "write") resultId = await runWrite(deps, run, row.website, row.input);
    else throw new AgentError("failed", "Unknown job type.");

    await prisma.aiJob.update({
      where: { id: row.id },
      data: { status: "done", step: "Done", progress: 100, resultId, finishedAt: new Date() },
    });
    logger.info("ai agent job done", { aiJobId: row.id, kind: row.kind, websiteId: row.websiteId, costMicroUsd: run.spentMicroUsd });
    if (row.kind === "deep" && row.userId) await emailReady(row.userId, row.website).catch(() => {});
  } catch (err) {
    logger.warn("ai agent job failed", {
      aiJobId: row.id,
      kind: row.kind,
      code: err instanceof AgentError || err instanceof SiteReadError ? err.code : "error",
      error: err instanceof Error ? err.message : String(err),
    });
    await finishFailed(row.id, userMessage(err));
  }
}

type Site = { id: string; name: string; url: string };

async function runSetup(deps: AgentDeps, run: AgentRun, site: Site): Promise<string> {
  await progress(run.aiJobId, "Reading your site", 20);
  const snapshot = await readSite(site.url, { maxPages: 12 });
  await progress(run.aiJobId, "Understanding your business", 60);
  const result = await buildProfile(deps, run, { siteUrl: site.url, siteName: site.name, snapshot });
  const data = { ...result.profile, pages: result.pages, confirmed: false };
  const saved = await prisma.contentProfile.upsert({
    where: { websiteId: site.id },
    create: { websiteId: site.id, workspaceId: run.workspaceId, ...data },
    update: data,
    select: { id: true },
  });
  return saved.id;
}

async function confirmedProfile(websiteId: string) {
  const profile = await prisma.contentProfile.findUnique({ where: { websiteId } });
  if (!profile?.confirmed) throw new AgentError("failed", "Confirm your business details first.");
  const parsed = profileInput.safeParse(profile);
  if (!parsed.success) throw new AgentError("failed", "Your business details need a quick review before continuing.");
  const parsedPages = profilePages.safeParse(profile.pages);
  const pages = parsedPages.success ? parsedPages.data : [];
  return { profile: parsed.data, pages };
}

async function runDeep(deps: AgentDeps, run: AgentRun, site: Site): Promise<string> {
  const { profile, pages } = await confirmedProfile(site.id);
  const result = await runDeepAnalysis(deps, run, {
    profile,
    siteUrl: site.url,
    existingPages: pages,
    collect: (queries) =>
      collectAutocomplete({ queries, country: profile.country, language: profile.language, cache: autocompleteCache, maxLive: 40 }),
    onProgress: (step, value) => progress(run.aiJobId, step, value),
  });

  // Real Search Console figures for keywords the site already ranks for.
  // Joined here in code; Search Console data is never sent to the model.
  const gsc = await prisma.gscQueryPage.findMany({
    where: { websiteId: site.id, query: { in: result.opportunities.map((o) => o.keyword) } },
    select: { query: true, position: true, impressions: true },
  });
  const best = new Map<string, { position: number; impressions: number }>();
  for (const r of gsc) {
    const prev = best.get(r.query);
    if (!prev || r.impressions > prev.impressions) best.set(r.query, { position: r.position, impressions: r.impressions });
  }

  const report = await prisma.keywordReport.create({
    data: {
      websiteId: site.id,
      workspaceId: run.workspaceId,
      aiJobId: run.aiJobId,
      summary: result.summary,
      expiresAt: new Date(Date.now() + 60 * DAY_MS),
      opportunities: {
        create: result.opportunities.map((o) => ({
          ...o,
          position: best.get(o.keyword)?.position ?? null,
          impressions: best.get(o.keyword)?.impressions ?? null,
        })),
      },
    },
    select: { id: true },
  });
  return report.id;
}

async function runWrite(deps: AgentDeps, run: AgentRun, site: Site, rawInput: Prisma.JsonValue): Promise<string> {
  const input = writeJobInput.parse(rawInput);
  const { profile, pages } = await confirmedProfile(site.id);
  await progress(run.aiJobId, "Writing your post", 30);
  const existing = await prisma.contentPost.findMany({
    where: { websiteId: site.id },
    select: { title: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const post = await writePost(deps, run, {
    keyword: input.keyword,
    notes: input.notes,
    profile,
    siteName: site.name,
    siteUrl: site.url,
    pages,
    existingTitles: existing.map((p) => p.title),
  });
  await progress(run.aiJobId, "Saving your draft", 90);
  const data = {
    keyword: input.keyword,
    title: post.title,
    slug: post.slug,
    metaDescription: post.metaDescription,
    bodyHtml: post.bodyHtml,
    faq: post.faq,
    jsonLd: post.jsonLd as Prisma.InputJsonValue,
    reviewNotes: post.reviewNotes,
    aiJobId: run.aiJobId,
  };
  if (input.postId) {
    const updated = await prisma.contentPost.update({
      where: { id: input.postId, websiteId: site.id },
      data: { ...data, status: "draft", version: { increment: 1 } },
      select: { id: true },
    });
    return updated.id;
  }
  const created = await prisma.contentPost.create({
    data: { ...data, websiteId: site.id, workspaceId: run.workspaceId },
    select: { id: true },
  });
  return created.id;
}

async function emailReady(userId: string, site: Site): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (!user?.email || !user.emailVerified) return;
  const appUrl = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
  const link = `${appUrl}/dashboard/keywords/${site.id}`;
  const name = site.name.replace(/[<>&"]/g, "");
  await sendEmail({
    to: [user.email],
    subject: `Your keyword report for ${name} is ready`,
    html: `<p>Your MyKavo keyword report for <b>${name}</b> is ready, with the posts worth writing next.</p><p><a href="${link}">Open your report</a></p>`,
    text: `Your MyKavo keyword report for ${name} is ready: ${link}`,
  });
}

/** Nightly: drop logs after 7 days, cached ideas after 30, expired reports, old jobs. */
export async function runAgentRetention(now = Date.now()): Promise<Record<string, number>> {
  await failStaleAgentJobs(now);
  const [steps, cache, reports, jobs] = await prisma.$transaction([
    prisma.agentStep.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY_MS) } } }),
    prisma.autocompleteCache.deleteMany({ where: { fetchedAt: { lt: new Date(now - 30 * DAY_MS) } } }),
    prisma.keywordReport.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    prisma.aiJob.deleteMany({
      where: { status: { in: ["done", "failed"] }, createdAt: { lt: new Date(now - 90 * DAY_MS) } },
    }),
  ]);
  return { steps: steps.count, cache: cache.count, reports: reports.count, jobs: jobs.count };
}
