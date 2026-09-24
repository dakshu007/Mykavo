# MyKavo for WordPress

The plugin in `plugins/wordpress/mykavo/` shows a site's MyKavo monitoring inside
wp-admin: status, changes with before-and-after screenshots, one-click decisions,
on-demand scans, scan history and monitored pages.

## The performance contract

The reason people delete plugins is that they slow sites down. This one is built
so it cannot:

- **Public pages:** nothing. The only hook registered on a front-end request is
  `rest_api_init`, which WordPress fires only for REST requests, and our routes
  there are admin-only. No scripts, styles, queries or remote calls.
- **Options:** one option (`mykavo_connection`), stored with autoload off. Caches
  are transients with expiry, which WordPress also never autoloads.
- **No cron, no custom tables.** Scanning runs on MyKavo's servers.
- **wp-admin:** `app.js`/`app.css` load on the MyKavo screen only; a 2 KB script
  on the Dashboard when connected. Built on `wp-api-fetch` and `wp-i18n`, which
  WordPress already ships; no framework download.
- **Remote calls** happen only while an administrator views a MyKavo screen,
  cached 30 seconds to 5 minutes, with a 12-second timeout.
- **Screenshots** load from mykavo.app straight into the admin's browser via
  signed, 30-minute links, so they never pass through the WordPress server.

The end-to-end test checks this: the homepage has zero mentions of MyKavo and
makes zero requests to plugin files, and the database has zero autoloaded
MyKavo options and no cron events.

## How connecting works (and why it is safe)

OAuth's authorization-code flow with PKCE (RFC 7636):

1. **Connect** (admin-post, nonce + `manage_options`) creates a `state` and a
   PKCE verifier, kept in a per-user transient for 15 minutes, and sends the
   admin to `mykavo.app/connect/wordpress` with the S256 challenge.
2. A signed-in MyKavo member (not a Viewer) picks which website this is and
   approves. `POST /api/wp/v1/connect/approve` re-validates everything: the
   return URL must be the same host and contain `/wp-admin/`. It stores only
   the SHA-256 of a one-time code (10-minute expiry) and redirects back.
3. WordPress checks `state`, then its **server** calls
   `POST /api/wp/v1/connect/exchange` with the code, the verifier and its home
   URL. The code is consumed atomically; the site gets a `mkv_wp_...` token
   scoped to that one website. Only the token's hash is stored. Reconnecting
   revokes the site's previous token.

The token never reaches a browser. wp-admin talks to this site's own
`/wp-json/mykavo/v1/*` routes (cookie + nonce, administrators only), and those
call MyKavo with the token.

**Revoking:** Disconnect in the plugin, **Settings → WordPress sites** in the
MyKavo dashboard, or deleting the website (the row cascades).

## Server side (apps/web)

| Piece | File |
| --- | --- |
| Table | `site_connection`, migration `20260924090000_site_connection` |
| Crypto, validation, signed media | `src/lib/integrations/site-connection.ts` (+ tests) |
| Token auth | `src/lib/integrations/site-auth.ts` |
| Consent screen | `src/app/(auth)/connect/wordpress/page.tsx` |
| API | `src/app/api/wp/v1/*` (connect, site, changes, scans, pages, media, disconnect) |
| Scan trigger shared with the dashboard | `src/lib/scans/trigger.ts` |
| Dashboard management | `src/components/dashboard/connected-sites.tsx`, `src/app/api/site-connections/[id]` |

Every `/api/wp/v1` route acts on the token's website only, never on an ID from
the request. Actions reuse the dashboard's own functions (`applyChangeAction`,
`updateBaselineFromSnapshot`, `triggerWebsiteScan`), so plan limits, quotas and
the one-scan-at-a-time rule are identical.

## Testing locally

See `plugins/wordpress/dev/README.md`. In short: WordPress Playground runs a real
WordPress with the plugin mounted; `dev/mock-server.cjs` stands in for mykavo.app
(and verifies PKCE the same way); `dev/e2e.cjs` drives the whole journey in
Chromium.

Tested for 1.0.0 on WordPress 6.5.5 with PHP 8.3, and WordPress 6.2.6 (the
minimum) with PHP 7.4 (the minimum): all 18 steps pass, including a 390px phone
layout. WordPress Coding Standards and PHPCompatibilityWP (7.4+) report no issues.

## Releasing to WordPress.org

1. **Create a WordPress.org account** (the username becomes the plugin's
   contributor). Put that username on the `Contributors:` line in `readme.txt`.
2. **Test on the current WordPress release** on a real site and set
   `Tested up to:` in `readme.txt` to that version.
3. `plugins/wordpress/build.sh` builds `dist/mykavo-<version>.zip` (it refuses to
   build if `Version` and `Stable tag` disagree).
4. **Submit** the zip at https://wordpress.org/plugins/developers/add/. Review
   usually takes one to a few weeks; reply to the reviewer's email from the same
   account.
5. When approved you get SVN access. Commit `mykavo/` to `trunk/`, copy it to
   `tags/1.0.0/`, and put everything in `plugins/wordpress/wporg-assets/`
   (icon, banner, screenshots) into the SVN `assets/` folder.

**Releasing an update:** bump `Version` in `mykavo.php`, `MYKAVO_VERSION`, and
`Stable tag` in `readme.txt` together, add a changelog entry, run the e2e test,
then build and commit to SVN as above.
