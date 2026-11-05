<?php
/**
 * Plugin Name:       MyKavo - Website Change Monitoring
 * Plugin URI:        https://mykavo.app/wordpress-plugin
 * Description:       See what changed on your site, and whether it matters, without leaving WordPress. Visual, SEO, content, link and script changes with before-and-after screenshots. Adds nothing to the pages your visitors load.
 * Version:           1.4.0
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

define( 'MYKAVO_VERSION', '1.4.0' );
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
 * for REST requests, and our routes there are admin-only), three update hooks
 * that fire solely while WordPress is updating plugins, themes or core, three
 * that fire solely when a plugin is switched on or off or the theme changes,
 * three auto_update_* filters that fire solely while WordPress decides on an
 * automatic update, robots_txt (fires solely for /robots.txt), five
 * update_option_* hooks and two role hooks that fire solely when one of
 * those settings or a user's role actually changes, template_redirect (which
 * returns at once unless the request is already a 404) and WP-Cron hooks.
 * Nothing is loaded until one of those actually runs. Everything else loads
 * inside wp-admin, and remote calls happen only while an administrator is
 * looking at a MyKavo screen (or the Plugins screen, at most twice a day, for
 * update risk) - or right after an update (one report and one local "did it
 * crash?" check, then a short check every five minutes for up to 40 minutes
 * on plans with automatic rollback), and from WP-Cron.
 *
 * Two things run on every public request, both plain string matches with
 * no query and no file loaded: the User-Agent header, to spot AI crawlers
 * (human visitors stop there, see "AI crawler visits" below), and the
 * request path, to answer /llms.txt.
 */
if ( is_admin() ) {
	require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-admin.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-integrations.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-roles.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-alerts.php';
	MyKavo_Admin::init();
	add_action(
		'admin_init',
		static function () {
			MyKavo_Bots::install();
			MyKavo_Bots::ensure_schedule();
			MyKavo_Roles::install();
		}
	);
	MyKavo_Integrations::init();

	// Silent-disaster alerts: a red notice on every wp-admin screen until dismissed.
	add_action( 'admin_notices', array( 'MyKavo_Alerts', 'admin_notice' ) );
	add_action( 'admin_post_mykavo_dismiss_alert', array( 'MyKavo_Alerts', 'handle_dismiss' ) );

	// The MyKavo panel in the block editor (administrators and viewers).
	add_action(
		'enqueue_block_editor_assets',
		static function () {
			require_once MYKAVO_DIR . 'includes/class-mykavo-editor.php';
			MyKavo_Editor::enqueue();
		}
	);

	// Update risk on the Plugins screen, fetched only when that screen opens.
	add_action(
		'load-plugins.php',
		static function () {
			require_once MYKAVO_DIR . 'includes/class-mykavo-risk.php';
			MyKavo_Risk::prefetch();
		}
	);

	// Multisite: every site's status on one Network Admin screen.
	if ( is_multisite() ) {
		add_action(
			'network_admin_menu',
			static function () {
				require_once MYKAVO_DIR . 'includes/class-mykavo-network.php';
				MyKavo_Network::menu();
			}
		);
	}
}

/*
 * Snapshots: the plugin or theme folder is zipped just before WordPress
 * replaces it, so any update can be rolled back for seven days.
 */
add_filter(
	'upgrader_pre_install',
	static function ( $response, $hook_extra = array() ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-snapshots.php';
		return MyKavo_Snapshots::before_update( $response, $hook_extra );
	},
	9,
	2
);

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
 * Silent disasters: these hooks fire only when the setting actually changes
 * (or a user's role does). The class loads only then.
 */
foreach ( array( 'blog_public', 'siteurl', 'home', 'permalink_structure', 'admin_email' ) as $mykavo_option ) {
	add_action(
		'update_option_' . $mykavo_option,
		static function ( $old, $value, $option ) {
			require_once MYKAVO_DIR . 'includes/class-mykavo-alerts.php';
			MyKavo_Alerts::option_changed( $old, $value, $option );
		},
		10,
		3
	);
}
unset( $mykavo_option );
foreach ( array( 'set_user_role', 'add_user_role' ) as $mykavo_hook ) {
	add_action(
		$mykavo_hook,
		static function ( $user_id, $role ) {
			if ( 'administrator' === $role ) {
				require_once MYKAVO_DIR . 'includes/class-mykavo-alerts.php';
				MyKavo_Alerts::role_added( $user_id, $role );
			}
		},
		10,
		2
	);
}
unset( $mykavo_hook );

/*
 * /llms.txt, when switched on. A plain string match on the request path;
 * only a request for llms.txt goes any further.
 */
if ( isset( $_SERVER['REQUEST_URI'] ) && is_string( $_SERVER['REQUEST_URI'] ) && false !== strpos( $_SERVER['REQUEST_URI'], 'llms.txt' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized,WordPress.Security.ValidatedSanitizedInput.MissingUnslash -- only matched against a fixed string.
	add_filter(
		'do_parse_request',
		static function ( $parse ) {
			require_once MYKAVO_DIR . 'includes/class-mykavo-llms.php';
			return MyKavo_Llms::maybe_serve( $parse );
		},
		1
	);
}

/*
 * Redirects created on the AI crawlers screen. Returns at once unless the
 * request is already a 404.
 */
add_action(
	'template_redirect',
	static function () {
		if ( is_404() ) {
			require_once MYKAVO_DIR . 'includes/class-mykavo-redirects.php';
			MyKavo_Redirects::maybe_redirect();
		}
	},
	1
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
 * One-off and daily WP-Cron jobs added in 1.4.0. Nothing loads until one runs.
 */
add_action(
	'mykavo_crash_check',
	static function ( $entry_id = '' ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-crash-check.php';
		MyKavo_Crash_Check::run( (string) $entry_id );
	}
);
add_action(
	'mykavo_alert_report',
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-alerts.php';
		MyKavo_Alerts::report();
	}
);
add_action(
	'mykavo_snapshots_daily',
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-snapshots.php';
		MyKavo_Snapshots::purge();
	}
);
add_action(
	'mykavo_mail_daily',
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-forms.php';
		MyKavo_Forms::cron();
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
			if ( false === $update && 'plugin' === $mykavo_type && get_option( 'mykavo_connection' ) ) {
				// Pro and Agency, when switched on: update a plugin with a known
				// security issue as soon as the fixed version is offered.
				require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
				return MyKavo_Auto_Updates::should_force( $item ) ? true : $update;
			}
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
		require_once MYKAVO_DIR . 'includes/class-mykavo-roles.php';
		MyKavo_Bots::install();
		MyKavo_Bots::ensure_schedule();
		MyKavo_Roles::install();
	}
);

register_deactivation_hook(
	__FILE__,
	static function () {
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rollback.php';
		MyKavo_Bots::unschedule();
		MyKavo_Rollback::unschedule();
		foreach ( array( 'mykavo_crash_check', 'mykavo_alert_report', 'mykavo_snapshots_daily', 'mykavo_mail_daily' ) as $hook ) {
			wp_unschedule_hook( $hook );
		}
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
		require_once MYKAVO_DIR . 'includes/class-mykavo-roles.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-alerts.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-snapshots.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-crash-check.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-safe-update.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-suggestions.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-llms.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-redirects.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-forms.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rest.php';
		MyKavo_Rest::register_routes();
	}
);
