/**
 * Dev utility: look up one domain's registration, or run the whole sweep.
 *
 *   pnpm --filter worker exec tsx src/scripts/domain-check.ts example.com
 *   pnpm --filter worker exec tsx src/scripts/domain-check.ts --sweep
 *
 * Exists because the RDAP round-trip cannot be exercised from every
 * environment - a sandbox with an egress allowlist blocks rdap.org outright -
 * so the parser's unit tests prove the shape and this proves the network path.
 * Those are different claims and only one of them is testable offline.
 */

import "dotenv/config";
import { prisma } from "@mykavo/database";
import { assessExpiry, registrableDomain, blockingStatuses } from "@mykavo/shared";
import { lookupDomain, runDomainSweep } from "../domain-check";

async function one(input: string): Promise<void> {
  // Accept a bare domain or a full URL, since both are natural to paste.
  let host = input;
  try {
    if (input.includes("://")) host = new URL(input).hostname;
  } catch {
    /* fall through to the raw string */
  }

  const domain = registrableDomain(host);
  console.log(`input:      ${input}`);
  console.log(`domain:     ${domain ?? "(none - nothing to look up)"}`);
  if (!domain) return;

  const result = await lookupDomain(domain);
  if (result.error) {
    console.log(`error:      ${result.error}`);
    return;
  }

  const { daysRemaining, urgency, message } = assessExpiry(result.expiresAt);
  console.log(`expires:    ${result.expiresAt?.toISOString() ?? "(not published)"}`);
  console.log(`days left:  ${daysRemaining ?? "-"}`);
  console.log(`urgency:    ${urgency}`);
  console.log(`registrar:  ${result.registrar ?? "-"}`);
  console.log(`statuses:   ${result.statuses.join(", ") || "-"}`);
  const blocking = blockingStatuses(result.statuses);
  if (blocking.length > 0) console.log(`BLOCKING:   ${blocking.join(", ")}`);
  if (message) console.log(`message:    ${message}`);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: domain-check.ts <domain|url>");
    console.error("       domain-check.ts --sweep");
    process.exitCode = 1;
    return;
  }
  if (arg === "--sweep") {
    await runDomainSweep();
    const rows = await prisma.website.findMany({
      where: { domainCheckedAt: { not: null } },
      select: { name: true, domainName: true, domainExpiresAt: true, domainLookupError: true },
      orderBy: { domainExpiresAt: "asc" },
    });
    console.log(`\n${rows.length} website(s) checked:`);
    for (const row of rows) {
      const when = row.domainExpiresAt
        ? `${row.domainExpiresAt.toISOString().slice(0, 10)} (${assessExpiry(row.domainExpiresAt).urgency})`
        : (row.domainLookupError ?? "no date");
      console.log(`  ${(row.domainName ?? "-").padEnd(30)} ${when}   ${row.name}`);
    }
    return;
  }
  await one(arg);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
