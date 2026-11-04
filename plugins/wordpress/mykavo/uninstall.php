<?php
/**
 * Remove everything MyKavo stored when the plugin is deleted.
 *
 * @package MyKavo
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/class-mykavo-bots.php';
MyKavo_Bots::uninstall();

// Pending automatic rollback checks.
wp_unschedule_hook( 'mykavo_rollback_watch' );

foreach ( array(
	'mykavo_connection',
	'mykavo_updates',
	'mykavo_settings',
	'mykavo_features',
	'mykavo_remote_settings',
	'mykavo_plugin_health',
	'mykavo_rollback_holds',
	'mykavo_rollback_lock',
) as $mykavo_option ) {
	delete_option( $mykavo_option );
}
foreach ( array( 'site', 'pages', 'scans', 'changes_open', 'changes_all', 'pages_urls', 'status', 'settings', 'ai_history' ) as $mykavo_key ) {
	delete_transient( 'mykavo_cache_' . $mykavo_key );
}
delete_transient( 'mykavo_summary' );
delete_transient( 'mykavo_just_activated' );
