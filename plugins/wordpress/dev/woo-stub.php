<?php
/**
 * Test helper: the smallest stand-in for WooCommerce that the plugin's store
 * check looks for (the WooCommerce class and wc_get_page_id), with real Cart,
 * Checkout, Shop and My account pages. Mounted only in the local Playground.
 */
if ( ! class_exists( 'WooCommerce' ) ) {
	class WooCommerce {} // phpcs:ignore
}

function wc_get_page_id( $key ) {
	$ids = get_option( 'mykavo_dev_woo_pages' );
	if ( ! is_array( $ids ) ) {
		$ids = array();
		foreach ( array( 'shop' => 'Shop', 'cart' => 'Cart', 'checkout' => 'Checkout', 'myaccount' => 'My account' ) as $k => $title ) {
			$ids[ $k ] = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => 'myaccount' === $k ? 'my-account' : $k ) );
		}
		update_option( 'mykavo_dev_woo_pages', $ids, false );
	}
	return isset( $ids[ $key ] ) ? (int) $ids[ $key ] : -1;
}
