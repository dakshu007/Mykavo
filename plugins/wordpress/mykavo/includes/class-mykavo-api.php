<?php
/**
 * Server-side client for the MyKavo API.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Talks to mykavo.app with the site's token. The token never reaches the
 * browser: wp-admin asks this site's own REST routes, which call through here.
 * Only ever used while an administrator is viewing a MyKavo screen.
 */
final class MyKavo_API {

	const TIMEOUT = 12;

	const FEATURES_OPTION = 'mykavo_features';

	/**
	 * Plan features GET /status reports.
	 */
	const FEATURES = array( 'autoRollback', 'aiInsights', 'pluginHealth', 'checkoutGuard', 'updateWindows' );

	/**
	 * GET with a short transient cache, so moving between screens is instant
	 * and MyKavo is asked at most once a minute for the same thing.
	 *
	 * @param string $path      API path under /api/wp/v1.
	 * @param string $cache_key Transient suffix, or '' for no cache.
	 * @param int    $ttl       Cache lifetime in seconds.
	 * @return array|WP_Error
	 */
	public static function get( $path, $cache_key = '', $ttl = 60 ) {
		if ( '' !== $cache_key ) {
			$cached = get_transient( 'mykavo_cache_' . $cache_key );
			if ( is_array( $cached ) ) {
				return $cached;
			}
		}
		$result = self::request( 'GET', $path );
		if ( '' !== $cache_key && ! is_wp_error( $result ) ) {
			set_transient( 'mykavo_cache_' . $cache_key, $result, $ttl );
		}
		return $result;
	}

	/**
	 * An authenticated request to MyKavo.
	 *
	 * @param string     $method  HTTP method.
	 * @param string     $path    API path under /api/wp/v1.
	 * @param array|null $body    JSON body.
	 * @param int        $timeout Seconds before giving up.
	 * @return array|WP_Error
	 */
	public static function request( $method, $path, $body = null, $timeout = self::TIMEOUT ) {
		$connection = MyKavo_Connection::get();
		if ( null === $connection ) {
			return new WP_Error( 'mykavo_not_connected', __( 'This site is not connected to MyKavo.', 'mykavo' ), array( 'status' => 401 ) );
		}

		$args = array(
			'method'  => $method,
			'timeout' => $timeout,
			'headers' => array(
				'Authorization' => 'Bearer ' . $connection['token'],
				'Accept'        => 'application/json',
				'User-Agent'    => 'MyKavo-WordPress/' . MYKAVO_VERSION . '; ' . home_url( '/' ),
			),
		);
		if ( null !== $body ) {
			$args['headers']['Content-Type'] = 'application/json';
			$args['body']                    = wp_json_encode( $body );
		}

		return self::decode( wp_remote_request( self::url( $path ), $args ) );
	}

	/**
	 * The unauthenticated connect exchange: one-time code + PKCE verifier in,
	 * site token out.
	 *
	 * @param string $code     One-time code from the redirect.
	 * @param string $verifier PKCE verifier kept on this server.
	 * @return array|WP_Error
	 */
	public static function exchange( $code, $verifier ) {
		$response = wp_remote_post(
			self::url( '/connect/exchange' ),
			array(
				'timeout' => 20,
				'headers' => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'application/json',
					'User-Agent'   => 'MyKavo-WordPress/' . MYKAVO_VERSION,
				),
				'body'    => wp_json_encode(
					array(
						'code'     => $code,
						'verifier' => $verifier,
						'site'     => home_url( '/' ),
					)
				),
			)
		);
		return self::decode( $response );
	}

	/**
	 * Absolute URL for an API path.
	 *
	 * @param string $path Path under /api/wp/v1.
	 * @return string
	 */
	private static function url( $path ) {
		return untrailingslashit( MYKAVO_APP_URL ) . '/api/wp/v1' . $path;
	}

	/**
	 * Turn a wp_remote_* response into data or a WP_Error with a message a
	 * person can act on.
	 *
	 * @param array|WP_Error $response Raw response.
	 * @return array|WP_Error
	 */
	private static function decode( $response ) {
		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'mykavo_unreachable',
				__( 'Could not reach MyKavo. Check that this server can make outbound HTTPS requests, then try again.', 'mykavo' ),
				array( 'status' => 502 )
			);
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$data   = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) ) {
			$data = array();
		}

		if ( $status >= 200 && $status < 300 ) {
			return $data;
		}

		if ( 401 === $status ) {
			return new WP_Error(
				'mykavo_not_connected',
				__( 'MyKavo no longer accepts this site\'s connection. It may have been disconnected from the MyKavo dashboard. Connect again to continue.', 'mykavo' ),
				array( 'status' => 401 )
			);
		}

		$message = isset( $data['error'] ) && is_string( $data['error'] )
			? $data['error']
			: __( 'MyKavo could not complete that request. Try again in a moment.', 'mykavo' );

		return new WP_Error(
			'mykavo_api_error',
			sanitize_text_field( $message ),
			array(
				'status'  => $status >= 400 && $status < 600 ? $status : 502,
				'code'    => isset( $data['code'] ) ? sanitize_key( (string) $data['code'] ) : '',
				'reason'  => isset( $data['reason'] ) && is_string( $data['reason'] ) ? strtoupper( sanitize_key( $data['reason'] ) ) : '',
				'scan_id' => isset( $data['scanId'] ) ? sanitize_text_field( (string) $data['scanId'] ) : '',
			)
		);
	}

	/**
	 * Whether a request failed because the workspace's plan does not include
	 * that feature (403 with reason "PLAN").
	 *
	 * @param mixed $result API result.
	 * @return bool
	 */
	public static function is_plan_error( $result ) {
		if ( ! is_wp_error( $result ) ) {
			return false;
		}
		$data = $result->get_error_data();
		return is_array( $data ) && isset( $data['status'], $data['reason'] ) && 403 === (int) $data['status'] && 'PLAN' === $data['reason'];
	}

	/**
	 * What this site's MyKavo plan includes, from GET /status (cached for
	 * five minutes). An older MyKavo that does not send `features` reads as
	 * "nothing extra". The last answer is kept in a non-autoloaded option so
	 * WP-Cron jobs can decide without calling MyKavo.
	 *
	 * @param bool $fresh Skip the cache.
	 * @return array<string,bool>|null Null when MyKavo could not be asked and nothing is known yet.
	 */
	public static function features( $fresh = false ) {
		if ( $fresh ) {
			delete_transient( 'mykavo_cache_status' );
		}
		$status = self::get( '/status', 'status', 5 * MINUTE_IN_SECONDS );
		if ( is_wp_error( $status ) ) {
			return self::known_features();
		}
		$raw      = isset( $status['features'] ) && is_array( $status['features'] ) ? $status['features'] : array();
		$features = array();
		foreach ( self::FEATURES as $key ) {
			$features[ $key ] = isset( $raw[ $key ] ) && true === $raw[ $key ];
		}
		if ( get_option( self::FEATURES_OPTION, null ) !== $features ) {
			if ( false === get_option( self::FEATURES_OPTION, false ) ) {
				add_option( self::FEATURES_OPTION, $features, '', false );
			} else {
				update_option( self::FEATURES_OPTION, $features, false );
			}
		}
		return $features;
	}

	/**
	 * The plan features last read from MyKavo, without asking again.
	 *
	 * @return array<string,bool>|null
	 */
	public static function known_features() {
		$known = get_option( self::FEATURES_OPTION, null );
		return is_array( $known ) ? $known : null;
	}

	/**
	 * Whether one feature is known to be included. Unknown reads as false.
	 *
	 * @param string $key Feature key.
	 * @return bool
	 */
	public static function has_feature( $key ) {
		$known = self::known_features();
		return is_array( $known ) && ! empty( $known[ $key ] );
	}
}
