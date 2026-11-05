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
		$admin  = array( __CLASS__, 'can_manage' );
		$viewer = array( __CLASS__, 'can_view' );
		$id     = array(
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
				'permission_callback' => $viewer,
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
				'permission_callback' => $viewer,
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
				'permission_callback' => $viewer,
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
					'permission_callback' => $viewer,
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
					'permission_callback' => $viewer,
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
					'permission_callback' => $viewer,
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
							// A plugin basename, or a theme folder name (themes roll back from snapshots).
							return is_string( $value ) && validate_file( $value ) === 0 && (bool) preg_match( '#^(?:[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.php|[A-Za-z0-9][A-Za-z0-9._-]{0,99})$#', $value );
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
				'permission_callback' => $viewer,
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
					'permission_callback' => $viewer,
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
				'permission_callback' => $viewer,
			)
		);

		register_rest_route(
			self::NS,
			'/plugin-health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'plugin_health' ),
				'permission_callback' => $viewer,
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
					'permission_callback' => $viewer,
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
					'permission_callback' => $viewer,
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

		/* ------------------------------------------------------------ 1.3.0 -- */

		$bool = static function ( $required = true ) {
			return array(
				'type'     => 'boolean',
				'required' => $required,
			);
		};
		$simple = static function ( $path, $method, $callback, $permission, $args = array() ) {
			register_rest_route(
				self::NS,
				$path,
				array(
					'methods'             => $method,
					'callback'            => array( __CLASS__, $callback ),
					'permission_callback' => $permission,
					'args'                => $args,
				)
			);
		};

		// Silent-disaster alerts.
		$simple( '/alerts', WP_REST_Server::READABLE, 'alerts', $viewer );
		$simple(
			'/alerts/dismiss',
			WP_REST_Server::CREATABLE,
			'dismiss_alert',
			$admin,
			array(
				'id' => array(
					'type'     => 'string',
					'required' => true,
					'pattern'  => '^(all|[a-z0-9]{6,20})$',
				),
			)
		);

		// Safe Update All.
		$simple( '/safe-update', WP_REST_Server::READABLE, 'safe_update', $admin );
		$simple(
			'/safe-update/start',
			WP_REST_Server::CREATABLE,
			'safe_update_start',
			$admin,
			array(
				'backup'   => $bool( false ),
				'baseline' => $bool( false ),
			)
		);
		$simple(
			'/safe-update/plugin',
			WP_REST_Server::CREATABLE,
			'safe_update_plugin',
			$admin,
			array(
				'file' => array(
					'type'              => 'string',
					'required'          => true,
					'validate_callback' => static function ( $value ) {
						return is_string( $value ) && validate_file( $value ) === 0 && (bool) preg_match( '#^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.php$#', $value );
					},
				),
			)
		);
		$simple( '/safe-update/finish', WP_REST_Server::CREATABLE, 'safe_update_finish', $admin );
		$simple( '/snapshots', WP_REST_Server::READABLE, 'snapshots', $viewer );

		// Suggested pages to monitor.
		$simple( '/suggestions', WP_REST_Server::READABLE, 'suggestions', $admin );

		// Watch an element picked on the page.
		$simple(
			'/elements',
			WP_REST_Server::CREATABLE,
			'add_element',
			$admin,
			array(
				'url'      => array(
					'type'     => 'string',
					'format'   => 'uri',
					'required' => true,
				),
				'selector' => array(
					'type'      => 'string',
					'required'  => true,
					'minLength' => 1,
					'maxLength' => 500,
				),
				'name'     => array(
					'type'      => 'string',
					'required'  => true,
					'minLength' => 1,
					'maxLength' => 100,
				),
				'text'     => array(
					'type'      => 'string',
					'default'   => '',
					'maxLength' => 300,
				),
				'href'     => array(
					'type'      => 'string',
					'default'   => '',
					'maxLength' => 2000,
				),
			)
		);

		// AI crawlers: per-crawler rules, llms.txt, redirects.
		$simple(
			'/robots/rules',
			WP_REST_Server::CREATABLE,
			'robots_rules',
			$admin,
			array(
				'blocked' => array(
					'type'     => 'array',
					'required' => true,
					'items'    => array( 'type' => 'string' ),
					'maxItems' => 50,
				),
			)
		);
		$simple( '/llms', WP_REST_Server::READABLE, 'llms', $viewer );
		$simple( '/llms', WP_REST_Server::CREATABLE, 'llms_settings', $admin, array( 'enabled' => $bool() ) );
		$path_arg = array(
			'type'      => 'string',
			'required'  => true,
			'minLength' => 2,
			'maxLength' => 255,
		);
		$simple( '/redirects', WP_REST_Server::READABLE, 'redirects', $viewer );
		$simple(
			'/redirects',
			WP_REST_Server::CREATABLE,
			'add_redirect',
			$admin,
			array(
				'from' => $path_arg,
				'to'   => array(
					'type'      => 'string',
					'required'  => true,
					'maxLength' => 2000,
				),
			)
		);
		$simple( '/redirects', WP_REST_Server::DELETABLE, 'remove_redirect', $admin, array( 'from' => $path_arg ) );
		$simple(
			'/redirects/suggest',
			WP_REST_Server::CREATABLE,
			'suggest_redirects',
			$admin,
			array(
				'paths' => array(
					'type'     => 'array',
					'required' => true,
					'items'    => array( 'type' => 'string' ),
					'maxItems' => 20,
				),
			)
		);

		// Plugin health: automatic updates for vulnerable plugins (Pro, Agency).
		$simple( '/plugin-health/vuln-autoupdate', WP_REST_Server::CREATABLE, 'vuln_autoupdate', $admin, array( 'enabled' => $bool() ) );

		// Email delivery test and contact forms.
		$simple( '/forms', WP_REST_Server::READABLE, 'forms', $viewer );
		$simple( '/forms/sync', WP_REST_Server::CREATABLE, 'forms_sync', $admin );
		$simple( '/forms/mail', WP_REST_Server::CREATABLE, 'mail_settings', $admin, array( 'enabled' => $bool() ) );
		$simple( '/forms/mail/test', WP_REST_Server::CREATABLE, 'mail_test', $admin );

		// Client reports (Agency).
		$simple( '/reports', WP_REST_Server::READABLE, 'reports', $viewer );
		$simple(
			'/reports/branding',
			WP_REST_Server::CREATABLE,
			'report_branding',
			$admin,
			array(
				'brandName' => array(
					'type'      => array( 'string', 'null' ),
					'maxLength' => 60,
				),
				'color'     => array(
					'type'    => array( 'string', 'null' ),
					'pattern' => '^#[0-9a-fA-F]{6}$',
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
	 * Only administrators act on monitoring: approve, scan, roll back,
	 * change settings.
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return MyKavo_Roles::can_manage();
	}

	/**
	 * Administrators and MyKavo viewers can see monitoring (read-only).
	 *
	 * @return bool
	 */
	public static function can_view() {
		return MyKavo_Roles::can_view();
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
		$result = MyKavo_API::get( '/pages', 'pages', 300 );
		if ( ! is_wp_error( $result ) && isset( $result['pages'] ) && is_array( $result['pages'] ) ) {
			self::remember_pages( $result['pages'] );
		}
		return self::respond( $result );
	}

	/**
	 * Keep the monitored addresses (and the buttons and forms MyKavo watches
	 * on them) on this site, for the "did it crash?" check, llms.txt and the
	 * editor panel, which never call MyKavo themselves. Never autoloaded.
	 *
	 * @param array $pages Pages from GET /pages.
	 * @return void
	 */
	private static function remember_pages( array $pages ) {
		$urls     = array();
		$elements = array();
		foreach ( $pages as $page ) {
			if ( ! is_array( $page ) || empty( $page['url'] ) || ! is_string( $page['url'] ) ) {
				continue;
			}
			$url    = esc_url_raw( $page['url'] );
			$urls[] = $url;
			if ( ! empty( $page['elements'] ) && is_array( $page['elements'] ) ) {
				foreach ( array_slice( $page['elements'], 0, 20 ) as $el ) {
					if ( is_array( $el ) && ! empty( $el['selector'] ) ) {
						$elements[ $url ][] = array(
							'name'     => isset( $el['name'] ) ? sanitize_text_field( (string) $el['name'] ) : '',
							'selector' => sanitize_text_field( (string) $el['selector'] ),
							'text'     => isset( $el['expectedText'] ) ? sanitize_text_field( (string) $el['expectedText'] ) : '',
							'href'     => isset( $el['expectedHref'] ) ? esc_url_raw( (string) $el['expectedHref'] ) : '',
						);
					}
				}
			}
		}
		$urls = array_slice( $urls, 0, 200 );
		foreach ( array(
			'mykavo_known_pages'    => $urls,
			'mykavo_known_elements' => $elements,
		) as $option => $value ) {
			if ( false === get_option( $option, false ) ) {
				add_option( $option, $value, '', false );
			} elseif ( get_option( $option ) !== $value ) {
				update_option( $option, $value, false );
			}
		}
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
		if ( ! current_user_can( 'update_plugins' ) && ! current_user_can( 'update_themes' ) ) {
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
		$last['vulnAutoUpdate'] = MyKavo_Health::vuln_autoupdate();
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

	/* ---------------------------------------------------------------- 1.3.0 -- */

	/**
	 * Silent-disaster alerts kept on this site.
	 *
	 * @return WP_REST_Response
	 */
	public static function alerts() {
		return rest_ensure_response( array( 'alerts' => MyKavo_Alerts::for_screen() ) );
	}

	/**
	 * Dismiss an alert (or all).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function dismiss_alert( WP_REST_Request $request ) {
		MyKavo_Alerts::dismiss( (string) $request->get_param( 'id' ) );
		return self::alerts();
	}

	/**
	 * Safe Update All: plugins waiting, backup plugin, running batch.
	 *
	 * @return WP_REST_Response
	 */
	public static function safe_update() {
		return rest_ensure_response( MyKavo_Safe_Update::overview() );
	}

	/**
	 * Start Safe Update All.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function safe_update_start( WP_REST_Request $request ) {
		$batch = MyKavo_Safe_Update::start( (bool) $request->get_param( 'backup' ), (bool) $request->get_param( 'baseline' ) );
		return is_wp_error( $batch ) ? $batch : rest_ensure_response( array( 'batch' => $batch ) );
	}

	/**
	 * Update one plugin inside Safe Update All.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function safe_update_plugin( WP_REST_Request $request ) {
		$row = MyKavo_Safe_Update::update_one( (string) $request->get_param( 'file' ) );
		return is_wp_error( $row ) ? $row : rest_ensure_response( $row );
	}

	/**
	 * Finish Safe Update All.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function safe_update_finish() {
		$result = MyKavo_Safe_Update::finish();
		MyKavo_Connection::flush_cache();
		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	/**
	 * Snapshots kept on this site.
	 *
	 * @return WP_REST_Response
	 */
	public static function snapshots() {
		return rest_ensure_response( MyKavo_Snapshots::summary() );
	}

	/**
	 * Suggested pages to monitor.
	 *
	 * @return WP_REST_Response
	 */
	public static function suggestions() {
		return rest_ensure_response( array( 'pages' => MyKavo_Suggestions::pages() ) );
	}

	/**
	 * Watch an element picked on a monitored page. MyKavo enforces the plan's
	 * limit; a plan error reads as "not allowed" so the screen shows why.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function add_element( WP_REST_Request $request ) {
		$url = esc_url_raw( (string) $request->get_param( 'url' ) );
		if ( wp_parse_url( $url, PHP_URL_HOST ) !== wp_parse_url( home_url(), PHP_URL_HOST ) ) {
			return new WP_Error( 'mykavo_invalid', __( 'Pick an element on a page of this site.', 'mykavo' ), array( 'status' => 400 ) );
		}
		$result = MyKavo_API::request(
			'POST',
			'/elements',
			array(
				'url'          => $url,
				'selector'     => sanitize_text_field( (string) $request->get_param( 'selector' ) ),
				'name'         => sanitize_text_field( (string) $request->get_param( 'name' ) ),
				'expectedText' => sanitize_text_field( (string) $request->get_param( 'text' ) ),
				'expectedHref' => esc_url_raw( (string) $request->get_param( 'href' ) ),
			),
			15
		);
		MyKavo_Connection::flush_cache();
		if ( MyKavo_API::is_plan_error( $result ) ) {
			$data = $result->get_error_data();
			return rest_ensure_response(
				array(
					'allowed' => false,
					'message' => $result->get_error_message(),
					'code'    => is_array( $data ) && isset( $data['code'] ) ? $data['code'] : '',
				)
			);
		}
		if ( is_wp_error( $result ) ) {
			return self::respond( $result );
		}
		return rest_ensure_response( array_merge( array( 'allowed' => true ), $result ) );
	}

	/**
	 * Save which AI crawlers are blocked.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function robots_rules( WP_REST_Request $request ) {
		MyKavo_Robots::set_blocked( (array) $request->get_param( 'blocked' ) );
		return self::robots();
	}

	/**
	 * llms.txt status and preview.
	 *
	 * @return WP_REST_Response
	 */
	public static function llms() {
		return rest_ensure_response( MyKavo_Llms::status() );
	}

	/**
	 * Switch llms.txt on or off.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function llms_settings( WP_REST_Request $request ) {
		MyKavo_Llms::set_enabled( (bool) $request->get_param( 'enabled' ) );
		if ( MyKavo_Llms::enabled() && MyKavo_API::has_feature( 'llmsSummaries' ) ) {
			MyKavo_Llms::refresh_summaries();
		}
		return self::llms();
	}

	/**
	 * Redirects for 404s.
	 *
	 * @return WP_REST_Response
	 */
	public static function redirects() {
		return rest_ensure_response( array( 'redirects' => MyKavo_Redirects::all() ) );
	}

	/**
	 * Create a redirect.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function add_redirect( WP_REST_Request $request ) {
		$list = MyKavo_Redirects::add( (string) $request->get_param( 'from' ), (string) $request->get_param( 'to' ) );
		return is_wp_error( $list ) ? $list : rest_ensure_response( array( 'redirects' => $list ) );
	}

	/**
	 * Remove a redirect.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function remove_redirect( WP_REST_Request $request ) {
		return rest_ensure_response( array( 'redirects' => MyKavo_Redirects::remove( (string) $request->get_param( 'from' ) ) ) );
	}

	/**
	 * MyKavo's suggested targets for 404 paths (paid).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function suggest_redirects( WP_REST_Request $request ) {
		return rest_ensure_response( MyKavo_Redirects::suggestions( (array) $request->get_param( 'paths' ) ) );
	}

	/**
	 * Switch automatic updates for vulnerable plugins.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function vuln_autoupdate( WP_REST_Request $request ) {
		MyKavo_Health::set_vuln_autoupdate( (bool) $request->get_param( 'enabled' ) );
		return rest_ensure_response( array( 'enabled' => MyKavo_Health::vuln_autoupdate() ) );
	}

	/**
	 * Email test and contact form checks.
	 *
	 * @return WP_REST_Response
	 */
	public static function forms() {
		return rest_ensure_response( MyKavo_Forms::status() );
	}

	/**
	 * Send the form pages to MyKavo now.
	 *
	 * @return WP_REST_Response
	 */
	public static function forms_sync() {
		MyKavo_Forms::sync();
		return self::forms();
	}

	/**
	 * Switch the daily email test.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function mail_settings( WP_REST_Request $request ) {
		MyKavo_Forms::set_mail_enabled( (bool) $request->get_param( 'enabled' ) );
		return self::forms();
	}

	/**
	 * Send the test email now.
	 *
	 * @return WP_REST_Response
	 */
	public static function mail_test() {
		MyKavo_Forms::test_mail();
		return self::forms();
	}

	/**
	 * Monthly client reports from MyKavo (Agency).
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function reports() {
		$result = MyKavo_API::get( '/reports', 'reports', MINUTE_IN_SECONDS );
		$data   = is_wp_error( $result ) ? $result->get_error_data() : null;
		$status = is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 0;
		if ( MyKavo_API::is_plan_error( $result ) || 404 === $status ) {
			return rest_ensure_response( array( 'allowed' => false ) );
		}
		if ( is_wp_error( $result ) ) {
			return self::respond( $result );
		}
		$reports = array();
		foreach ( isset( $result['reports'] ) && is_array( $result['reports'] ) ? $result['reports'] : array() as $row ) {
			if ( ! is_array( $row ) || empty( $row['month'] ) ) {
				continue;
			}
			$reports[] = array(
				'month'   => sanitize_text_field( (string) $row['month'] ),
				'url'     => isset( $row['url'] ) ? esc_url_raw( (string) $row['url'] ) : '',
				'pdfUrl'  => isset( $row['pdfUrl'] ) ? esc_url_raw( (string) $row['pdfUrl'] ) : '',
				'summary' => isset( $row['summary'] ) && is_array( $row['summary'] ) ? array_map( 'intval', array_intersect_key( $row['summary'], array_flip( array( 'updates', 'rollbacks', 'uptimePermille', 'sslDaysLeft', 'changesCaught', 'aiVisits' ) ) ) ) : array(),
			);
		}
		$branding = isset( $result['branding'] ) && is_array( $result['branding'] ) ? $result['branding'] : array();
		return rest_ensure_response(
			array(
				'allowed'     => true,
				// The report is switched on per website in MyKavo.
				'enabled'     => ! isset( $result['enabled'] ) || true === $result['enabled'],
				'settingsUrl' => isset( $result['settingsUrl'] ) ? esc_url_raw( (string) $result['settingsUrl'] ) : '',
				'brandingUrl' => isset( $result['brandingUrl'] ) ? esc_url_raw( (string) $result['brandingUrl'] ) : '',
				'reports'     => $reports,
				'branding'    => array(
					'name'    => isset( $branding['name'] ) ? sanitize_text_field( (string) $branding['name'] ) : '',
					'logoUrl' => isset( $branding['logoUrl'] ) ? esc_url_raw( (string) $branding['logoUrl'] ) : '',
					'color'   => isset( $branding['color'] ) && preg_match( '/^#[0-9a-fA-F]{6}$/', (string) $branding['color'] ) ? (string) $branding['color'] : '',
				),
			)
		);
	}

	/**
	 * Save the report brand name and colour in MyKavo (the logo is uploaded in MyKavo).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function report_branding( WP_REST_Request $request ) {
		$name   = $request->get_param( 'brandName' );
		$color  = $request->get_param( 'color' );
		$result = MyKavo_API::request(
			'PUT',
			'/report-branding',
			array(
				'brandName' => is_string( $name ) && '' !== trim( $name ) ? sanitize_text_field( $name ) : null,
				'color'     => is_string( $color ) && '' !== $color ? $color : null,
			)
		);
		delete_transient( 'mykavo_cache_reports' );
		if ( MyKavo_API::is_plan_error( $result ) ) {
			return rest_ensure_response( array( 'allowed' => false ) );
		}
		if ( is_wp_error( $result ) ) {
			return self::respond( $result );
		}
		return self::reports();
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
				'audit_url'  => isset( $site['links']['siteAudit'] ) ? esc_url_raw( (string) $site['links']['siteAudit'] ) : '',
				'audit'      => isset( $site['siteAudit']['healthScore'] ) && is_numeric( $site['siteAudit']['healthScore'] ) ? (int) $site['siteAudit']['healthScore'] : null,
				'plan'       => isset( $site['workspace']['plan']['id'] ) ? sanitize_key( (string) $site['workspace']['plan']['id'] ) : '',
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
