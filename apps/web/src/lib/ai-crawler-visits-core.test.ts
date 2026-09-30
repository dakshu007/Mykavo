import { describe, expect, it } from "vitest";
import { rowsFromReport, summarizeVisits, visitReportSchema } from "./ai-crawler-visits-core";

const now = new Date("2026-10-01T12:00:00Z");

describe("rowsFromReport", () => {
  it("keeps known crawlers under their canonical name and drops the rest", () => {
    const report = visitReportSchema.parse({
      days: [
        {
          day: "2026-09-30",
          agents: [
            { agent: "gptbot", hits: 12, errors: 2, paths: [{ path: "/pricing", hits: 7 }, { path: "/", hits: 5, errors: 2 }] },
            { agent: "Googlebot", hits: 400 },
            { agent: "ClaudeBot", hits: 3 },
          ],
        },
      ],
    });
    const rows = rowsFromReport(report, now);
    expect(rows.map((r) => r.agent)).toEqual(["GPTBot", "ClaudeBot"]);
    expect(rows[0]).toMatchObject({ day: "2026-09-30", hits: 12, errors: 2 });
    expect(rows[0].topPaths[0]).toEqual({ path: "/pricing", hits: 7, errors: 0 });
  });

  it("refuses future, ancient and impossible days, and non-path paths", () => {
    const report = visitReportSchema.parse({
      days: [
        { day: "2026-10-05", agents: [{ agent: "GPTBot", hits: 1 }] },
        { day: "2025-01-01", agents: [{ agent: "GPTBot", hits: 1 }] },
        { day: "2026-02-31", agents: [{ agent: "GPTBot", hits: 1 }] },
        { day: "2026-10-02", agents: [{ agent: "GPTBot", hits: 1, paths: [{ path: "https://evil.example/x", hits: 1 }] }] },
      ],
    });
    const rows = rowsFromReport(report, now);
    expect(rows).toHaveLength(1);
    expect(rows[0].day).toBe("2026-10-02");
    expect(rows[0].topPaths).toEqual([]);
  });

  it("merges a crawler listed twice for one day and caps errors at hits", () => {
    const rows = rowsFromReport(
      visitReportSchema.parse({
        days: [
          {
            day: "2026-09-30",
            agents: [
              { agent: "GPTBot", hits: 2, errors: 9, paths: [{ path: "/a", hits: 2 }] },
              { agent: "GPTBOT", hits: 3, paths: [{ path: "/a", hits: 3 }] },
            ],
          },
        ],
      }),
      now,
    );
    expect(rows).toEqual([{ day: "2026-09-30", agent: "GPTBot", hits: 5, errors: 2, topPaths: [{ path: "/a", hits: 5, errors: 0 }] }]);
  });

  it("rejects oversized reports at the schema", () => {
    expect(visitReportSchema.safeParse({ days: Array.from({ length: 60 }, () => ({ day: "2026-09-30", agents: [] })) }).success).toBe(false);
  });
});

describe("summarizeVisits", () => {
  const rows = [
    { day: new Date("2026-09-30T00:00:00Z"), agent: "GPTBot", hits: 10, errors: 1, topPaths: [{ path: "/", hits: 6, errors: 1 }, { path: "/blog", hits: 4, errors: 0 }] },
    { day: new Date("2026-10-01T00:00:00Z"), agent: "ChatGPT-User", hits: 3, errors: 0, topPaths: [{ path: "/blog", hits: 3, errors: 0 }] },
    { day: new Date("2026-10-01T00:00:00Z"), agent: "PerplexityBot", hits: 5, errors: 0, topPaths: [] },
    { day: new Date("2026-07-01T00:00:00Z"), agent: "GPTBot", hits: 999, errors: 0, topPaths: [] },
  ];

  it("totals the window by crawler, day and page", () => {
    const s = summarizeVisits(rows, 30, now);
    expect(s.total).toBe(18);
    expect(s.errors).toBe(1);
    expect(s.answerHits).toBe(8);
    expect(s.crawlers.map((c) => [c.agent, c.hits])).toEqual([["GPTBot", 10], ["PerplexityBot", 5], ["ChatGPT-User", 3]]);
    expect(s.crawlers[0]).toMatchObject({ owner: "OpenAI", purpose: "training", lastSeen: "2026-09-30" });
    expect(s.daily).toHaveLength(30);
    expect(s.daily.at(-1)).toEqual({ day: "2026-10-01", hits: 8 });
    expect(s.pages[0]).toEqual({ path: "/blog", hits: 7, errors: 0, agents: ["ChatGPT-User", "GPTBot"] });
    expect(s.latestDay).toBe("2026-10-01");
  });

  it("is empty with no rows", () => {
    const s = summarizeVisits([], 30, now);
    expect(s).toMatchObject({ total: 0, crawlers: [], pages: [], latestDay: null });
  });
});
