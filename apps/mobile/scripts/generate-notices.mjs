/**
 * Generates the third-party attribution notices the app ships with.
 *
 * MIT, ISC, BSD and Apache all require that their copyright and permission
 * notices travel with any redistribution - which is exactly what shipping an
 * APK is. This produces that attribution from the REAL dependency tree rather
 * than a hand-kept list, because a hand-kept list is wrong the moment somebody
 * adds a package.
 *
 * Scope is the PRODUCTION closure (`npm ls --omit=dev`), i.e. what actually
 * ends up inside the app. Build-only tooling - Metro, ESLint, the Expo CLI and
 * everything under it - is not redistributed and so is not listed. That
 * deliberately excludes node-forge and lightningcss, the only two packages in
 * the whole tree with copyleft-adjacent terms; both are Expo CLI build tools.
 *
 * Outputs:
 *   THIRD-PARTY-NOTICES.md      full attribution, for the repo and the store
 *   src/lib/licenses.generated.ts  the same data, compact, for the in-app screen
 *
 * Run: npm run notices           write the files
 *      npm run notices:check     verify the checked-in files match the tree
 *
 * `--check` compares generated content against what is on disk and exits 1 on
 * any difference. It deliberately does NOT consult git: a freshly added file
 * that is correct must pass, and a tracked file that is stale must fail, and
 * git status cannot tell those apart.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");

/** Candidate license filenames, most specific first. */
const LICENSE_FILES = [
  "LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "license.txt",
  "LICENCE", "LICENCE.md", "LICENCE.txt", "COPYING", "COPYING.md",
];

function readLicenseText(dir) {
  for (const name of LICENSE_FILES) {
    const file = join(dir, name);
    if (existsSync(file)) {
      try {
        const text = readFileSync(file, "utf8").trim();
        if (text.length > 0) return text;
      } catch {
        // Unreadable - fall through to the next candidate.
      }
    }
  }
  // Some packages only ship the notice inside their readme.
  for (const name of readdirSync(dir).filter((n) => /^readme/i.test(n))) {
    try {
      const text = readFileSync(join(dir, name), "utf8");
      const match = text.match(/^#+\s*Licen[cs]e[\s\S]{0,4000}$/im);
      if (match) return match[0].trim();
    } catch {
      // Ignore.
    }
  }
  return null;
}

/** The "Copyright ..." line, for packages whose full text we could not find. */
function copyrightLine(text, pkg) {
  if (text) {
    const match = text.match(/copyright\s*(\(c\)|©)?\s*[^\n]{3,120}/i);
    if (match) return match[0].trim();
  }
  const author = typeof pkg.author === "string" ? pkg.author : pkg.author?.name;
  return author ? `Copyright (c) ${author}` : null;
}

function licenseId(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses) && pkg.licenses[0]?.type) return pkg.licenses[0].type;
  return "UNKNOWN";
}

/* ------------------------ collect the shipped closure --------------------- */

const tree = JSON.parse(
  execFileSync("npm", ["ls", "--omit=dev", "--all", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    // `npm ls` exits non-zero on peer-dependency gripes while still printing a
    // complete tree; the tree is what we need.
    stdio: ["ignore", "pipe", "ignore"],
  }),
);

const seen = new Map();
(function walk(node) {
  for (const [name, child] of Object.entries(node.dependencies ?? {})) {
    const key = `${name}@${child.version ?? "?"}`;
    if (!seen.has(key)) {
      seen.set(key, { name, version: child.version ?? "?", path: child.path ?? null });
      walk(child);
    }
  }
})(tree);

const packages = [];
const notInstalled = [];
for (const { name, version, path } of seen.values()) {
  // `npm ls` also reports unmet optional/peer dependencies. Those are not on
  // disk and therefore not in the APK, so attributing them would be wrong -
  // and would list them as "UNKNOWN", which reads like a compliance gap that
  // does not exist.
  const candidates = [path, join(ROOT, "node_modules", name)].filter(Boolean);
  const dir = candidates.find((d) => existsSync(join(d, "package.json")));
  if (!dir) {
    notInstalled.push(name);
    continue;
  }
  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    // Unreadable manifest - keep what npm told us.
  }
  const text = readLicenseText(dir);
  packages.push({
    name,
    version: version !== "?" ? version : (pkg.version ?? "?"),
    license: licenseId(pkg),
    copyright: copyrightLine(text, pkg),
    text,
    homepage: typeof pkg.homepage === "string" ? pkg.homepage : null,
  });
}
packages.sort((a, b) => a.name.localeCompare(b.name));

/* ------------------------------- markdown -------------------------------- */

const byLicense = new Map();
for (const p of packages) {
  const list = byLicense.get(p.license) ?? [];
  list.push(p);
  byLicense.set(p.license, list);
}
const licenseOrder = [...byLicense.keys()].sort(
  (a, b) => byLicense.get(b).length - byLicense.get(a).length || a.localeCompare(b),
);

// One copy of each distinct licence text, referenced by the packages using it -
// 218 near-identical MIT texts would bury the information rather than present it.
const uniqueTexts = new Map();
for (const p of packages) {
  if (!p.text) continue;
  if (!uniqueTexts.has(p.text)) uniqueTexts.set(p.text, []);
  uniqueTexts.get(p.text).push(`${p.name}@${p.version}`);
}

const md = [];
md.push("# Third-party notices");
md.push("");
md.push(
  "MyKavo for Android bundles the open-source packages listed below. Their",
  "licences require that these notices travel with the app, so this file is",
  "generated from the real dependency tree by `npm run notices` and checked in.",
  "",
);
md.push(
  `Scope: the **production** dependency closure - ${packages.length} packages that ship`,
  "inside the APK. Build-only tooling (Metro, ESLint, the Expo CLI) is not",
  "redistributed and is therefore not listed.",
  "",
);
md.push("## Summary", "");
md.push("| Licence | Packages |", "| --- | ---: |");
for (const id of licenseOrder) md.push(`| ${id} | ${byLicense.get(id).length} |`);
md.push("");

md.push("## Packages", "");
for (const id of licenseOrder) {
  md.push(`### ${id}`, "");
  for (const p of byLicense.get(id)) {
    const parts = [`- **${p.name}** ${p.version}`];
    if (p.copyright) parts.push(` - ${p.copyright}`);
    md.push(parts.join(""));
  }
  md.push("");
}

md.push("## Licence texts", "");
let index = 0;
for (const [text, users] of uniqueTexts) {
  index += 1;
  md.push(`### ${index}. ${users.length === 1 ? users[0] : `${users[0]} and ${users.length - 1} other package(s)`}`);
  md.push("");
  if (users.length > 1) {
    md.push("<details><summary>Packages under this text</summary>", "");
    md.push(users.map((u) => `- ${u}`).join("\n"), "");
    md.push("</details>", "");
  }
  md.push("```text", text, "```", "");
}

const noticesPath = join(ROOT, "THIRD-PARTY-NOTICES.md");
const noticesBody = md.join("\n").trimEnd() + "\n";

/* ---------------------------- in-app data -------------------------------- */

const compact = packages.map((p) => ({
  name: p.name,
  version: p.version,
  license: p.license,
  ...(p.copyright ? { copyright: p.copyright } : {}),
}));

const ts = `/**
 * GENERATED by scripts/generate-notices.mjs - do not edit by hand.
 * Run \`npm run notices\` after changing dependencies.
 *
 * The ${packages.length} open-source packages that ship inside the app, for the
 * Settings -> Open source licences screen. Full licence texts live in
 * THIRD-PARTY-NOTICES.md at the repo root.
 */

export interface ThirdPartyPackage {
  name: string;
  version: string;
  license: string;
  copyright?: string;
}

export const THIRD_PARTY_PACKAGES: readonly ThirdPartyPackage[] = ${JSON.stringify(
  compact,
  null,
  2,
)} as const;

/** Licence id -> how many shipped packages use it, most common first. */
export const LICENSE_SUMMARY: readonly (readonly [string, number])[] = ${JSON.stringify(
  licenseOrder.map((id) => [id, byLicense.get(id).length]),
)} as const;
`;

const generatedPath = join(ROOT, "src", "lib", "licenses.generated.ts");

/** Write, or in --check mode report a mismatch. Returns true when it differs. */
function emit(path, body) {
  if (!CHECK_ONLY) {
    writeFileSync(path, body);
    return false;
  }
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === body) return false;
  console.error(
    current === null
      ? `MISSING: ${path}`
      : `STALE:   ${path} (${current.length} bytes on disk, ${body.length} generated)`,
  );
  return true;
}

const drifted = [emit(noticesPath, noticesBody), emit(generatedPath, ts)].some(Boolean);

if (drifted) {
  console.error("Third-party notices are out of date. Run: npm run notices");
  process.exit(1);
}

const missing = packages.filter((p) => !p.text && !p.copyright);
console.log(
  `notices: ${packages.length} shipped packages, ${uniqueTexts.size} distinct licence texts`,
);
if (notInstalled.length > 0) {
  console.log(`  skipped ${notInstalled.length} unmet optional/peer dep(s): ${notInstalled.join(", ")}`);
}
if (missing.length > 0) {
  // Upstream shipped no LICENSE file and no author field. Their declared SPDX
  // id still appears in the list; there is simply no copyright line to quote.
  console.log(`  no copyright line published by: ${missing.map((p) => p.name).join(", ")}`);
}
