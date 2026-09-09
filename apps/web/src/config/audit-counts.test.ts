import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_CHECK_COUNT, AUDIT_CATEGORY_COUNT } from "@mykavo/seo-audit";

/**
 * The audit check and category counts are quoted as fact on the homepage, the
 * Site Audit section, the comparison pages and llms.txt - and the comparison
 * config says in as many words that "every MyKavo figure here is verifiable
 * from the codebase".
 *
 * They drifted anyway: the pages claimed 86 checks across 21 categories while
 * the registry held 89 across 22. Understating is the safer direction, but a
 * public claim that does not survive a reader checking it is still wrong, and
 * a page arguing for its own accuracy is the worst place to be inaccurate.
 *
 * So this reads the shipped copy and compares it against the registry. If it
 * fails, the registry changed and the sentences below need updating with it.
 */

const FILES = [
  "src/components/landing/site-audit.tsx",
  "src/components/landing/comparison-page.tsx",
  "src/config/comparisons.ts",
  "src/app/page.tsx",
  "src/app/llms.txt/route.ts",
  "src/app/compare/page.tsx",
];

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("published audit counts match the registry", () => {
  it.each(FILES)("%s quotes no stale check count", (file) => {
    const text = read(file);
    const claims = [...text.matchAll(/(\d+)\s+checks/g)].map((m) => Number(m[1]));
    for (const claimed of claims) {
      expect(claimed, `${file} claims ${claimed} checks`).toBe(AUDIT_CHECK_COUNT);
    }
  });

  it.each(FILES)("%s quotes no stale category count", (file) => {
    const text = read(file);
    const claims = [...text.matchAll(/(\d+)\s+categories/g)].map((m) => Number(m[1]));
    for (const claimed of claims) {
      expect(claimed, `${file} claims ${claimed} categories`).toBe(AUDIT_CATEGORY_COUNT);
    }
  });

  // Guards the guard: if the registry is ever emptied or the export breaks,
  // the assertions above would pass vacuously against 0.
  it("reads real counts from the registry", () => {
    expect(AUDIT_CHECK_COUNT).toBeGreaterThan(50);
    expect(AUDIT_CATEGORY_COUNT).toBeGreaterThan(10);
  });
});
