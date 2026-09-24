<?php
/**
 * This site's own REST routes for the MyKavo screens.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Routes under /wp-json/mykavo/v1. Administrators only, authenticated by
 * WordPress's own cookie + nonce, so the MyKavo token stays on the server.
 */
final class MyKavo_Rest {

	const NS = 'mykavo/v1';

	/**
	 * Register every route.
	 *
	 * @return void
	 */
	public static function register_routes() {
		$admin = array( __CLASS__, 'can_manage' );
		$id    = array(
			'id' => array(
				'type'              => 'string',
				'required'          => true,
				'validate_callback' => array( __CLASS__, 'is_valid_id' ),
			),
		);

		register_rest_route(
			self::NS,
			'/overview',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'overview' ),
				'permission_callback' => $admin,
				'args'                => array(
					'fresh' => array(
						'type'    => 'boolean',
						'default' => false,
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/changes',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'changes' ),
				'permission_callback' => $admin,
				'args'                => array(
					'status' => array(
						'type'    => 'string',
						'enum'    => array( 'open', 'all' ),
						'default' => 'open',
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/changes/(?P<id>[A-Za-z0-9]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'change' ),
				'permission_callback' => $admin,
				'args'                => $id,
			)
		);

		register_rest_route(
			self::NS,
			'/changes/(?P<id>[A-Za-z0-9]+)/action',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'change_action' ),
				'permission_callback' => $admin,
				'args'                => array_merge(
					$id,
					array(
						'action' => array(
							'type'     => 'string',
							'required' => true,
							'enum'     => array( 'review', 'approve', 'ignore', 'resolve', 'reopen' ),
						),
					)
				),
			)
		);

		register_rest_route(
			self::NS,
			'/changes/(?P<id>[A-Za-z0-9]+)/baseline',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'change_baseline' ),
				'permission_callback' => $admin,
				'args'                => $id,
			)
		);

		register_rest_route(
			self::NS,
			'/scans',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'scans' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'run_scan' ),
					'permission_callback' => $admin,
				),
			)
		);

		register_rest_route(
			self::NS,
			'/pages',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'pages' ),
				'permission_callback' => $admin,
			)
		);

		register_rest_route(
			self::NS,
			'/disconnect',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'disconnect' ),
				'permission_callback' => $admin,
			)
		);
	}

	/**
	 * Only administrators see or act on monitoring.
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * MyKavo ids are short alphanumeric strings.
	 *
	 * @param mixed $value Route parameter.
	 * @return bool
	 */
	public static function is_valid_id( $value ) {
		return is_string( $value ) && (bool) preg_match( '/^[A-Za-z0-9]{8,40}$/', $value );
	}

	/**
	 * Overview screen data. Also refreshes the tiny summary the admin menu
	 * badge and dashboard widget read, so they never call MyKavo themselves.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function overview( WP_REST_Request $request ) {
		if ( $request->get_param( 'fresh' ) ) {
			delete_transient( 'mykavo_cache_site' );
		}
		$data = MyKavo_API::get( '/site', 'site', 60 );
		if ( ! is_wp_error( $data ) ) {
			self::remember_summary( $data );
		}
		return self::respond( $data );
	}

	/**
	 * Changes list.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function changes( WP_REST_Request $request ) {
		$status = 'all' === $request->get_param( 'status' ) ? 'all' : 'open';
		return self::respond( MyKavo_API::get( '/changes?status=' . $status, 'changes_' . $status, 60 ) );
	}

	/**
	 * One change. Never cached: it carries short-lived signed image links.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function change( WP_REST_Request $request ) {
		return self::respond( MyKavo_API::request( 'GET', '/changes/' . rawurlencode( $request['id'] ) ) );
	}

	/**
	 * Review / approve / ignore / resolve / reopen.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function change_action( WP_REST_Request $request ) {
		$result = MyKavo_API::request(
			'PATCH',
			'/changes/' . rawurlencode( $request['id'] ),
			array( 'action' => $request['action'] )
		);
		MyKavo_Connection::flush_cache();
		return self::respond( $result );
	}

	/**
	 * Accept the page as it is now.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function change_baseline( WP_REST_Request $request ) {
		$result = MyKavo_API::request( 'POST', '/changes/' . rawurlencode( $request['id'] ) . '/baseline', array() );
		MyKavo_Connection::flush_cache();
		return self::respond( $result );
	}

	/**
	 * Scan history.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function scans() {
		return self::respond( MyKavo_API::get( '/scans', 'scans', 30 ) );
	}

	/**
	 * Run a scan now.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function run_scan() {
		$result = MyKavo_API::request( 'POST', '/scans', array() );
		MyKavo_Connection::flush_cache();
		return self::respond( $result );
	}

	/**
	 * Monitored pages.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function pages() {
		return self::respond( MyKavo_API::get( '/pages', 'pages', 300 ) );
	}

	/**
	 * Disconnect: revoke the token at MyKavo (best effort), then forget it.
	 *
	 * @return WP_REST_Response
	 */
	public static function disconnect() {
		if ( MyKavo_Connection::is_connected() ) {
			MyKavo_API::request( 'POST', '/disconnect', array() );
		}
		MyKavo_Connection::clear();
		return rest_ensure_response( array( 'ok' => true ) );
	}

	/**
	 * Cache the handful of numbers the menu badge and dashboard widget show.
	 *
	 * @param array $site Overview response.
	 * @return void
	 */
	private static function remember_summary( array $site ) {
		$by = isset( $site['stats']['bySeverity'] ) && is_array( $site['stats']['bySeverity'] ) ? $site['stats']['bySeverity'] : array();
		set_transient(
			MyKavo_Connection::SUMMARY_KEY,
			array(
				'critical'   => isset( $by['CRITICAL'] ) ? (int) $by['CRITICAL'] : 0,
				'high'       => isset( $by['HIGH'] ) ? (int) $by['HIGH'] : 0,
				'open'       => isset( $site['stats']['openChanges'] ) ? (int) $site['stats']['openChanges'] : 0,
				'health'     => isset( $site['health']['status'] ) ? sanitize_key( (string) $site['health']['status'] ) : 'unknown',
				'last_scan'  => isset( $site['website']['lastScanAt'] ) ? sanitize_text_field( (string) $site['website']['lastScanAt'] ) : '',
				'checked_at' => time(),
			),
			DAY_IN_SECONDS
		);
	}

	/**
	 * Pass data through; when MyKavo says the connection is gone, forget it
	 * locally too so the screen offers to reconnect.
	 *
	 * @param array|WP_Error $result API result.
	 * @return WP_REST_Response|WP_Error
	 */
	private static function respond( $result ) {
		if ( is_wp_error( $result ) ) {
			if ( 'mykavo_not_connected' === $result->get_error_code() ) {
				MyKavo_Connection::clear();
			}
			return $result;
		}
		return rest_ensure_response( $result );
	}
}
