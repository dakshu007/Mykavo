/**
 * Comparing two platform fingerprints: what was updated, activated or
 * deactivated between the approved baseline and this scan.
 *
 * This is the module that lets MyKavo say "Elementor 3.18.0 → 3.19.1" next to
 * "the H1 disappeared" - closing the loop between an update and its damage,
 * which is the single question a WordPress agency actually has.
 *
 * Everything here is built to under-report. A fingerprint can go quiet for
 * reasons that have nothing to do with the site changing: a caching plugin
 * starts combining assets, a CDN strips query strings, one page simply does not
 * enqueue what another does. Treating those as "plugin deactivated" would make
 * the feature a liar, so the rules below require positive evidence before
 * claiming anything.
 */

import {
  compareVersions,
  type PlatformFingerprint,
  type PlatformComponent,
} from "@mykavo/shared";
import { type ChangeSignal } from "@mykavo/severity-engine";

function byId(fp: PlatformFingerprint): Map<string, PlatformComponent> {
  return new Map(fp.components.map((c) => [`${c.kind}:${c.slug}`, c]));
}

/**
 * Compare the fingerprints of a baseline and current snapshot.
 *
 * Returns no signals at all when either side could not be fingerprinted. A
 * page that stopped reporting versions has not lost its plugins - we have lost
 * our ability to see them, and those are not the same claim.
 */
export function comparePlatform(
  baseline: PlatformFingerprint | null | undefined,
  current: PlatformFingerprint | null | undefined,
): ChangeSignal[] {
  if (!baseline || !current) return [];
  if (baseline.platform === null || current.platform === null) return [];

  // If this scan read versions off nothing at all, every component would look
  // removed. Overwhelmingly that means an asset-combining plugin was switched
  // on, not that the whole stack was uninstalled.
  if (current.assetsVersioned === 0) return [];

  const before = byId(baseline);
  const after = byId(current);
  const signals: ChangeSignal[] = [];

  const updates: Array<{
    name: string;
    kind: PlatformComponent["kind"];
    previous: string;
    current: string;
  }> = [];
  const added: Array<{ name: string; kind: PlatformComponent["kind"]; version: string }> = [];
  const removed: Array<{ name: string; kind: PlatformComponent["kind"]; version: string }> = [];

  for (const [id, now] of after) {
    const then = before.get(id);
    if (!then) {
      added.push({ name: now.name, kind: now.kind, version: now.version });
      continue;
    }
    // compareVersions, not string inequality: "1.2" and "1.2.0" are the same
    // release, and reporting that pair as an update every scan is exactly the
    // kind of false positive that gets a monitoring tool muted.
    if (compareVersions(then.version, now.version) !== 0) {
      updates.push({
        name: now.name,
        kind: now.kind,
        previous: then.version,
        current: now.version,
      });
    }
  }

  for (const [id, then] of before) {
    if (!after.has(id)) removed.push({ name: then.name, kind: then.kind, version: then.version });
  }

  // A theme SWITCH is a different event from a theme disappearing: one theme
  // out, a different one in, within the same comparison.
  const themeGone = removed.find((c) => c.kind === "theme");
  const themeNew = added.find((c) => c.kind === "theme");
  if (themeGone && themeNew) {
    signals.push({
      kind: "platform_theme_switched",
      previous: `${themeGone.name} ${themeGone.version}`,
      current: `${themeNew.name} ${themeNew.version}`,
    });
  }

  const isSwitchedTheme = (c: { kind: PlatformComponent["kind"] }) =>
    Boolean(themeGone && themeNew) && c.kind === "theme";

  if (updates.length > 0) signals.push({ kind: "platform_updates", components: updates });
  const remainingAdded = added.filter((c) => !isSwitchedTheme(c));
  const remainingRemoved = removed.filter((c) => !isSwitchedTheme(c));
  if (remainingAdded.length > 0)
    signals.push({ kind: "platform_components_added", components: remainingAdded });
  if (remainingRemoved.length > 0)
    signals.push({ kind: "platform_components_removed", components: remainingRemoved });

  return signals;
}
