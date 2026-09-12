/**
 * Dev utility: how much of the stored asset history the platform fingerprinter
 * can actually read.
 *
 *   pnpm --filter worker exec tsx src/scripts/platform-coverage.ts [websiteId]
 *
 * The feature's whole value rests on one empirical question nobody can answer
 * from a spec: do real sites expose `?ver=` on their assets, or does a caching
 * plugin strip it? This answers it against real snapshots rather than
 * optimism, and it is worth running before trusting anything the panel says.
 *
 * It reads PageScript rows, which have stored full asset URLs since long before
 * this feature existed - so it reports on history, not just future scans.
 * Stylesheets are NOT stored as rows, so the theme is invisible here even
 * though live scans can see it. Treat the numbers below as a floor.
 */

import "dotenv/config";
import { prisma } from "@mykavo/database";
import { fingerprintPlatform, isTrustworthyVersion } from "@mykavo/shared";

async function main(): Promise<void> {
  const websiteId = process.argv[2];

  const snapshots = await prisma.pageSnapshot.findMany({
    where: { ...(websiteId ? { websiteId } : {}), errorCode: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      url: true,
      createdAt: true,
      platformFingerprint: true,
      scripts: { select: { src: true } },
    },
  });

  if (snapshots.length === 0) {
    console.log("No snapshots stored yet.");
    return;
  }

  let wordpress = 0;
  let withComponents = 0;
  let assetsSeen = 0;
  let assetsVersioned = 0;
  let alreadyStored = 0;
  const rejected = new Map<string, number>();
  const componentsFound = new Map<string, string>();

  for (const snap of snapshots) {
    if (snap.platformFingerprint !== null) alreadyStored++;

    const urls = snap.scripts.map((s) => s.src);
    const fp = fingerprintPlatform({ assetUrls: urls });
    if (fp.platform === "wordpress") wordpress++;
    if (fp.components.length > 0) withComponents++;
    assetsSeen += fp.assetsSeen;
    assetsVersioned += fp.assetsVersioned;
    for (const c of fp.components) componentsFound.set(`${c.kind}:${c.slug}`, c.version);

    // The interesting failure: a platform asset that HAD a ver we threw away.
    // If this list is long, the version guard is too strict.
    for (const url of urls) {
      if (!/\/wp-(content|includes)\//.test(url)) continue;
      let ver: string | null = null;
      try {
        ver = new URL(url).searchParams.get("ver");
      } catch {
        continue;
      }
      if (ver && !isTrustworthyVersion(ver)) {
        rejected.set(ver, (rejected.get(ver) ?? 0) + 1);
      }
    }
  }

  const pct = (n: number, of: number) => (of === 0 ? "n/a" : `${Math.round((n / of) * 100)}%`);

  console.log(`snapshots examined:            ${snapshots.length}`);
  console.log(`  look like WordPress:         ${wordpress} (${pct(wordpress, snapshots.length)})`);
  console.log(
    `  yielded at least one version: ${withComponents} (${pct(withComponents, snapshots.length)})`,
  );
  console.log(`  already have a stored fingerprint: ${alreadyStored}`);
  console.log(`\nplatform assets seen:          ${assetsSeen}`);
  console.log(`  gave a trusted version:      ${assetsVersioned} (${pct(assetsVersioned, assetsSeen)})`);

  if (wordpress === 0) {
    console.log("\nNo WordPress site in this sample, so these numbers say nothing about");
    console.log("coverage on WordPress. Point this at a monitored WordPress site to judge it.");
  }

  if (componentsFound.size > 0) {
    console.log(`\ncomponents identified (${componentsFound.size}):`);
    for (const [id, version] of [...componentsFound].sort()) {
      console.log(`  ${id.padEnd(40)} ${version}`);
    }
  }

  if (rejected.size > 0) {
    console.log(`\nver values REJECTED as untrustworthy (top 15):`);
    console.log("  each of these would otherwise fire a false 'updated' event:");
    for (const [ver, count] of [...rejected].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`  ${String(count).padStart(5)}x  ${ver}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
