<?php
/**
 * Plugin Name:       MyKavo - Website Change Monitoring
 * Plugin URI:        https://mykavo.app/wordpress-plugin
 * Description:       See what changed on your site, and whether it matters, without leaving WordPress. Visual, SEO, content, link and script changes with before-and-after screenshots. Adds nothing to the pages your visitors load.
 * Version:           1.3.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            MyKavo
 * Author URI:        https://mykavo.app
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       mykavo
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

define( 'MYKAVO_VERSION', '1.3.0' );
define( 'MYKAVO_FILE', __FILE__ );
define( 'MYKAVO_DIR', plugin_dir_path( __FILE__ ) );
define( 'MYKAVO_URL', plugin_dir_url( __FILE__ ) );

if ( ! defined( 'MYKAVO_APP_URL' ) ) {
	/*
	 * The MyKavo service this plugin talks to. Overridable in wp-config.php
	 * for local development only.
	 */
	define( 'MYKAVO_APP_URL', 'https://mykavo.app' );
}

/*
 * PERFORMANCE CONTRACT
 *
 * On the public site this plugin does nothing: no scripts, no styles, no
 * database queries, no remote requests, no autoloaded options. On a
 * front-end request it only registers callbacks: rest_api_init (fires solely
 * for REST requests, and our routes there are admin-only), two update hooks
 * that fire solely while WordPress is updating plugins, themes or core, three
 * that fire solely when a plugin is switched on or off or the theme changes,
 * three auto_update_* filters that fire solely while WordPress decides on an
 * automatic update, robots_txt (fires solely for /robots.txt) and two WP-Cron
 * hooks. Nothing is loaded until one of those actually runs. Everything else
 * loads inside wp-admin, and remote calls happen only while an administrator
 * is looking at a MyKavo screen - or right after an update (one report, then
 * a short check every five minutes for up to 40 minutes on plans with
 * automatic rollback), and once a day from WP-Cron to share AI crawler
 * totals and the installed plugin list.
 *
 * The one thing that runs on every public request is a single string match
 * on the User-Agent header, to spot AI crawlers. Human visitors stop there:
 * no query, no file loaded. See "AI crawler visits" below.
 */
if ( is_admin() ) {
	require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-admin.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-integrations.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
	MyKavo_Admin::init();
	add_action(
		'admin_init',
		static function () {
			MyKavo_Bots::install();
			MyKavo_Bots::ensure_schedule();
		}
	);
	MyKavo_Integrations::init();
}

/*
 * Safe Updates. The class loads only when an update is actually running.
 */
add_filter(
	'upgrader_pre_install',
	static function ( $response, $hook_extra = array() ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		return MyKavo_Updates::remember_before( $response, $hook_extra );
	},
	10,
	2
);
add_action(
	'upgrader_process_complete',
	static function ( $upgrader, $options = array() ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		MyKavo_Updates::collect( $upgrader, $options );
	},
	10,
	2
);

/*
 * Plugins switched on or off and theme switches break sites as often as
 * updates, so Safe Updates checks after those too. Same deal: nothing loads
 * until one of them actually happens.
 */
add_action(
	'activated_plugin',
	static function ( $plugin ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		MyKavo_Updates::plugin_toggled( $plugin, 'activate' );
	}
);
add_action(
	'deactivated_plugin',
	static function ( $plugin ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		MyKavo_Updates::plugin_toggled( $plugin, 'deactivate' );
	}
);
add_action(
	'switch_theme',
	static function ( $name, $theme = null ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		MyKavo_Updates::theme_switched( $name, $theme );
	},
	10,
	2
);

/*
 * AI crawler visits. Counts requests from ChatGPT, Claude, Perplexity and
 * other AI crawlers - by User-Agent only: no IP addresses, no cookies, and
 * nothing at all about human visitors, who never get past this match. For a
 * crawler request the recorder loads and adds one counter update once the
 * response is complete.
 */
if ( ! is_admin() && isset( $_SERVER['HTTP_USER_AGENT'] ) && is_string( $_SERVER['HTTP_USER_AGENT'] ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- only matched against fixed tokens.
	if ( preg_match( '/OAI-SearchBot|ChatGPT-User|GPTBot|Claude-SearchBot|Claude-User|ClaudeBot|PerplexityBot|Perplexity-User|Amazonbot|DuckAssistBot|Meta-ExternalAgent|MistralAI-User|CCBot|Bytespider/i', $_SERVER['HTTP_USER_AGENT'], $mykavo_bot ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized,WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- as above.
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		MyKavo_Bots::track( $mykavo_bot[0] );
	}
}
add_action(
	'mykavo_bots_daily',
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		MyKavo_Bots::daily();
	}
);

/*
 * Automatic rollback. After an update, WP-Cron asks MyKavo how its check went
 * (every five minutes, for up to 40 minutes) and rolls the update back when
 * MyKavo recommends it. Nothing loads until that event runs.
 */
add_action(
	'mykavo_rollback_watch',
	static function ( $entry_id = '' ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rollback.php';
		MyKavo_Rollback::watch( (string) $entry_id );
	}
);

/*
 * Update windows and rollback holds. These filters only run while WordPress
 * decides whether to install an automatic update; when it would not update
 * anyway (or a screen only asks whether auto-updates are forced), they return
 * straight away without loading anything.
 */
foreach ( array( 'plugin', 'theme', 'core' ) as $mykavo_type ) {
	add_filter(
		'auto_update_' . $mykavo_type,
		static function ( $update, $item = null ) use ( $mykavo_type ) {
			if ( null === $update || ! $update || ! get_option( 'mykavo_connection' ) ) {
				return $update;
			}
			require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
			return MyKavo_Auto_Updates::filter( $update, $item, $mykavo_type );
		},
		20,
		2
	);
}
unset( $mykavo_type );

/*
 * "Block AI training, allow AI search": rules added to the virtual
 * robots.txt, only when that switch is on. Runs only for /robots.txt.
 */
add_filter(
	'robots_txt',
	static function ( $output, $is_public = '1' ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-robots.php';
		return MyKavo_Robots::filter( $output, $is_public );
	},
	20,
	2
);

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-cli.php';
	WP_CLI::add_command( 'mykavo', 'MyKavo_CLI' );
}

register_activation_hook(
	__FILE__,
	static function () {
		set_transient( 'mykavo_just_activated', 1, MINUTE_IN_SECONDS * 10 );
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		MyKavo_Bots::install();
		MyKavo_Bots::ensure_schedule();
	}
);

register_deactivation_hook(
	__FILE__,
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rollback.php';
		MyKavo_Bots::unschedule();
		MyKavo_Rollback::unschedule();
	}
);

add_action(
	'rest_api_init',
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-integrations.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rollback.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-robots.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-health.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rest.php';
		MyKavo_Rest::register_routes();
	}
);
