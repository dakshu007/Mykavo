/**
 * The two usage figures that cost money as they grow and that the operator
 * watches most: AI spend (Anthropic) and database egress (Supabase).
 *
 * AI spend is exact: every call's price is stored with it in ai_insight
 * (lib/ai/client.ts). Egress is an estimate from the database server's own
 * bytes-sent counter, sampled hourly by the worker; Supabase meters egress its
 * own way, so the page says "estimated" and links nothing it cannot back up.
 */

import { prisma } from "@mykavo/database";
import {
  EGRESS_METRIC,
  billingCycleEnd,
  billingCycleStart,
  counterIncrease,
  projectCycleUsage,
  type CounterReading,
} from "@mykavo/shared";
import { aiConfigured, monthlyBudgetMicroUsd, startOfUtcMonth } from "@/lib/ai/client";
import { env } from "@/lib/env";

const DAY_MS = 86_400_000;

export interface AiSpend {
  configured: boolean;
  monthUsd: number;
  budgetUsd: number;
  allTimeUsd: number;
  last24hUsd: number;
  explanations: number;
  weeklyNotes: number;
  wastedCalls: number;
  /** Average cost of one explanation this month, null before the first. */
  perExplanationUsd: number | null;
  topWorkspaces: { name: string; usd: number; calls: number }[];
}

const usd = (micro: number | null | undefined) => (micro ?? 0) / 1_000_000;

export async function collectAiSpend(now: Date): Promise<AiSpend> {
  const monthStart = startOfUtcMonth(now);
  const [byKind, allTime, last24h, byWorkspace] = await Promise.all([
    prisma.aiInsight.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
      _sum: { costMicroUsd: true },
    }),
    prisma.aiInsight.aggregate({ _sum: { costMicroUsd: true } }),
    prisma.aiInsight.aggregate({
      where: { createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
      _sum: { costMicroUsd: true },
    }),
    prisma.aiInsight.groupBy({
      by: ["workspaceId"],
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
      _sum: { costMicroUsd: true },
      orderBy: { _sum: { costMicroUsd: "desc" } },
      take: 5,
    }),
  ]);

  const kind = (k: string) => byKind.find((r) => r.kind === k);
  const names = await prisma.workspace.findMany({
    where: { id: { in: byWorkspace.map((w) => w.workspaceId) } },
    select: { id: true, name: true },
  });
  const explanations = kind("change_explanation");

  return {
    configured: aiConfigured(),
    monthUsd: usd(byKind.reduce((s, r) => s + (r._sum.costMicroUsd ?? 0), 0)),
    budgetUsd: usd(monthlyBudgetMicroUsd()),
    allTimeUsd: usd(allTime._sum.costMicroUsd),
    last24hUsd: usd(last24h._sum.costMicroUsd),
    explanations: explanations?._count._all ?? 0,
    weeklyNotes: kind("weekly_summary")?._count._all ?? 0,
    wastedCalls: kind("failed")?._count._all ?? 0,
    perExplanationUsd:
      explanations && explanations._count._all > 0
        ? usd(explanations._sum.costMicroUsd) / explanations._count._all
        : null,
    topWorkspaces: byWorkspace.map((w) => ({
      name: names.find((n) => n.id === w.workspaceId)?.name ?? "Deleted workspace",
      usd: usd(w._sum.costMicroUsd),
      calls: w._count._all,
    })),
  };
}

export interface Egress {
  /** False until the worker has stored a reading (no SUPABASE_METRICS_KEY yet). */
  sampling: boolean;
  cycleStart: Date;
  cycleEnd: Date;
  cycleBytes: number;
  last24hBytes: number | null;
  projectedBytes: number | null;
  /** First reading this cycle came well after it began: the figure is a floor. */
  partial: boolean;
  /** When the newest reading was taken. */
  lastReadingAt: Date | null;
}

function cycleDay(): number {
  const n = Number(env.SUPABASE_BILLING_CYCLE_DAY ?? "1");
  return Number.isFinite(n) ? n : 1;
}

export async function collectEgress(now: Date): Promise<Egress> {
  const cycleStart = billingCycleStart(now, cycleDay());
  const cycleEnd = billingCycleEnd(cycleStart);
  const rows = await prisma.usageSample.findMany({
    where: { metric: EGRESS_METRIC, sampledAt: { gte: cycleStart } },
    orderBy: { sampledAt: "asc" },
    select: { value: true, sampledAt: true },
  });
  const readings: CounterReading[] = rows.map((r) => ({ value: r.value, at: r.sampledAt }));

  if (readings.length === 0) {
    const ever = await prisma.usageSample.findFirst({
      where: { metric: EGRESS_METRIC },
      orderBy: { sampledAt: "desc" },
      select: { sampledAt: true },
    });
    return {
      sampling: ever !== null,
      cycleStart,
      cycleEnd,
      cycleBytes: 0,
      last24hBytes: null,
      projectedBytes: null,
      partial: ever !== null,
      lastReadingAt: ever?.sampledAt ?? null,
    };
  }

  const cycleBytes = counterIncrease(readings);
  const dayAgo = now.getTime() - DAY_MS;
  const lastDay = readings.filter((r) => r.at.getTime() >= dayAgo);
  const first = readings[0]!;
  const partial = first.at.getTime() - cycleStart.getTime() > 2 * 3_600_000;
  const projected = projectCycleUsage({ used: cycleBytes, measuredFrom: first.at, now, cycleEnd });
  // Readings began after the cycle did: add the unmeasured start at the same rate.
  const elapsed = now.getTime() - first.at.getTime();
  const unmeasured = partial && elapsed > 0 ? (cycleBytes / elapsed) * (first.at.getTime() - cycleStart.getTime()) : 0;

  return {
    sampling: true,
    cycleStart,
    cycleEnd,
    cycleBytes,
    last24hBytes: lastDay.length >= 2 ? counterIncrease(lastDay) : null,
    projectedBytes: projected === null ? null : projected + unmeasured,
    partial,
    lastReadingAt: readings[readings.length - 1]!.at,
  };
}
