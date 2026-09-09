/**
 * Outreach helper: audit a list of prospects' sites and print, for each, the
 * single most alarming finding plus a paste-ready email.
 *
 *   pnpm --filter worker exec tsx src/scripts/prospect.ts domains.txt
 *   pnpm --filter worker exec tsx src/scripts/prospect.ts domains.txt --csv out.csv
 *
 * Why this exists: cold outreach for a monitoring product is weak ("would you
 * like to try my tool?") and strong when it leads with something true and
 * specific about the recipient's own site ("your pricing page has carried a
 * noindex tag since your last deploy"). MyKavo can produce that for any public
 * site, which is an advantage most products do not have. This turns fifty
 * manual audits into one command.
 *
 * Touches NO database and NO queue - it drives @mykavo/seo-audit directly, so
 * it needs no environment beyond a network connection.
 *
 * POLITENESS: it obeys robots.txt (runSiteAudit does), crawls far fewer pages
 * than a real audit, visits one site at a time, and pauses between sites. It
 * reads public pages exactly as any SEO tool or search engine does. Keep it
 * that way - the goal is to start a conversation, not to be a nuisance.
 */

import { readFileSync, writeFileSync } from "node:fs";
import {
  runSiteAudit,
  pickLeadFinding,
  auditIsTrustworthy,
  DEFAULT_LIMITS,
  type AuditResult,
  type LeadFinding,
} from "@mykavo/seo-audit";

/** One sentence naming the problem and where it is. This is the whole hook. */
function headline(finding: LeadFinding, domain: string): string {
  const where = finding.exampleUrl ? ` (${finding.exampleUrl})` : "";
  const scale =
    finding.group.count > 1 ? ` — and ${finding.group.count - 1} more like it` : "";
  return `${finding.title} on ${domain}${where}${scale}`;
}

function draftEmail(params: {
  domain: string;
  finding: LeadFinding;
  result: AuditResult;
  sender: string;
}): string {
  const { domain, finding, result, sender } = params;
  const others = Math.max(0, result.errorCount + result.warningCount - finding.group.count);
  const example = finding.exampleUrl ? `\n\n  ${finding.exampleUrl}` : "";

  // Short, specific, and honest about who is writing and why. No pitch in the
  // first message - the finding IS the pitch, and asking for nothing is what
  // makes it worth replying to.
  return [
    `Subject: ${finding.title.toLowerCase()} on ${domain}`,
    ``,
    `Hi,`,
    ``,
    `I was looking at ${domain} and spotted something worth a check: ${finding.explain.toLowerCase()}${example}`,
    ``,
    `Fix is usually quick — ${finding.fix.toLowerCase()}`,
    ``,
    others > 0
      ? `I ran a full technical crawl while I was there (${result.pagesCrawled} pages, health score ${result.healthScore}/100) and it flagged ${others} other things. Happy to send the whole list — no signup, just reply and I'll paste it over.`
      : `Happy to send the full crawl if it's useful — no signup, just reply.`,
    ``,
    `I found it with MyKavo, a website change monitoring tool I'm building. Not trying to sell you anything today — I just figured you'd want to know.`,
    ``,
    `— ${sender}`,
  ].join("\n");
}

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const flag = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    if (hit) return hit.split("=").slice(1).join("=");
    const idx = argv.indexOf(`--${name}`);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };
  return {
    listFile: positional[0],
    csv: flag("csv"),
    sender: flag("sender") ?? "Dakshesh",
    // Deliberately far below a real audit: enough to find the obvious
    // problems, light enough to be a good guest on someone else's server.
    maxPages: Number(flag("pages") ?? 40),
    delayMs: Number(flag("delay") ?? 3000),
  };
}

function toUrl(line: string): string | null {
  const raw = line.trim();
  if (!raw || raw.startsWith("#")) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).href;
  } catch {
    return null;
  }
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.listFile) {
    console.error(
      [
        "Usage: prospect.ts <domains.txt> [--csv out.csv] [--sender Name] [--pages 40] [--delay 3000]",
        "",
        "domains.txt: one domain or URL per line. Lines starting with # are ignored.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const urls = readFileSync(args.listFile, "utf8")
    .split("\n")
    .map(toUrl)
    .filter((u): u is string => u !== null);

  if (urls.length === 0) {
    console.error(`No usable domains in ${args.listFile}.`);
    process.exit(1);
  }

  console.error(`Auditing ${urls.length} site(s), ${args.maxPages} pages each…\n`);
  const rows: string[][] = [
    ["domain", "health", "pages", "errors", "warnings", "top_check", "top_title", "example_url"],
  ];

  for (const [i, url] of urls.entries()) {
    const domain = new URL(url).hostname;
    process.stderr.write(`[${i + 1}/${urls.length}] ${domain} … `);

    let result: AuditResult;
    try {
      result = await runSiteAudit(url, {
        ...DEFAULT_LIMITS,
        maxPages: args.maxPages,
        maxDurationMs: 90_000,
        // Gentle: a stranger's server should not notice this.
        concurrency: 2,
        maxExternalProbes: 20,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      process.stderr.write(`failed (${reason})\n`);
      rows.push([domain, "", "", "", "", "AUDIT_FAILED", reason, ""]);
      continue;
    }

    const trustworthy = auditIsTrustworthy(result);
    const finding = trustworthy ? pickLeadFinding(result) : null;
    process.stderr.write(
      `${result.pagesCrawled} pages, health ${result.healthScore}/100, ` +
        `${finding ? finding.checkId : "nothing worth leading with"}\n`,
    );

    rows.push([
      domain,
      String(result.healthScore),
      String(result.pagesCrawled),
      String(result.errorCount),
      String(result.warningCount),
      trustworthy ? (finding?.checkId ?? "") : "COULD_NOT_AUDIT",
      finding?.title ?? "",
      finding?.exampleUrl ?? "",
    ]);

    console.log("=".repeat(72));
    console.log(domain.toUpperCase());
    console.log("=".repeat(72));
    console.log(
      `health ${result.healthScore}/100 · ${result.pagesCrawled} pages · ` +
        `${result.errorCount} errors · ${result.warningCount} warnings` +
        (result.stoppedReason !== "completed" ? ` · stopped: ${result.stoppedReason}` : ""),
    );

    if (!trustworthy) {
      console.log(
        "\nCOULD NOT AUDIT — most likely the crawler was blocked, not that the\n" +
          "site is broken. Do NOT email about this one; open it in a browser first.\n",
      );
    } else if (!finding) {
      // Worth saying plainly rather than inventing a problem: a clean site is
      // a bad prospect for this particular opener, and pretending otherwise is
      // how outreach turns into spam.
      console.log("\nNothing worth leading with. Skip this one — the site is clean.\n");
    } else {
      console.log(`\nLEAD: ${headline(finding, domain)}\n`);
      console.log(draftEmail({ domain, finding, result, sender: args.sender }));
      console.log("");
    }

    if (i < urls.length - 1) {
      await new Promise((r) => setTimeout(r, args.delayMs));
    }
  }

  if (args.csv) {
    writeFileSync(args.csv, rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
    console.error(`\nSummary written to ${args.csv}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
