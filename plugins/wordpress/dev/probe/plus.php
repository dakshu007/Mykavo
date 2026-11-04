<?php
/**
 * Test helper for the 1.3.0 features (rollback, auto-rollback, robots.txt,
 * plugin health, checkout guard, update windows): runs this site's own
 * MyKavo REST routes as the admin, and the WP-Cron and auto-update hooks
 * directly. Mounted only in the local Playground - never part of the plugin.
 */
require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
header( 'Content-Type: application/json' );
wp_set_current_user( 1 );
$do = isset( $_GET['do'] ) ? $_GET['do'] : '';

if ( 'connect' === $do ) {
	update_option( 'mykavo_connection', array( 'token' => 'mkv_wp_probe', 'website_id' => 'web1', 'website_name' => 'Northwind Coffee', 'website_url' => home_url( '/' ), 'workspace' => 'Northwind Studio', 'dashboard_url' => '' ), false );
	echo wp_json_encode( array( 'connected' => true ) );
} elseif ( 'rest' === $do ) {
	$req = new WP_REST_Request( isset( $_GET['method'] ) ? $_GET['method'] : 'GET', '/mykavo/v1' . $_GET['route'] );
	if ( isset( $_GET['query'] ) ) {
		parse_str( $_GET['query'], $q );
		$req->set_query_params( $q );
	}
	$raw = file_get_contents( 'php://input' );
	if ( $raw ) {
		$req->set_header( 'Content-Type', 'application/json' );
		$req->set_body( $raw );
	}
	$res = rest_do_request( $req );
	echo wp_json_encode( array( 'status' => $res->get_status(), 'data' => rest_get_server()->response_to_data( $res, false ) ) );
} elseif ( 'wporg' === $do ) {
	// WordPress's own update data says Demo Shop comes from WordPress.org.
	$updates = get_site_transient( 'update_plugins' );
	$updates = is_object( $updates ) ? $updates : new stdClass();
	$updates->last_checked = time();
	$updates->response     = array();
	$updates->no_update    = array(
		'demo-shop/demo-shop.php' => (object) array( 'id' => 'w.org/plugins/demo-shop', 'slug' => 'demo-shop', 'plugin' => 'demo-shop/demo-shop.php', 'new_version' => '8.2.0' ),
	);
	set_site_transient( 'update_plugins', $updates );
	echo wp_json_encode( array( 'ok' => true ) );
} elseif ( 'activate' === $do ) {
	activate_plugin( 'demo-shop/demo-shop.php', '', false, true );
	echo wp_json_encode( array( 'active' => is_plugin_active( 'demo-shop/demo-shop.php' ) ) );
} elseif ( 'plugin' === $do ) {
	wp_clean_plugins_cache( false );
	$data = get_plugin_data( WP_PLUGIN_DIR . '/demo-shop/demo-shop.php', false, false );
	echo wp_json_encode( array( 'version' => $data['Version'], 'active' => is_plugin_active( 'demo-shop/demo-shop.php' ), 'holds' => get_option( 'mykavo_rollback_holds' ) ) );
} elseif ( 'flush' === $do ) {
	foreach ( array( 'status', 'settings', 'ai_history' ) as $key ) {
		delete_transient( 'mykavo_cache_' . $key );
	}
	echo wp_json_encode( array( 'ok' => true ) );
} elseif ( 'log' === $do ) {
	echo wp_json_encode( get_option( 'mykavo_updates' ) );
} elseif ( 'cron' === $do ) {
	$events = array();
	foreach ( (array) _get_cron_array() as $time => $hooks ) {
		foreach ( (array) $hooks as $hook => $list ) {
			if ( 0 === strpos( $hook, 'mykavo' ) ) {
				foreach ( $list as $event ) {
					$events[] = array( 'hook' => $hook, 'in' => $time - time(), 'args' => $event['args'] );
				}
			}
		}
	}
	echo wp_json_encode( $events );
} elseif ( 'watch' === $do ) {
	do_action( 'mykavo_rollback_watch', $_GET['id'] );
	$entry = null;
	foreach ( (array) get_option( 'mykavo_updates' ) as $e ) {
		if ( $e['id'] === $_GET['id'] ) {
			$entry = $e;
		}
	}
	echo wp_json_encode( $entry );
} elseif ( 'daily' === $do ) {
	do_action( 'mykavo_bots_daily' );
	echo wp_json_encode( array( 'health' => get_option( 'mykavo_plugin_health' ), 'settings' => get_option( 'mykavo_remote_settings' ) ) );
} elseif ( 'autoupdate' === $do ) {
	delete_transient( 'mykavo_cache_settings' );
	$item = (object) array( 'plugin' => 'demo-shop/demo-shop.php', 'new_version' => isset( $_GET['v'] ) ? $_GET['v'] : '8.3.0' );
	echo wp_json_encode(
		array(
			'plugin'     => apply_filters( 'auto_update_plugin', true, $item ),
			'plugin_off' => apply_filters( 'auto_update_plugin', false, $item ),
			'ui_query'   => apply_filters( 'auto_update_plugin', null, $item ),
			'theme'      => apply_filters( 'auto_update_theme', true, (object) array( 'theme' => 'x' ) ),
			'core'       => apply_filters( 'auto_update_core', true, (object) array( 'current' => '6.9' ) ),
		)
	);
} elseif ( 'window' === $do ) {
	require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
	$w   = MyKavo_Auto_Updates::normalize_window( array( 'enabled' => true, 'days' => array( 1, 2, 3, 4, 5 ), 'startHour' => 22, 'endHour' => 4, 'timezone' => 'America/New_York' ) );
	$at  = static function ( $s ) {
		return ( new DateTimeImmutable( $s, new DateTimeZone( 'America/New_York' ) ) )->getTimestamp();
	};
	$day = MyKavo_Auto_Updates::normalize_window( array( 'enabled' => true, 'days' => array( 0, 6 ), 'startHour' => 9, 'endHour' => 17, 'timezone' => 'Bad/Zone' ) );
	echo wp_json_encode(
		array(
			'normalized'        => $w,
			'mon_23h'           => MyKavo_Auto_Updates::in_window( $w, $at( '2026-11-02 23:00' ) ), // true
			'tue_03h'           => MyKavo_Auto_Updates::in_window( $w, $at( '2026-11-03 03:00' ) ), // true (Mon window past midnight)
			'mon_03h'           => MyKavo_Auto_Updates::in_window( $w, $at( '2026-11-02 03:00' ) ), // false (Sun not chosen)
			'sat_03h'           => MyKavo_Auto_Updates::in_window( $w, $at( '2026-11-07 03:00' ) ), // true (Fri window)
			'tue_12h'           => MyKavo_Auto_Updates::in_window( $w, $at( '2026-11-03 12:00' ) ), // false
			'bad_zone_is_utc'   => $day['timezone'],
			'sun_10h_utc'       => MyKavo_Auto_Updates::in_window( $day, ( new DateTimeImmutable( '2026-11-08 10:00', new DateTimeZone( 'UTC' ) ) )->getTimestamp() ), // true
			'sun_17h_utc'       => MyKavo_Auto_Updates::in_window( $day, ( new DateTimeImmutable( '2026-11-08 17:00', new DateTimeZone( 'UTC' ) ) )->getTimestamp() ), // false
		)
	);
} else {
	echo wp_json_encode( array( 'error' => 'unknown do' ) );
}
