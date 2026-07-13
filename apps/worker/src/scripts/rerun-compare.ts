/**
 * Dev utility: re-run baseline comparison for a completed scan. Comparison is
 * idempotent (the scan's change events are deleted and recreated), so this is
 * safe to run repeatedly — useful together with manual DB edits when testing
 * change detection end-to-end (see the memory notes on testing comparators).
 *
 *   pnpm --filter worker exec tsx src/scripts/rerun-compare.ts <scanId>
 */

import "dotenv/config";
import { runComparisonForScan } from "../compare-scan";

async function main() {
  const scanId = process.argv[2];
  if (!scanId) {
    console.error("Usage: rerun-compare.ts <scanId>");
    process.exit(1);
  }
  const { changes, highest } = await runComparisonForScan(scanId);
  console.log(`Comparison for ${scanId}: ${changes} change(s), highest severity ${highest ?? "—"}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
