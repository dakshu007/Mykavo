<?php
/**
 * Suggested pages to monitor, picked from this site's own content.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Right after connecting (and any time on the Pages tab), MyKavo suggests
 * the pages most worth watching, read from WordPress itself: the home page,
 * the main pages (by menu order and comments), the contact page, and the
 * WooCommerce shop, cart, checkout and account pages. One click adds them;
 * MyKavo's service enforces the plan's page limit.
 */
final class MyKavo_Suggestions {

	const MAX = 10;

	/**
	 * Suggested pages, without the ones already monitored.
	 *
	 * @return array<int,array{url:string,title:string,reason:string}>
	 */
	public static function pages() {
		$out   = array();
		$known = get_option( 'mykavo_known_pages', array() );
		$taken = array();
		foreach ( is_array( $known ) ? $known : array() as $url ) {
			$taken[ self::key( (string) $url ) ] = true;
		}
		$add = static function ( $url, $title, $reason ) use ( &$out, &$taken ) {
			$key = MyKavo_Suggestions::key( $url );
			if ( '' === $url || isset( $taken[ $key ] ) || count( $out ) >= self::MAX ) {
				return;
			}
			$taken[ $key ] = true;
			$out[]         = array(
				'url'    => $url,
				'title'  => wp_strip_all_tags( (string) $title ),
				'reason' => $reason,
			);
		};

		$add( home_url( '/' ), get_bloginfo( 'name' ), 'home' );

		// WooCommerce: the pages that take money.
		$woo = class_exists( 'MyKavo_Integrations' ) ? MyKavo_Integrations::woocommerce_pages() : null;
		if ( is_array( $woo ) && ! empty( $woo['pages'] ) ) {
			foreach ( $woo['pages'] as $page ) {
				if ( isset( $page['url'], $page['label'] ) ) {
					$add( (string) $page['url'], (string) $page['label'], 'store' );
				}
			}
		}

		// The contact page, found by slug or title.
		$contact = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'posts_per_page' => 20,
				'orderby'        => 'menu_order',
				'order'          => 'ASC',
				'no_found_rows'  => true,
			)
		);
		foreach ( $contact as $post ) {
			if ( preg_match( '/contact|kontakt|contacto|contatti|get-in-touch/i', $post->post_name . ' ' . $post->post_title ) ) {
				$add( (string) get_permalink( $post ), $post->post_title, 'contact' );
				break;
			}
		}

		// The main pages: first in the menu order, then the most discussed.
		$main = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'posts_per_page' => 5,
				'orderby'        => array(
					'menu_order'    => 'ASC',
					'comment_count' => 'DESC',
				),
				'no_found_rows'  => true,
			)
		);
		foreach ( $main as $post ) {
			if ( (int) get_option( 'page_on_front' ) === (int) $post->ID ) {
				continue;
			}
			$add( (string) get_permalink( $post ), $post->post_title, 'main' );
		}
		return $out;
	}

	/**
	 * Compare addresses without scheme, "www." or trailing slash.
	 *
	 * @param string $url Address.
	 * @return string
	 */
	public static function key( $url ) {
		$url = strtolower( (string) $url );
		$url = preg_replace( '#^https?://(www\.)?#', '', $url );
		return untrailingslashit( (string) $url );
	}
}
