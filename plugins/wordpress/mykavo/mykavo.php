<?php
/**
 * Plugin Name:       MyKavo - Website Change Monitoring
 * Plugin URI:        https://mykavo.app
 * Description:       See what changed on your site, and whether it matters, without leaving WordPress. Visual, SEO, content, link and script changes with before-and-after screenshots. Adds nothing to the pages your visitors load.
 * Version:           1.0.0
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

define( 'MYKAVO_VERSION', '1.0.0' );
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
 * database queries, no remote requests, no autoloaded options. The only
 * hook registered on a front-end request is rest_api_init, which WordPress
 * fires solely for REST requests - and our routes there are admin-only.
 * Everything else loads inside wp-admin, and remote calls happen only while
 * an administrator is looking at a MyKavo screen.
 */
if ( is_admin() ) {
	require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-admin.php';
	MyKavo_Admin::init();
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
		require_once MYKAVO_DIR . 'includes/class-mykavo-rest.php';
		MyKavo_Rest::register_routes();
	}
);
