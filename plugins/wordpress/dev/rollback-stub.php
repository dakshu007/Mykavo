<?php
/**
 * Test helper: stands in for downloads.wordpress.org so one-click and
 * automatic rollback can be tested offline. Answers the plugin's HEAD check
 * for demo-shop zips and hands the upgrader a locally built zip of that
 * version. Mounted only in the local Playground (mu-plugins).
 */
add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) {
		if ( preg_match( '#^https://downloads\.wordpress\.org/plugin/demo-shop\.([0-9.]+)\.zip$#', $url ) ) {
			return array( 'headers' => array(), 'body' => '', 'response' => array( 'code' => 200, 'message' => 'OK' ), 'cookies' => array(), 'filename' => null );
		}
		return $pre;
	},
	10,
	3
);
add_filter(
	'upgrader_pre_download',
	static function ( $reply, $package ) {
		if ( ! is_string( $package ) || ! preg_match( '#^https://downloads\.wordpress\.org/plugin/demo-shop\.([0-9.]+)\.zip$#', $package, $m ) ) {
			return $reply;
		}
		$zip  = new ZipArchive();
		$file = wp_tempnam( 'demo-shop.zip' );
		$zip->open( $file, ZipArchive::CREATE | ZipArchive::OVERWRITE );
		$zip->addFromString( 'demo-shop/demo-shop.php', "<?php\n/**\n * Plugin Name: Demo Shop\n * Version: " . $m[1] . "\n */\n" );
		$zip->close();
		return $file;
	},
	10,
	2
);
