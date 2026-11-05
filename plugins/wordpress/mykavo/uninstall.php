<?php
/**
 * Remove everything MyKavo stored when the plugin is deleted.
 *
 * @package MyKavo
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

if ( ! defined( 'MYKAVO_DIR' ) ) {
	define( 'MYKAVO_DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'MYKAVO_FILE' ) ) {
	define( 'MYKAVO_FILE', __DIR__ . '/mykavo.php' );
}

require_once __DIR__ . '/includes/class-mykavo-bots.php';
MyKavo_Bots::uninstall();

// Snapshots: every zip, the folder and its record.
require_once __DIR__ . '/includes/class-mykavo-snapshots.php';
MyKavo_Snapshots::remove_all();

// The "MyKavo viewer" role and the mykavo_view capability.
require_once __DIR__ . '/includes/class-mykavo-roles.php';
MyKavo_Roles::remove();

// Pending and recurring jobs.
foreach ( array( 'mykavo_rollback_watch', 'mykavo_crash_check', 'mykavo_alert_report', 'mykavo_snapshots_daily', 'mykavo_mail_daily' ) as $mykavo_hook ) {
	wp_unschedule_hook( $mykavo_hook );
}

foreach ( array(
	'mykavo_connection',
	'mykavo_updates',
	'mykavo_settings',
	'mykavo_features',
	'mykavo_remote_settings',
	'mykavo_plugin_health',
	'mykavo_rollback_holds',
	'mykavo_rollback_lock',
	// 1.3.1.
	'mykavo_alerts',
	'mykavo_batch',
	'mykavo_known_pages',
	'mykavo_known_elements',
	'mykavo_llms',
	'mykavo_llms_summaries',
	'mykavo_redirects',
	'mykavo_bot_ranges',
	'mykavo_mail_check',
	'mykavo_forms',
) as $mykavo_option ) {
	delete_option( $mykavo_option );
}
foreach ( array( 'site', 'pages', 'scans', 'changes_open', 'changes_all', 'pages_urls', 'status', 'settings', 'ai_history', 'update_risk', 'reports' ) as $mykavo_key ) {
	delete_transient( 'mykavo_cache_' . $mykavo_key );
}
delete_transient( 'mykavo_summary' );
delete_transient( 'mykavo_just_activated' );

// Per-visitor crawler checks (keyed by a salted hash, never an address).
global $wpdb;
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- removing our own transients on uninstall.
$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s", $wpdb->esc_like( '_transient_mykavo_bv_' ) . '%', $wpdb->esc_like( '_transient_timeout_mykavo_bv_' ) . '%' ) );

// Per-user notice dismissals.
delete_metadata( 'user', 0, 'mykavo_dismissed_critical', '', true );
delete_metadata( 'user', 0, 'mykavo_review_prompt', '', true );
