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
 * that fire solely while WordPress is updating plugins, themes or core, and
 * three that fire solely when a plugin is switched on or off or the theme
 * changes. Nothing is loaded until one of those actually runs. Everything else
 * loads inside wp-admin, and remote calls happen only while an administrator
 * is looking at a MyKavo screen - or once, right after an update.
 */
if ( is_admin() ) {
	require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-admin.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-integrations.php';
	MyKavo_Admin::init();
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
	}
);

add_action(
	'rest_api_init',
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-integrations.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rest.php';
		MyKavo_Rest::register_routes();
	}
);
