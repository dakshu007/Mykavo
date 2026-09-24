/**
 * Builds the Shopify app's screen (public/shopify-app/app.js + app.css) from
 * the WordPress plugin's (plugins/wordpress/mykavo/assets), so both apps
 * share one interface and every improvement reaches both.
 *
 * The plugin's script expects wp.i18n and wp.apiFetch; public/shopify-app/
 * bootstrap.js provides small stand-ins for those. What differs is wording
 * (Shopify, theme changes instead of plugin updates) and a few behaviours
 * inside the Shopify admin iframe, applied below as exact replacements - each
 * one fails loudly if the plugin's source moves, instead of silently
 * shipping WordPress wording to Shopify.
 *
 *   node apps/web/scripts/shopify-app.mjs          # write the files
 *
 * shopify-app.test.ts fails when the committed files are out of date.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const pluginAssets = resolve(repo, "plugins/wordpress/mykavo/assets");
export const outDir = resolve(repo, "apps/web/public/shopify-app");

const JS_REPLACEMENTS = [
  [
    ` * MyKavo for WordPress - the admin screen.
 *
 * Plain JavaScript on top of two scripts WordPress already ships
 * (wp-api-fetch, wp-i18n): no framework download, so the screen opens fast.
 * It only ever talks to this site's own /wp-json/mykavo/v1 routes; the
 * MyKavo token stays on the server.`,
    ` * MyKavo for Shopify - the embedded admin screen.
 *
 * GENERATED from the WordPress plugin's assets/app.js by
 * apps/web/scripts/shopify-app.mjs - edit that script or the plugin, never
 * this file. bootstrap.js supplies wp.i18n and wp.apiFetch stand-ins that
 * talk to mykavo.app with the App Bridge session token.`,
  ],
  // Welcome screen.
  [
    `right here in WordPress.', 'mykavo' ),
				site.name || __( 'your site', 'mykavo' )`,
    `right here in Shopify.', 'mykavo' ),
				site.name || __( 'your store', 'mykavo' )`,
  ],
  [
    `benefit( 'shield', __( 'Update without fear', 'mykavo' ), __( 'After every plugin, theme or WordPress update, MyKavo checks nothing broke - and names the update if something did.', 'mykavo' ) )`,
    `benefit( 'shield', __( 'Change your theme without fear', 'mykavo' ), __( 'When your live theme is published or edited, MyKavo checks your store - and names the change if something broke.', 'mykavo' ) )`,
  ],
  [`DEPLOY: __( 'Update check', 'mykavo' ),`, `DEPLOY: __( 'Theme check', 'mykavo' ),`],
  [
    `icon( 'shield' ) + esc( __( 'Update check', 'mykavo' ) ) + '</span><span class="mk-cell-note">'`,
    `icon( 'shield' ) + esc( __( 'Theme check', 'mykavo' ) ) + '</span><span class="mk-cell-note">'`,
  ],
  [
    `toast( enabled ? __( 'Update checks are on.', 'mykavo' ) : __( 'Update checks are off.', 'mykavo' ) );`,
    `toast( enabled ? __( 'Theme checks are on.', 'mykavo' ) : __( 'Theme checks are off.', 'mykavo' ) );`,
  ],
  [
    `'<a class="mk-btn mk-btn-primary" href="' + esc( cfg.connectUrl ) + '">'`,
    // The consent page opens in a new tab: signing in to mykavo.app cannot
    // happen inside the Shopify admin's iframe. bootstrap.js watches for the
    // link to complete and reloads.
    `'<a class="mk-btn mk-btn-primary mk-connect" href="' + esc( cfg.connectUrl ) + '" target="_blank" rel="noopener">'`,
  ],
  [
    `__( 'Adds nothing to the pages your visitors load. Zero impact on site speed.', 'mykavo' )`,
    `__( 'Adds nothing to your storefront. Zero impact on store speed.', 'mykavo' )`,
  ],
  // Footer.
  [
    `esc( sprintf( /* translators: %s: plugin version. */ __( 'MyKavo for WordPress %s', 'mykavo' ), cfg.version || '' ) ) +
			'</span><span>' + esc( __( 'Runs only in wp-admin. Your visitors never load it.', 'mykavo' ) ) + '</span></p>'`,
    `esc( __( 'MyKavo for Shopify', 'mykavo' ) ) +
			'</span><span>' + esc( __( 'Runs only in your Shopify admin. Nothing is added to your storefront.', 'mykavo' ) ) + '</span></p>'`,
  ],
  // Disconnect: window.confirm may be blocked inside the admin iframe, so
  // ask for a second press instead; then reload for a fresh connect link.
  [
    `		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'Disconnect this site from MyKavo? Monitoring keeps running in MyKavo; this screen just stops showing it until you connect again.', 'mykavo' ) ) ) {
			return;
		}`,
    `		if ( ! state.confirmDisconnect ) {
			state.confirmDisconnect = true;
			toast( __( 'Press Disconnect again to confirm. Monitoring keeps running in MyKavo.', 'mykavo' ) );
			render();
			return;
		}
		state.confirmDisconnect = false;`,
  ],
  [
    `			state.banner = { tone: 'neutral', text: __( 'Disconnected from MyKavo.', 'mykavo' ) };
			stopPolling();
			render();`,
    `			stopPolling();
			window.location.reload();`,
  ],
  [
    `esc( __( 'Disconnect this site', 'mykavo' ) )`,
    `esc( state.confirmDisconnect ? __( 'Press again to disconnect', 'mykavo' ) : __( 'Disconnect this store', 'mykavo' ) )`,
  ],
  // Theme checks instead of Safe Updates.
  [`[ 'updates', __( 'Safe Updates', 'mykavo' ), '' ]`, `[ 'updates', __( 'Theme checks', 'mykavo' ), '' ]`],
  [
    `return { tone: 'quiet', text: __( 'Not checked - update checks were off', 'mykavo' ) };`,
    `return { tone: 'quiet', text: __( 'Not checked - theme checks were off', 'mykavo' ) };`,
  ],
  [
    `__( 'Not checked - automatic update checks come with Pro', 'mykavo' )`,
    `__( 'Not checked - automatic theme checks come with Pro', 'mykavo' )`,
  ],
  [
    `'<span class="mk-status">' + esc( entry.trigger === 'auto' ? __( 'Automatic', 'mykavo' ) : __( 'By an admin', 'mykavo' ) ) + '</span></p>'`,
    `'</p>'`,
  ],
  [
    `'<h2>' + esc( __( 'Update without fear', 'mykavo' ) ) + '</h2>' +
			'<p>' + esc( __( 'Every time WordPress updates a plugin, theme or itself - including automatic updates overnight - and whenever a plugin is switched on or off or the theme changes, MyKavo checks your pages against the approved baseline and tells you whether anything broke, and which change did it.', 'mykavo' ) ) + '</p>'`,
    `'<h2>' + esc( __( 'Change your theme without fear', 'mykavo' ) ) + '</h2>' +
			'<p>' + esc( __( 'Every time your live theme is published or edited, MyKavo checks your store against the approved baseline and tells you whether anything broke - and which change did it. Edits are checked at most every 15 minutes while you work in the theme editor.', 'mykavo' ) ) + '</p>'`,
  ],
  [
    `__( 'Updates are listed here on every plan. Checking the site automatically after each one comes with Pro and Agency.', 'mykavo' )`,
    `__( 'Theme changes are listed here on every plan. Checking the store automatically after each one comes with Pro and Agency.', 'mykavo' )`,
  ],
  [
    `esc( __( 'No updates yet', 'mykavo' ) ) + '</strong><span>' +
				esc( __( 'The next time a plugin, theme or WordPress updates, it appears here with a verdict.', 'mykavo' ) )`,
    `esc( __( 'No theme changes yet', 'mykavo' ) ) + '</strong><span>' +
				esc( __( 'The next time your live theme is published or edited, it appears here with a verdict.', 'mykavo' ) )`,
  ],
  [
    `esc( __( 'Update history', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Kept on this site. Last 30 updates.', 'mykavo' ) ) + '</span>`,
    `esc( __( 'Theme changes', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Last 30 changes.', 'mykavo' ) ) + '</span>`,
  ],
  [
    `? __( 'Update checks are off.', 'mykavo' )
					: __( 'The next time WordPress updates a plugin, theme or itself, MyKavo checks nothing broke.', 'mykavo' ) )`,
    `? __( 'Theme checks are off.', 'mykavo' )
					: __( 'The next time your live theme is published or edited, MyKavo checks nothing broke.', 'mykavo' ) )`,
  ],
  [
    `icon( 'shield', 'mk-title-icon' ) + esc( __( 'Safe Updates', 'mykavo' ) ) + '</h3>'`,
    `icon( 'shield', 'mk-title-icon' ) + esc( __( 'Theme checks', 'mykavo' ) ) + '</h3>'`,
  ],
  [`return __( 'WordPress update', 'mykavo' );`, `return __( 'Theme change', 'mykavo' );`],
  [`esc( __( 'After an update', 'mykavo' ) ) + '</span>'`, `esc( __( 'After a theme change', 'mykavo' ) ) + '</span>'`],
  [`esc( __( 'Appeared after an update', 'mykavo' ) )`, `esc( __( 'Appeared after a theme change', 'mykavo' ) )`],
  // Store guard.
  [`'<span class="mk-fine">WooCommerce</span></div>'`, `'<span class="mk-fine">Shopify</span></div>'`],
  [
    `__( 'Your store pages are all monitored.', 'mykavo' )`,
    `__( 'Your key store pages are all monitored.', 'mykavo' )`,
  ],
];

const CSS_APPEND = `

/* ------------------------------------------------------------ shopify -- */
/* GENERATED: the plugin's app.css plus these overrides for the Shopify
   admin iframe (see apps/web/scripts/shopify-app.mjs). */

html,
body {
	margin: 0;
	background: #f1f1f1;
}

body {
	font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
	-webkit-font-smoothing: antialiased;
}

.mykavo-wrap {
	max-width: 1200px;
	margin: 0 auto;
	padding: 16px 20px 40px;
}

/* No WordPress admin bar above the drawer. */
.mk-drawer {
	top: 0;
}

@media (max-width: 782px) {
	.mk-drawer {
		top: 0;
	}

	.mykavo-wrap {
		padding: 12px 12px 32px;
	}
}

.mk-boot {
	padding: 48px 0;
	color: #6b6b60;
	font-size: 14px;
	text-align: center;
}

.mk-boot-error {
	max-width: 520px;
	margin: 40px auto;
	padding: 24px;
	border-radius: 14px;
	background: #fff;
	color: #151515;
	font-size: 14px;
	line-height: 1.6;
	text-align: center;
	box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}

.mk-boot-error button {
	margin-top: 12px;
	padding: 8px 18px;
	border: 1px solid #151515;
	border-radius: 999px;
	background: #151515;
	color: #fff;
	font: inherit;
	cursor: pointer;
}
`;

function applyAll(source, replacements, label) {
  let out = source;
  for (const [from, to] of replacements) {
    const count = out.split(from).length - 1;
    if (count !== 1) {
      throw new Error(`${label}: expected exactly one match, found ${count}:\n${from.slice(0, 160)}`);
    }
    out = out.replace(from, () => to);
  }
  return out;
}

export function buildShopifyApp() {
  const js = applyAll(readFileSync(resolve(pluginAssets, "app.js"), "utf8"), JS_REPLACEMENTS, "app.js");
  const css = readFileSync(resolve(pluginAssets, "app.css"), "utf8") + CSS_APPEND;
  return { js, css };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { js, css } = buildShopifyApp();
  writeFileSync(resolve(outDir, "app.js"), js);
  writeFileSync(resolve(outDir, "app.css"), css);
  console.log("Wrote public/shopify-app/app.js and app.css");
}
