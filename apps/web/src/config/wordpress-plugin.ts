/**
 * The MyKavo WordPress plugin, as the marketing site describes it. The zip is
 * built by plugins/wordpress/build.sh, which also copies it to
 * public/downloads; wordpress-plugin.test.ts fails if this version, the
 * plugin header and the published zip disagree.
 */

export const WP_PLUGIN_VERSION = "1.3.0";

/** Direct download, served by the site itself. */
export const WP_PLUGIN_DOWNLOAD_PATH = "/downloads/mykavo-wordpress.zip";

/** The marketing page. */
export const WP_PLUGIN_PAGE_PATH = "/wordpress-plugin";

/** Tested range, from the plugin's readme.txt. */
export const WP_PLUGIN_REQUIRES = { wordpress: "6.2", testedUpTo: "7.1", php: "7.4" };
