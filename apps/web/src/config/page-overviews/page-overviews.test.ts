import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALTERNATIVES } from "@/config/alternatives";
import { COMPARISONS } from "@/config/comparisons";
import { overviewPaths, pageOverview } from "./index";

/** The writing rules in types.ts, enforced. */
describe("page overviews", () => {
  const paths = overviewPaths();

  it("covers every free tool page", () => {
    const toolsDir = join(__dirname, "../../app/tools");
    const tools = readdirSync(toolsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(toolsDir, d.name, "page.tsx")))
      .map((d) => `/tools/${d.name}`);
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) expect(paths, `missing overview for ${t}`).toContain(t);
  });

  it("covers every comparison and alternative page", () => {
    for (const c of COMPARISONS) expect(paths).toContain(`/compare/${c.slug}`);
    for (const a of ALTERNATIVES) expect(paths).toContain(`/alternatives/${a.slug}`);
  });

  it.each(paths)("%s follows the writing rules", (path) => {
    const o = pageOverview(path)!;
    expect(o.answer.length).toBeGreaterThan(80);
    expect(o.answer.length).toBeLessThan(600);
    expect(o.takeaways.length).toBeGreaterThanOrEqual(3);
    expect(o.takeaways.length).toBeLessThanOrEqual(4);
    for (const text of [o.answer, ...o.takeaways]) {
      expect(text, "no em or en dashes").not.toMatch(/[–—]/);
      expect(text.trim()).toBe(text);
    }
    expect(new Set(o.takeaways).size).toBe(o.takeaways.length);
  });

  it("every tool page renders its overview", () => {
    for (const path of paths.filter((p) => p.startsWith("/tools/"))) {
      const file = join(__dirname, "../../app", path, "page.tsx");
      expect(readFileSync(file, "utf8"), file).toContain(`path="${path}"`);
    }
  });
});
