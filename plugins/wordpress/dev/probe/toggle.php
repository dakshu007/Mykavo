<?php
/**
 * Test helper: activate or deactivate the Demo Shop plugin, or switch theme,
 * exactly as wp-admin does (not silently), so Safe Updates sees it. Mounted
 * only in the local Playground - never part of the plugin.
 */
require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

$file = 'demo-shop/demo-shop.php';
$do   = isset( $_GET['do'] ) ? $_GET['do'] : '';
if ( 'activate' === $do ) {
	$result = activate_plugin( $file );
	echo is_wp_error( $result ) ? $result->get_error_message() : "activated\n";
} elseif ( 'deactivate' === $do ) {
	deactivate_plugins( $file );
	echo "deactivated\n";
} elseif ( 'switch' === $do ) {
	$themes = array_keys( wp_get_themes() );
	$next   = get_stylesheet() === $themes[0] ? $themes[1] : $themes[0];
	switch_theme( $next );
	echo 'switched to ' . $next . "\n";
}
