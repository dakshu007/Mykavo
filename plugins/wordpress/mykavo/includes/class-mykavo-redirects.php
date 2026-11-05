<?php
/**
 * Redirects for pages AI crawlers asked for and got a 404.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * The AI crawlers screen lists addresses that answered a crawler with "404
 * Not Found" (usually an old link AI keeps quoting). Each one gets a
 * "Create redirect" button: the redirect is stored in one non-autoloaded
 * option and applied only on requests that would otherwise be a 404, so
 * every normal page view is untouched. Redirects stay on this site; free.
 *
 * On paid plans, from Starter, MyKavo suggests the page each one should
 * point to.
 */
final class MyKavo_Redirects {

	const OPTION = 'mykavo_redirects';
	const MAX    = 200;

	/**
	 * Action: template_redirect. Only does anything on a 404.
	 *
	 * @return void
	 */
	public static function maybe_redirect() {
		if ( ! is_404() ) {
			return;
		}
		$list = self::all();
		if ( ! $list ) {
			return;
		}
		$path = self::current_path();
		foreach ( $list as $i => $row ) {
			if ( $row['from'] === $path ) {
				$list[ $i ]['hits'] = isset( $row['hits'] ) ? (int) $row['hits'] + 1 : 1;
				update_option( self::OPTION, $list, false );
				wp_safe_redirect( $row['to'], 301, 'MyKavo' );
				exit;
			}
		}
	}

	/**
	 * Every redirect.
	 *
	 * @return array<int,array{from:string,to:string,at:int,hits:int}>
	 */
	public static function all() {
		$list = get_option( self::OPTION, array() );
		$out  = array();
		foreach ( is_array( $list ) ? $list : array() as $row ) {
			if ( is_array( $row ) && isset( $row['from'], $row['to'] ) ) {
				$out[] = array(
					'from' => (string) $row['from'],
					'to'   => (string) $row['to'],
					'at'   => isset( $row['at'] ) ? (int) $row['at'] : 0,
					'hits' => isset( $row['hits'] ) ? (int) $row['hits'] : 0,
				);
			}
		}
		return $out;
	}

	/**
	 * Add or replace a redirect. Only to pages on this site.
	 *
	 * @param string $from Path that 404s, e.g. /old-page/.
	 * @param string $to   Address on this site.
	 * @return array|WP_Error The redirects.
	 */
	public static function add( $from, $to ) {
		$from = self::normalize_path( $from );
		$to   = esc_url_raw( (string) $to );
		if ( '' === $from || '/' === $from ) {
			return new WP_Error( 'mykavo_redirect', __( 'Choose the address that answers 404.', 'mykavo' ), array( 'status' => 400 ) );
		}
		if ( 0 === strpos( $to, '/' ) ) {
			$to = home_url( $to );
		}
		if ( '' === $to || wp_parse_url( $to, PHP_URL_HOST ) !== wp_parse_url( home_url(), PHP_URL_HOST ) ) {
			return new WP_Error( 'mykavo_redirect', __( 'Redirects can only point to a page on this site.', 'mykavo' ), array( 'status' => 400 ) );
		}
		if ( self::normalize_path( (string) wp_parse_url( $to, PHP_URL_PATH ) ) === $from ) {
			return new WP_Error( 'mykavo_redirect', __( 'A page cannot redirect to itself.', 'mykavo' ), array( 'status' => 400 ) );
		}
		$list = array_values(
			array_filter(
				self::all(),
				static function ( $row ) use ( $from ) {
					return $row['from'] !== $from;
				}
			)
		);
		array_unshift(
			$list,
			array(
				'from' => $from,
				'to'   => $to,
				'at'   => time(),
				'hits' => 0,
			)
		);
		self::save( array_slice( $list, 0, self::MAX ) );
		return self::all();
	}

	/**
	 * Remove a redirect.
	 *
	 * @param string $from Path.
	 * @return array The redirects.
	 */
	public static function remove( $from ) {
		$from = self::normalize_path( $from );
		self::save(
			array_values(
				array_filter(
					self::all(),
					static function ( $row ) use ( $from ) {
						return $row['from'] !== $from;
					}
				)
			)
		);
		return self::all();
	}

	/**
	 * Paid (from Starter): MyKavo's suggested target for each missing path.
	 *
	 * @param string[] $paths Paths that answered 404.
	 * @return array{allowed:bool,suggestions:array}
	 */
	public static function suggestions( array $paths ) {
		$paths = array_slice( array_values( array_filter( array_map( array( __CLASS__, 'normalize_path' ), $paths ) ) ), 0, 20 );
		if ( ! $paths ) {
			return array(
				'allowed'     => true,
				'suggestions' => array(),
			);
		}
		$result = MyKavo_API::request( 'POST', '/redirect-suggestions', array( 'paths' => $paths ), 15 );
		if ( MyKavo_API::is_plan_error( $result ) ) {
			return array(
				'allowed'     => false,
				'suggestions' => array(),
			);
		}
		$out = array();
		if ( ! is_wp_error( $result ) && isset( $result['suggestions'] ) && is_array( $result['suggestions'] ) ) {
			foreach ( $result['suggestions'] as $row ) {
				if ( is_array( $row ) && isset( $row['path'], $row['url'] ) && is_string( $row['url'] ) ) {
					$out[] = array(
						'path'  => self::normalize_path( (string) $row['path'] ),
						'url'   => esc_url_raw( $row['url'] ),
						'title' => isset( $row['title'] ) ? sanitize_text_field( (string) $row['title'] ) : '',
					);
				}
			}
		}
		return array(
			'allowed'     => ! is_wp_error( $result ),
			'suggestions' => $out,
		);
	}

	/**
	 * A path as stored: leading slash, no query or fragment, no host.
	 *
	 * @param string $path Path or address.
	 * @return string
	 */
	public static function normalize_path( $path ) {
		$path = (string) wp_parse_url( (string) $path, PHP_URL_PATH );
		$path = preg_replace( '/[^\x21-\x7E]/', '', $path );
		if ( '' === $path ) {
			return '';
		}
		return '/' . ltrim( substr( $path, 0, 255 ), '/' );
	}

	/**
	 * The current request's path.
	 *
	 * @return string
	 */
	private static function current_path() {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- reduced to a path.
		return self::normalize_path( $uri );
	}

	/**
	 * Save (never autoloaded).
	 *
	 * @param array $list Redirects.
	 * @return void
	 */
	private static function save( array $list ) {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, $list, '', false );
		} else {
			update_option( self::OPTION, $list, false );
		}
	}
}
