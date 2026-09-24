<?php
/**
 * Test helper: make WordPress believe a new Demo Shop version is available,
 * so the Plugins screen shows its update row. Mounted only in the local
 * Playground - never part of the plugin.
 */
require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

$checked = array();
foreach ( get_plugins() as $file => $data ) {
	$checked[ $file ] = $data['Version'];
}
$offer                  = new stdClass();
$offer->last_checked    = time();
$offer->checked         = $checked;
$offer->no_update       = array();
$offer->translations    = array();
$offer->response        = array(
	'demo-shop/demo-shop.php' => (object) array(
		'slug'        => 'demo-shop',
		'plugin'      => 'demo-shop/demo-shop.php',
		'new_version' => '8.3.0',
		'url'         => 'https://example.org/',
		'package'     => '',
	),
);
set_site_transient( 'update_plugins', $offer );
echo "update offered\n";
