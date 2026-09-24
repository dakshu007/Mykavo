<?php
/**
 * The stored link between this WordPress site and MyKavo.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the connection. Stored in ONE option that is never
 * autoloaded, so it costs nothing on requests that do not use it.
 */
final class MyKavo_Connection {

	const OPTION        = 'mykavo_connection';
	const HANDSHAKE_TTL = 900;
	const SUMMARY_KEY   = 'mykavo_summary';

	/**
	 * The saved connection, or null when this site is not connected.
	 *
	 * @return array|null
	 */
	public static function get() {
		$value = get_option( self::OPTION, null );
		if ( ! is_array( $value ) || empty( $value['token'] ) || ! is_string( $value['token'] ) ) {
			return null;
		}
		return $value;
	}

	/**
	 * Whether the site is connected.
	 *
	 * @return bool
	 */
	public static function is_connected() {
		return null !== self::get();
	}

	/**
	 * Save a fresh connection returned by the MyKavo token exchange.
	 *
	 * @param array $data Exchange response.
	 * @return void
	 */
	public static function save( array $data ) {
		$website = isset( $data['website'] ) && is_array( $data['website'] ) ? $data['website'] : array();
		$value   = array(
			'token'         => (string) $data['token'],
			'website_id'    => isset( $website['id'] ) ? sanitize_text_field( $website['id'] ) : '',
			'website_name'  => isset( $website['name'] ) ? sanitize_text_field( $website['name'] ) : '',
			'website_url'   => isset( $website['url'] ) ? esc_url_raw( $website['url'] ) : '',
			'workspace'     => isset( $data['workspace']['name'] ) ? sanitize_text_field( $data['workspace']['name'] ) : '',
			'dashboard_url' => isset( $data['dashboardUrl'] ) ? esc_url_raw( $data['dashboardUrl'] ) : '',
			'connected_at'  => time(),
		);
		// autoload = false: the token is read only on MyKavo admin screens.
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, $value, '', false );
		} else {
			update_option( self::OPTION, $value, false );
		}
		self::flush_cache();
	}

	/**
	 * Forget the connection and everything cached from it.
	 *
	 * @return void
	 */
	public static function clear() {
		delete_option( self::OPTION );
		self::flush_cache();
		delete_transient( self::SUMMARY_KEY );
	}

	/**
	 * Drop cached API responses (after an action changes what they show).
	 *
	 * @return void
	 */
	public static function flush_cache() {
		foreach ( array( 'site', 'pages', 'scans', 'changes_open', 'changes_all' ) as $key ) {
			delete_transient( 'mykavo_cache_' . $key );
		}
	}

	/* ------------------------------- handshake ------------------------------ */

	/**
	 * Start a connect handshake for the current user: a CSRF state and a PKCE
	 * verifier, kept server-side for 15 minutes.
	 *
	 * @return array{state:string,challenge:string}
	 */
	public static function begin_handshake() {
		$state    = self::random_token( 24 );
		$verifier = self::random_token( 48 );
		set_transient(
			self::handshake_key(),
			array(
				'state'    => $state,
				'verifier' => $verifier,
			),
			self::HANDSHAKE_TTL
		);
		return array(
			'state'     => $state,
			'challenge' => self::base64url( hash( 'sha256', $verifier, true ) ),
		);
	}

	/**
	 * The verifier for a returning handshake, if the state matches. One use.
	 *
	 * @param string $state State echoed back by MyKavo.
	 * @return string|null
	 */
	public static function finish_handshake( $state ) {
		$key       = self::handshake_key();
		$handshake = get_transient( $key );
		delete_transient( $key );
		if ( ! is_array( $handshake ) || empty( $handshake['state'] ) || ! is_string( $state ) ) {
			return null;
		}
		if ( ! hash_equals( (string) $handshake['state'], $state ) ) {
			return null;
		}
		return (string) $handshake['verifier'];
	}

	/**
	 * Per-user handshake key: two admins connecting at once never collide.
	 *
	 * @return string
	 */
	private static function handshake_key() {
		return 'mykavo_handshake_' . get_current_user_id();
	}

	/**
	 * URL-safe random string.
	 *
	 * @param int $bytes Entropy in bytes.
	 * @return string
	 */
	private static function random_token( $bytes ) {
		return self::base64url( random_bytes( $bytes ) );
	}

	/**
	 * Base64url without padding (RFC 7636).
	 *
	 * @param string $raw Raw bytes.
	 * @return string
	 */
	private static function base64url( $raw ) {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- PKCE requires base64url.
		return rtrim( strtr( base64_encode( $raw ), '+/', '-_' ), '=' );
	}
}
