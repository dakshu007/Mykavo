import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORT_ARTICLES, SUPPORT_CATEGORIES } from "@/config/support-kb";
import { createSupportEngine, DEFAULT_THRESHOLDS, DEFAULT_TUNING } from "./engine";
import { parseAnswer, safeHref } from "./markdown";

// The held-out eval phrasings stay out of this index, so the accuracy test
// measures questions the matcher has never seen.
const engine = createSupportEngine(SUPPORT_ARTICLES, DEFAULT_THRESHOLDS, { ...DEFAULT_TUNING, indexEvalQuestions: false });
const byId = new Map(SUPPORT_ARTICLES.map((a) => [a.id, a]));

/** Every page route under src/app, with route groups removed. */
function appRoutes(): RegExp[] {
  const root = join(__dirname, "..", "..", "app");
  const routes: RegExp[] = [];
  const walk = (dir: string, segments: string[]) => {
    if (existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "route.ts"))) {
      const pattern = segments
        .filter((s) => !/^\(.*\)$/.test(s))
        .map((s) => (/^\[\[?\.\.\./.test(s) ? ".*" : /^\[.*\]$/.test(s) ? "[^/]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        .join("/");
      routes.push(new RegExp(`^/${pattern}$`));
    }
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory() && !name.startsWith("_")) walk(full, [...segments, name]);
    }
  };
  walk(root, []);
  return routes;
}

describe("support knowledge base", () => {
  it("has unique ids and valid related links", () => {
    const ids = SUPPORT_ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of SUPPORT_ARTICLES) {
      expect(SUPPORT_CATEGORIES[a.category], a.id).toBeDefined();
      for (const r of a.related ?? []) expect(ids, `${a.id} → ${r}`).toContain(r);
    }
  });

  it("gives every article enough phrasings and held-out eval questions", () => {
    for (const a of SUPPORT_ARTICLES) {
      expect(a.questions.length, a.id).toBeGreaterThanOrEqual(10);
      expect(a.evalQuestions?.length ?? 0, a.id).toBeGreaterThanOrEqual(2);
      expect(a.answer.trim().length, a.id).toBeGreaterThan(40);
    }
  });

  it("uses plain hyphens, never em or en dashes", () => {
    for (const a of SUPPORT_ARTICLES) {
      const text = [a.title, a.answer, ...a.questions, ...(a.keywords ?? []), ...(a.evalQuestions ?? [])].join("\n");
      expect(/[–—]/.test(text), a.id).toBe(false);
    }
  });

  it("only links to safe targets and real pages", () => {
    const routes = appRoutes();
    for (const a of SUPPORT_ARTICLES) {
      for (const m of a.answer.matchAll(/\]\(([^)\s]+)\)/g)) {
        const href = m[1];
        expect(safeHref(href), `${a.id}: ${href}`).not.toBeNull();
        if (href.startsWith("/")) {
          const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
          expect(
            routes.some((r) => r.test(path)) || path === "/",
            `${a.id} links to ${href}, which is not a page`,
          ).toBe(true);
        }
      }
      expect(parseAnswer(a.answer).length, a.id).toBeGreaterThan(0);
    }
  });
});

describe("support assistant accuracy", () => {
  it("answers its own phrasings", () => {
    let right = 0;
    let total = 0;
    for (const a of SUPPORT_ARTICLES) {
      for (const q of a.questions) {
        total++;
        if (engine.rank(q)[0]?.article.id === a.id) right++;
      }
    }
    expect(right / total).toBeGreaterThanOrEqual(0.92);
  }, 60_000);

  it("answers held-out questions it has never seen", () => {
    let top1 = 0;
    let top3 = 0;
    let answered = 0;
    let acceptable = 0;
    let total = 0;
    const misses: string[] = [];
    for (const a of SUPPORT_ARTICLES) {
      for (const q of a.evalQuestions ?? []) {
        total++;
        const ranked = engine.rank(q);
        if (ranked[0]?.article.id === a.id) top1++;
        else misses.push(`${a.id} <- "${q}" got ${ranked[0]?.article.id}`);
        if (ranked.slice(0, 3).some((r) => r.article.id === a.id)) top3++;
        const reply = engine.ask(q);
        if (reply.kind === "answer") {
          answered++;
          const got = reply.article.id;
          // Right article, or one of the two links to the other.
          if (got === a.id || (a.related ?? []).includes(got) || (byId.get(got)?.related ?? []).includes(a.id)) acceptable++;
        }
      }
    }
    if (process.env.SUPPORT_EVAL_VERBOSE) console.log(misses.join("\n"));
    // These phrasings were written to avoid the indexed wording, so they are
    // harder than real questions; the bars guard against regressions.
    expect(top1 / total).toBeGreaterThanOrEqual(0.55);
    expect(top3 / total).toBeGreaterThanOrEqual(0.72);
    // When it answers outright, it must almost always be on target.
    expect(acceptable / answered).toBeGreaterThanOrEqual(0.88);
  }, 60_000);
});
