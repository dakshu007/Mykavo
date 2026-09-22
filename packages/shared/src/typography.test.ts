import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

/**
 * House style: hyphens, never em or en dashes.
 *
 * This is a guard rather than a preference written down somewhere nobody
 * reads. Em dashes had crept into the severity engine - which writes the
 * sentences customers read in their alerts - into three email templates, and
 * into the landing copy, because they are easy to type and nothing objected.
 *
 * Runs over the repository's own sources via git, so it covers every package
 * at once and cannot fall out of date as files are added.
 */
describe("house typography", () => {
  const OFFENDERS = [
    ["—", "em dash"],
    ["–", "en dash"],
    ["&mdash;", "HTML em dash entity"],
    ["&ndash;", "HTML en dash entity"],
  ] as const;

  it.each(OFFENDERS)("has no %s (%s) in any source file", (needle) => {
    // -F fixed string, -l names only. `|| true` because grep exits 1 when it
    // finds nothing, which is the passing case here.
    const out = execSync(
      `git grep -lF -- '${needle}' -- '*.ts' '*.tsx' ':!*typography.test.ts' || true`,
      { cwd: process.cwd(), encoding: "utf8" },
    ).trim();
    expect(out).toBe("");
  });
});
