<?php
/**
 * Test helper for AI crawler counting: fake a connection, run the daily job,
 * print the summary. Mounted only in the local Playground.
 */
require '/wordpress/wp-load.php';
require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
header( 'Content-Type: application/json' );
$do = isset( $_GET['do'] ) ? $_GET['do'] : 'summary';
if ( 'connect' === $do ) {
	update_option( 'mykavo_connection', array( 'token' => 'mkv_wp_probe', 'website_id' => 'web1' ), false );
	MyKavo_Bots::install();
	echo wp_json_encode( array( 'installed' => get_option( MyKavo_Bots::DB_OPTION ), 'scheduled' => (bool) wp_next_scheduled( MyKavo_Bots::CRON_HOOK ) ) );
} elseif ( 'daily' === $do ) {
	echo wp_json_encode( array( 'sent' => MyKavo_Bots::send(), 'totals' => MyKavo_Bots::daily_totals( 14 ) ) );
} elseif ( 'rows' === $do ) {
	global $wpdb;
	echo wp_json_encode( $wpdb->get_results( 'SELECT * FROM ' . MyKavo_Bots::table(), ARRAY_A ) );
} else {
	echo wp_json_encode( MyKavo_Bots::summary() );
}
