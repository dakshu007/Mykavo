/**
 * The MyKavo WordPress plugin, as the marketing site describes it. The zip is
 * built by plugins/wordpress/build.sh, which also copies it to
 * public/downloads; wordpress-plugin.test.ts fails if this version, the
 * plugin header and the published zip disagree.
 */

export const WP_PLUGIN_VERSION = "1.0.0";

/** The listing in the WordPress.org plugin directory - the main way to install. */
export const WP_PLUGIN_DIRECTORY_URL = "https://wordpress.org/plugins/mykavo/";

/** Direct download, served by the site itself (the same zip, for manual installs). */
export const WP_PLUGIN_DOWNLOAD_PATH = "/downloads/mykavo-wordpress.zip";

/** The marketing page. */
export const WP_PLUGIN_PAGE_PATH = "/wordpress-plugin";

/** Tested range, from the plugin's readme.txt. */
export const WP_PLUGIN_REQUIRES = { wordpress: "6.2", testedUpTo: "7.1", php: "7.4" };
