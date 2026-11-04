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
					'scan'   => array(
						'type'              => 'string',
						'default'           => '',
						'validate_callback' => static function ( $value ) {
							return '' === $value || self::is_valid_id( $value );
						},
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
					'args'                => array(
						'fresh' => array(
							'type'    => 'boolean',
							'default' => false,
						),
					),
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
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'pages' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'add_pages' ),
					'permission_callback' => $admin,
					'args'                => array(
						'urls' => array(
							'type'     => 'array',
							'required' => true,
							'items'    => array(
								'type'   => 'string',
								'format' => 'uri',
							),
							'minItems' => 1,
							'maxItems' => 20,
						),
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/updates',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'updates' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'update_settings' ),
					'permission_callback' => $admin,
					'args'                => array(
						'enabled'      => array(
							'type' => 'boolean',
						),
						'autoRollback' => array(
							'type' => 'boolean',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/rollback',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'rollback' ),
				'permission_callback' => $admin,
				'args'                => array(
					'entry' => array(
						'type'              => 'string',
						'required'          => true,
						'validate_callback' => static function ( $value ) {
							return is_string( $value ) && (bool) preg_match( '/^[A-Za-z0-9]{6,40}$/', $value );
						},
					),
					'file'  => array(
						'type'              => 'string',
						'required'          => true,
						'validate_callback' => static function ( $value ) {
							return is_string( $value ) && validate_file( $value ) === 0 && (bool) preg_match( '#^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.php$#', $value );
						},
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/features',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'features' ),
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
			'/robots',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'robots' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'robots_settings' ),
					'permission_callback' => $admin,
					'args'                => array(
						'enabled' => array(
							'type'     => 'boolean',
							'required' => true,
						),
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/ai-history',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'ai_history' ),
				'permission_callback' => $admin,
			)
		);

		register_rest_route(
			self::NS,
			'/plugin-health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'plugin_health' ),
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
			'/checkout-guard',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'checkout_guard' ),
				'permission_callback' => $admin,
			)
		);

		register_rest_route(
			self::NS,
			'/update-window',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'update_window' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'save_update_window' ),
					'permission_callback' => $admin,
					'args'                => array(
						'window' => array(
							'type' => array( 'object', 'null' ),
						),
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/bots',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'bots' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'bots_settings' ),
					'permission_callback' => $admin,
					'args'                => array(
						'enabled' => array(
							'type'     => 'boolean',
							'required' => true,
						),
					),
				),
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
		$scan   = (string) $request->get_param( 'scan' );
		if ( '' !== $scan ) {
			// One update's findings: rare and specific, so not cached.
			return self::respond( MyKavo_API::request( 'GET', '/changes?status=all&scan=' . rawurlencode( $scan ) ) );
		}
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
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function scans( WP_REST_Request $request ) {
		if ( $request->get_param( 'fresh' ) ) {
			delete_transient( 'mykavo_cache_scans' );
		}
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
	 * Start monitoring pages picked in WordPress (WooCommerce guard, Pages tab).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function add_pages( WP_REST_Request $request ) {
		$pages = array();
		foreach ( (array) $request->get_param( 'urls' ) as $url ) {
			$pages[] = array( 'url' => esc_url_raw( (string) $url ) );
		}
		$result = MyKavo_API::request( 'POST', '/pages', array( 'pages' => $pages ) );
		MyKavo_Connection::flush_cache();
		return self::respond( $result );
	}

	/**
	 * Safe Updates log (kept on this site) and whether checks are on. Final
	 * verdicts are copied into the log so they survive the recent-scan list.
	 *
	 * @return WP_REST_Response
	 */
	public static function updates() {
		$pending = false;
		foreach ( MyKavo_Updates::log() as $entry ) {
			if ( ! empty( $entry['scan_id'] ) && empty( $entry['result'] ) ) {
				$pending = true;
				break;
			}
		}
		if ( $pending ) {
			$scans = MyKavo_API::get( '/scans', 'scans', 30 );
			if ( ! is_wp_error( $scans ) && isset( $scans['scans'] ) && is_array( $scans['scans'] ) ) {
				MyKavo_Updates::absorb_results( $scans['scans'] );
			}
		}
		return rest_ensure_response(
			array(
				'enabled'      => MyKavo_Updates::enabled(),
				'autoRollback' => MyKavo_Updates::auto_rollback_enabled(),
				'log'          => MyKavo_Rollback::decorate( MyKavo_Updates::log() ),
			)
		);
	}

	/**
	 * Switch update checks, or automatic rollback, on or off.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function update_settings( WP_REST_Request $request ) {
		if ( null !== $request->get_param( 'enabled' ) ) {
			MyKavo_Updates::set_enabled( (bool) $request->get_param( 'enabled' ) );
		}
		if ( null !== $request->get_param( 'autoRollback' ) ) {
			MyKavo_Updates::set_auto_rollback( (bool) $request->get_param( 'autoRollback' ) );
		}
		return self::updates();
	}

	/**
	 * One-click rollback of a plugin from the update history.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function rollback( WP_REST_Request $request ) {
		if ( ! current_user_can( 'update_plugins' ) ) {
			return new WP_Error( 'mykavo_rollback', __( 'You do not have permission to update plugins on this site.', 'mykavo' ), array( 'status' => 403 ) );
		}
		$result = MyKavo_Rollback::manual( (string) $request->get_param( 'entry' ), (string) $request->get_param( 'file' ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$response           = self::updates()->get_data();
		$response['result'] = $result;
		return rest_ensure_response( $response );
	}

	/**
	 * What this site's MyKavo plan includes. Never fails: unknown reads as
	 * "not included", so the screen simply shows the free version.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function features( WP_REST_Request $request ) {
		$features = MyKavo_API::features( (bool) $request->get_param( 'fresh' ) );
		return rest_ensure_response(
			array(
				'known'    => null !== $features,
				'features' => null !== $features ? $features : array_fill_keys( MyKavo_API::FEATURES, false ),
			)
		);
	}

	/**
	 * The robots.txt rules for AI crawlers.
	 *
	 * @return WP_REST_Response
	 */
	public static function robots() {
		return rest_ensure_response( MyKavo_Robots::status() );
	}

	/**
	 * Switch the AI crawler robots.txt rules on or off.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function robots_settings( WP_REST_Request $request ) {
		MyKavo_Robots::set_enabled( (bool) $request->get_param( 'enabled' ) );
		return self::robots();
	}

	/**
	 * Twelve months of AI crawler visits as MyKavo keeps them (plans with
	 * AI insights). Cached for an hour.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function ai_history() {
		$result = MyKavo_API::get( '/ai-bots?days=365', 'ai_history', HOUR_IN_SECONDS );
		$data   = is_wp_error( $result ) ? $result->get_error_data() : null;
		$status = is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 0;
		// 404 or 405: a MyKavo that does not keep a history yet.
		if ( MyKavo_API::is_plan_error( $result ) || 404 === $status || 405 === $status ) {
			return rest_ensure_response( array( 'allowed' => false ) );
		}
		if ( is_wp_error( $result ) ) {
			return self::respond( $result );
		}
		$days = array();
		foreach ( isset( $result['days'] ) && is_array( $result['days'] ) ? $result['days'] : array() as $row ) {
			if ( is_array( $row ) && isset( $row['day'], $row['agent'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $row['day'] ) ) {
				$days[] = array(
					'day'    => (string) $row['day'],
					'agent'  => sanitize_text_field( (string) $row['agent'] ),
					'hits'   => isset( $row['hits'] ) ? max( 0, (int) $row['hits'] ) : 0,
					'errors' => isset( $row['errors'] ) ? max( 0, (int) $row['errors'] ) : 0,
				);
			}
		}
		$first = array();
		foreach ( isset( $result['firstSeen'] ) && is_array( $result['firstSeen'] ) ? $result['firstSeen'] : array() as $agent => $day ) {
			if ( is_string( $day ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $day ) ) {
				$first[ sanitize_text_field( (string) $agent ) ] = $day;
			}
		}
		return rest_ensure_response(
			array(
				'allowed'   => true,
				'days'      => $days,
				'firstSeen' => (object) $first,
			)
		);
	}

	/**
	 * Plugin health: MyKavo's last answer about the installed plugins. Asks
	 * now when it never has (or when asked to).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function plugin_health( WP_REST_Request $request ) {
		$last = MyKavo_Health::last();
		if ( null === $last || $request->get_param( 'fresh' ) ) {
			$sent = MyKavo_Health::send();
			if ( is_wp_error( $sent ) ) {
				return null === $last ? self::respond( $sent ) : rest_ensure_response( $last );
			}
			$last = $sent;
		}
		return rest_ensure_response( $last );
	}

	/**
	 * WooCommerce checkout guard: ask MyKavo to watch the Place order, Proceed
	 * to checkout and Add to cart buttons on this store's own pages.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function checkout_guard() {
		$urls = MyKavo_Integrations::woocommerce_guard_urls();
		if ( ! $urls ) {
			return new WP_Error( 'mykavo_no_store', __( 'WooCommerce is not active, or its cart and checkout pages are not set up.', 'mykavo' ), array( 'status' => 400 ) );
		}
		$result = MyKavo_API::request( 'POST', '/checkout-guard', $urls, 20 );
		MyKavo_Connection::flush_cache();
		if ( MyKavo_API::is_plan_error( $result ) ) {
			return rest_ensure_response( array( 'allowed' => false ) );
		}
		if ( is_wp_error( $result ) ) {
			return self::respond( $result );
		}
		return rest_ensure_response(
			array(
				'allowed'  => true,
				'pages'    => isset( $result['pages'] ) ? (int) $result['pages'] : 0,
				'elements' => isset( $result['elements'] ) ? (int) $result['elements'] : 0,
				'urls'     => $urls,
			)
		);
	}

	/**
	 * The update window, as MyKavo has it, and whether automatic updates may
	 * run right now.
	 *
	 * @return WP_REST_Response
	 */
	public static function update_window() {
		return rest_ensure_response( self::window_response( MyKavo_Auto_Updates::settings() ) );
	}

	/**
	 * Save the update window in MyKavo (PUT /settings).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_update_window( WP_REST_Request $request ) {
		$window = $request->get_param( 'window' );
		if ( null !== $window && ! is_array( $window ) ) {
			return new WP_Error( 'mykavo_invalid', __( 'That update window is not valid.', 'mykavo' ), array( 'status' => 400 ) );
		}
		if ( is_array( $window ) && ! MyKavo_Auto_Updates::is_timezone( isset( $window['timezone'] ) ? $window['timezone'] : '' ) ) {
			return new WP_Error( 'mykavo_invalid', __( 'Choose a time zone such as Europe/London or America/New_York.', 'mykavo' ), array( 'status' => 400 ) );
		}
		$settings = MyKavo_Auto_Updates::save( $window );
		if ( MyKavo_API::is_plan_error( $settings ) ) {
			return rest_ensure_response( self::window_response( MyKavo_Auto_Updates::normalize( array() ) ) );
		}
		if ( is_wp_error( $settings ) ) {
			return self::respond( $settings );
		}
		return rest_ensure_response( self::window_response( $settings ) );
	}

	/**
	 * Window settings for the screen.
	 *
	 * @param array $settings Normalized settings.
	 * @return array
	 */
	private static function window_response( array $settings ) {
		return array(
			'updateWindow' => $settings['updateWindow'],
			'allowed'      => (bool) $settings['allowed']['updateWindows'],
			'open'         => MyKavo_Auto_Updates::window_allows( time() ),
			'siteTimezone' => MyKavo_Auto_Updates::site_timezone(),
		);
	}

	/**
	 * AI crawler visits over the last 30 days, counted on this site.
	 *
	 * @return WP_REST_Response
	 */
	public static function bots() {
		return rest_ensure_response( MyKavo_Bots::summary() );
	}

	/**
	 * Switch AI crawler counting on or off.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function bots_settings( WP_REST_Request $request ) {
		MyKavo_Bots::set_enabled( (bool) $request->get_param( 'enabled' ) );
		return self::bots();
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
