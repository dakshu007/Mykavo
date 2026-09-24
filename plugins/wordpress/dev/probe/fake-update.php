<?php
/**
 * Test helper: simulate WordPress updating a plugin, exactly as the upgrader
 * does it (pre-install filter, files replaced, process-complete action), so
 * Safe Updates can be tested without downloading anything. Mounted only in
 * the local Playground - never part of the plugin.
 */
if ( isset( $_GET['auto'] ) ) {
	define( 'DOING_CRON', true );
}
require '/wordpress/wp-load.php';

$dir  = WP_PLUGIN_DIR . '/demo-shop';
$file = 'demo-shop/demo-shop.php';
$head = "<?php\n/**\n * Plugin Name: Demo Shop\n * Version: %s\n */\n";
wp_mkdir_p( $dir );
file_put_contents( $dir . '/demo-shop.php', sprintf( $head, '8.1.0' ) );

apply_filters( 'upgrader_pre_install', true, array( 'plugin' => $file ) );
file_put_contents( $dir . '/demo-shop.php', sprintf( $head, '8.2.0' ) );
do_action(
	'upgrader_process_complete',
	null,
	array(
		'action'  => 'update',
		'type'    => 'plugin',
		'plugins' => array( $file ),
	)
);
echo "update simulated\n";
