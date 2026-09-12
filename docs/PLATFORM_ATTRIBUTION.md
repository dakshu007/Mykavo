# Plugin & theme update attribution

> Elementor updated 3.18.0 → 3.19.1 on Sep 9.
> Your /pricing H1 disappeared the same day.

The #1 reason a WordPress site breaks is a plugin or theme update. Every other
tool either performs updates without noticing the damage (ManageWP, WP Umbrella)
or notices the damage without knowing about the update (Visualping, Hexowatch).
MyKavo holds both halves, so it can name the update that likely caused the
change — **without installing anything on the monitored site**.

## How it works

WordPress stamps a version onto everything it enqueues:

```
/wp-content/plugins/elementor/assets/js/frontend.min.js?ver=3.19.1
/wp-content/themes/astra/style.css?ver=4.6.2
/wp-includes/css/dist/block-library/style.min.css?ver=6.4.2
```

Those URLs are already fetched during every scan. The pipeline is:

| Stage | Module |
| --- | --- |
| Read plugins/theme/core off asset URLs | `packages/shared/src/platform-fingerprint.ts` |
| Store the fingerprint on the snapshot | `page_snapshot.platformFingerprint` (JSONB) |
| Compare baseline vs current | `packages/comparison-engine/src/platform.ts` |
| Turn differences into events | `packages/severity-engine` (`PLATFORM` category) |
| Show the current stack | `apps/web/src/lib/platform-stack.ts` |

Scripts **and stylesheets** are read, because a theme's version lives in a
stylesheet and nowhere else. Only the derived fingerprint is stored — a few
dozen bytes — not the stylesheet URLs.

### Declarations beat asset URLs

Asset URLs are not enough on their own. Measured against the first real
WordPress site in the database, WP Rocket had stripped every `?ver=` and asset
URLs identified **zero** components.

So the page's own declarations are read too, and they take precedence — a
component naming its own version beats us guessing from a directory:

| Source | Example | Identifies |
| --- | --- | --- |
| `<meta name="generator">` | `Elementor 3.19.1; features=…` | Elementor, WooCommerce, WordPress, Site Kit, Slider Revolution, Astra |
| HTML comment | `optimized by WP Rocket v3.15.8` | WP Rocket, Yoast SEO, LiteSpeed Cache, Autoptimize |

A caching plugin combines and renames files; it does not touch these. On the
sites most likely to defeat URL-based detection, this is the only evidence left.

The lists are deliberately short. A loose pattern would invent components,
which is worse than missing them.

## Change events it produces

| Event | Severity | Notifies |
| --- | --- | --- |
| `platform_updates` (grouped) | LOW | no |
| `platform_components_added` | LOW | no |
| `platform_components_removed` | MEDIUM | no |
| `platform_theme_switched` | HIGH | yes |

Updates are **deliberately low severity and never notified on their own.** An
update is not a problem; it is the explanation for a problem. Alerting on every
plugin bump would train people to ignore MyKavo's email, and the value is that
when a title vanishes in the same scan, the cause is sitting next to it in the
change list — including as a suspect in the Search Console drop panel.

Updates are also **grouped into one event per comparison**. A site with twenty
auto-updating plugins would otherwise produce twenty events a week.

## What it refuses to claim

Under-reporting is the design. Each of these would otherwise be a false positive
firing on every single scan:

- **Cache-busters that look like versions.** `?ver=1712345678` (unix timestamp),
  `?ver=20240115` (build date), `?ver=<hash>` are all rejected.
  `isTrustworthyVersion` is the gate; its tests are the specification.
- **`1.2` vs `1.2.0`.** Compared numerically, so this is *not* an update.
- **jQuery's version as WordPress's.** `/wp-includes/js/jquery/…?ver=3.7.1` is
  jQuery, not core. Core comes from `<meta name="generator">` when present.
- **A page that stopped reporting versions.** If a scan reads zero versions, the
  comparison emits nothing. Switching on WP Rocket or Autoptimize combines
  assets and hides every version at once — that is our blindness, not twenty
  deactivated plugins.
- **A library bundled inside a plugin.** Elementor Pro ships libraries under
  `/assets/lib/`, and their versions (1.2.1, 4.1.2) are not Elementor Pro's —
  which is 3.x. Anything under `lib/`, `vendor/`, `node_modules/` and friends is
  ignored. Found on a real site, where the two tied on asset count: losing one
  asset from a scan would have flipped the winner and announced an update that
  never happened, forever.
- **A component we stopped being able to read.** `present` records every plugin
  and theme whose assets are loading, separately from those whose version we
  could read. A plugin still serving assets is never reported as deactivated
  just because a caching plugin started stripping its `?ver=`, and one we merely
  started reading is never reported as newly activated.
- **A snapshot with no fingerprint.** Rows predating this feature, and
  non-WordPress pages, compare to nothing rather than to an empty set.

## Coverage

Coverage is not 100%, and the UI says so rather than presenting a short list as
complete. Aggressive minify/combine plugins hide versions entirely. To measure
it on real stored data:

```bash
pnpm --filter worker exec tsx src/scripts/platform-coverage.ts [websiteId]
```

It reports how many snapshots look like WordPress, how many yielded a version,
every component identified, and — most usefully — the `ver` values that were
**rejected** as untrustworthy. A long rejection list of things that are plainly
real versions means the guard is too strict.

It reads `page_script` rows, which have stored full asset URLs since long before
this feature, so it reports on history. Stylesheets are not stored as rows, so
the theme is invisible to the script even though live scans see it: treat its
numbers as a floor.

## Deploying

The web app deploys from `main` via GitHub Actions. Two manual steps:

1. **Run the migration** against production — the worker's auto-update does not
   apply migrations:
   ```bash
   pnpm --filter @mykavo/database exec prisma migrate deploy
   ```
2. The worker container picks up the new code within 5 minutes (cron).

Fingerprints appear on snapshots taken **after** deploy, so attribution needs
one scan to establish a baseline fingerprint and a second to compare against it.
