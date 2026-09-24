<?php
/**
 * Test helper: run the `wp mykavo` commands against the mock without a real
 * WP-CLI, using the smallest stand-in for the WP_CLI API they call. Mounted
 * only in the local Playground - never part of the plugin.
 */
namespace WP_CLI\Utils {
	function format_items( $format, $items, $fields ) {
		echo 'json' === $format ? json_encode( $items ) : implode( "\t", $fields ) . "\n";
		foreach ( 'json' === $format ? array() : $items as $item ) {
			echo implode( "\t", array_map( 'strval', array_values( $item ) ) ) . "\n";
		}
	}
	function get_flag_value( $assoc, $flag, $default = null ) {
		return isset( $assoc[ $flag ] ) ? $assoc[ $flag ] : $default;
	}
}

namespace {
	class WP_CLI {
		public static function log( $m ) { echo "log: $m\n"; }
		public static function success( $m ) { echo "success: $m\n"; }
		public static function warning( $m ) { echo "warning: $m\n"; }
		public static function error( $m ) { echo "error: $m\n"; throw new RuntimeException( $m ); }
		public static function confirm( $m, $a = array() ) {}
	}
	require '/wordpress/wp-load.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
	require_once MYKAVO_DIR . 'includes/class-mykavo-cli.php';
	header( 'Content-Type: text/plain' );
	$cli = new MyKavo_CLI();
	try {
		$cli->status( array(), array() );
		$cli->changes( array(), array( 'format' => 'table' ) );
		$cli->updates( array(), array() );
		$cli->monitor( array( home_url( '/about-us/' ) ), array() );
		$cli->safe_updates( array( 'on' ), array() );
	} catch ( RuntimeException $e ) {
		echo 'stopped';
	}
}
