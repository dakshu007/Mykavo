<?php
/**
 * Remove everything MyKavo stored when the plugin is deleted.
 *
 * @package MyKavo
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'mykavo_connection' );
delete_option( 'mykavo_updates' );
delete_option( 'mykavo_settings' );
foreach ( array( 'site', 'pages', 'scans', 'changes_open', 'changes_all' ) as $mykavo_key ) {
	delete_transient( 'mykavo_cache_' . $mykavo_key );
}
delete_transient( 'mykavo_summary' );
delete_transient( 'mykavo_just_activated' );
