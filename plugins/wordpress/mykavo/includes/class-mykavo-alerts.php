<?php
/**
 * Silent disasters: setting changes that quietly break or expose a site.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Some of the worst things that happen to a WordPress site make no noise at
 * all: "Discourage search engines" gets ticked on a live site, the site
 * address changes, the permalinks change, the admin email is swapped, or a
 * new administrator appears. Each of those is caught the moment it happens
 * (the option and role hooks fire only when the value actually changes),
 * written to a small local log and shown as a red notice on every wp-admin
 * screen until someone dismisses it.
 *
 * Free on every plan: it runs entirely inside WordPress. When the site is
 * connected, the event is also sent to MyKavo from WP-Cron (never during the
 * request that changed the setting), and on paid plans MyKavo sends an
 * instant email or Slack alert.
 */
final class MyKavo_Alerts {

	const OPTION    = 'mykavo_alerts';
	const CRON_HOOK = 'mykavo_alert_report';
	const MAX       = 30;

	/**
	 * Options watched, and how bad a change is.
	 *
	 * @return array<string,string>
	 */
	public static function watched_options() {
		return array(
			'blog_public'         => 'critical',
			'siteurl'             => 'critical',
			'home'                => 'critical',
			'permalink_structure' => 'high',
			'admin_email'         => 'high',
		);
	}

	/**
	 * Hook: update_option_{option}.
	 *
	 * @param mixed  $old    Old value.
	 * @param mixed  $value  New value.
	 * @param string $option Option name.
	 * @return void
	 */
	public static function option_changed( $old, $value, $option ) {
		$old   = is_scalar( $old ) ? (string) $old : '';
		$value = is_scalar( $value ) ? (string) $value : '';
		if ( $old === $value ) {
			return;
		}
		if ( 'blog_public' === $option ) {
			// Only "hide from search engines" is a disaster; the reverse is good news.
			if ( '0' !== $value ) {
				return;
			}
			self::add( 'noindex', 'critical', '', '' );
			return;
		}
		$types = array(
			'siteurl'             => 'siteurl',
			'home'                => 'home',
			'permalink_structure' => 'permalinks',
			'admin_email'         => 'admin_email',
		);
		if ( isset( $types[ $option ] ) ) {
			$severity = self::watched_options();
			self::add( $types[ $option ], $severity[ $option ], $old, $value );
		}
	}

	/**
	 * Hook: set_user_role / add_user_role. A user became an administrator.
	 *
	 * @param int    $user_id User id.
	 * @param string $role    New role.
	 * @return void
	 */
	public static function role_added( $user_id, $role ) {
		if ( 'administrator' !== $role ) {
			return;
		}
		$user = get_userdata( (int) $user_id );
		if ( ! $user ) {
			return;
		}
		// Re-saving an existing administrator's profile is not news.
		foreach ( self::all() as $alert ) {
			if ( 'new_admin' === $alert['type'] && (string) $user->user_login === $alert['to'] && $alert['at'] > time() - MINUTE_IN_SECONDS ) {
				return;
			}
		}
		self::add( 'new_admin', 'critical', '', (string) $user->user_login );
	}

	/**
	 * Every alert, newest first.
	 *
	 * @return array
	 */
	public static function all() {
		$list = get_option( self::OPTION, array() );
		$out  = array();
		foreach ( is_array( $list ) ? $list : array() as $alert ) {
			if ( is_array( $alert ) && isset( $alert['id'], $alert['type'], $alert['at'] ) ) {
				$out[] = array_merge(
					array(
						'severity'  => 'high',
						'from'      => '',
						'to'        => '',
						'by'        => '',
						'dismissed' => false,
						'reported'  => false,
					),
					$alert
				);
			}
		}
		return $out;
	}

	/**
	 * Alerts nobody dismissed yet.
	 *
	 * @return array
	 */
	public static function open() {
		return array_values(
			array_filter(
				self::all(),
				static function ( $alert ) {
					return empty( $alert['dismissed'] );
				}
			)
		);
	}

	/**
	 * Dismiss one alert, or all of them ('all').
	 *
	 * @param string $id Alert id.
	 * @return void
	 */
	public static function dismiss( $id ) {
		$list = self::all();
		foreach ( $list as $i => $alert ) {
			if ( 'all' === $id || $alert['id'] === $id ) {
				$list[ $i ]['dismissed'] = true;
			}
		}
		self::save( $list );
	}

	/**
	 * What an alert says, in words.
	 *
	 * @param array $alert Alert.
	 * @return string
	 */
	public static function message( array $alert ) {
		switch ( $alert['type'] ) {
			case 'noindex':
				return __( '"Discourage search engines from indexing this site" was switched on. Google will drop this site from search results.', 'mykavo' );
			case 'siteurl':
				/* translators: 1: old address, 2: new address. */
				return sprintf( __( 'The WordPress address changed from %1$s to %2$s.', 'mykavo' ), $alert['from'], $alert['to'] );
			case 'home':
				/* translators: 1: old address, 2: new address. */
				return sprintf( __( 'The site address changed from %1$s to %2$s.', 'mykavo' ), $alert['from'], $alert['to'] );
			case 'permalinks':
				/* translators: 1: old structure, 2: new structure. */
				return sprintf( __( 'The permalink structure changed from "%1$s" to "%2$s". Old links may now return 404.', 'mykavo' ), '' !== $alert['from'] ? $alert['from'] : __( 'Plain', 'mykavo' ), '' !== $alert['to'] ? $alert['to'] : __( 'Plain', 'mykavo' ) );
			case 'admin_email':
				/* translators: 1: old email address, 2: new email address. */
				return sprintf( __( 'The administration email changed from %1$s to %2$s.', 'mykavo' ), $alert['from'], $alert['to'] );
			case 'new_admin':
				/* translators: %s: user login name. */
				return sprintf( __( 'A new administrator appeared: %s.', 'mykavo' ), $alert['to'] );
		}
		return __( 'An important setting changed.', 'mykavo' );
	}

	/**
	 * The alerts for the MyKavo screen.
	 *
	 * @return array
	 */
	public static function for_screen() {
		return array_map(
			static function ( $alert ) {
				return array(
					'id'        => $alert['id'],
					'type'      => $alert['type'],
					'severity'  => $alert['severity'],
					'at'        => (int) $alert['at'],
					'by'        => $alert['by'],
					'message'   => self::message( $alert ),
					'dismissed' => (bool) $alert['dismissed'],
					'reported'  => (bool) $alert['reported'],
				);
			},
			array_slice( self::all(), 0, 15 )
		);
	}

	/* ----------------------------------------------------------- notice -- */

	/**
	 * A red notice on every wp-admin screen while an alert is open.
	 *
	 * @return void
	 */
	public static function admin_notice() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		// MyKavo's own screen shows these in its Overview instead.
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && false !== strpos( (string) $screen->id, 'mykavo' ) ) {
			return;
		}
		$open = self::open();
		if ( ! $open ) {
			return;
		}
		$dismiss = wp_nonce_url( admin_url( 'admin-post.php?action=mykavo_dismiss_alert&alert=all' ), 'mykavo_dismiss_alert' );
		echo '<div class="notice notice-error"><p><strong>' . esc_html__( 'MyKavo: an important setting changed on this site', 'mykavo' ) . '</strong></p><ul style="list-style:disc;margin-left:20px">';
		foreach ( array_slice( $open, 0, 5 ) as $alert ) {
			$by = '' !== $alert['by'] ? ' ' . sprintf( /* translators: %s: user name. */ __( '(by %s)', 'mykavo' ), $alert['by'] ) : '';
			echo '<li>' . esc_html( self::message( $alert ) . $by ) . ' <span style="color:#646970">' . esc_html( human_time_diff( (int) $alert['at'] ) . ' ' . __( 'ago', 'mykavo' ) ) . '</span></li>';
		}
		echo '</ul><p>' . esc_html__( 'If you did not expect this, check it now.', 'mykavo' ) . ' <a class="button button-small" href="' . esc_url( $dismiss ) . '">' . esc_html__( 'It was me - dismiss', 'mykavo' ) . '</a></p></div>';
	}

	/**
	 * admin-post: dismiss.
	 *
	 * @return void
	 */
	public static function handle_dismiss() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'mykavo' ), 403 );
		}
		check_admin_referer( 'mykavo_dismiss_alert' );
		$id = isset( $_GET['alert'] ) ? sanitize_key( wp_unslash( $_GET['alert'] ) ) : 'all';
		self::dismiss( $id );
		wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url() );
		exit;
	}

	/* ----------------------------------------------------------- report -- */

	/**
	 * WP-Cron: send alerts MyKavo has not seen yet.
	 *
	 * @return void
	 */
	public static function report() {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		if ( ! MyKavo_Connection::is_connected() ) {
			return;
		}
		$list    = self::all();
		$pending = array();
		foreach ( $list as $alert ) {
			if ( empty( $alert['reported'] ) && $alert['at'] > time() - DAY_IN_SECONDS ) {
				$pending[] = array(
					'id'       => $alert['id'],
					'type'     => $alert['type'],
					'severity' => $alert['severity'],
					'from'     => '' !== $alert['from'] ? $alert['from'] : null,
					'to'       => '' !== $alert['to'] ? $alert['to'] : null,
					'by'       => '' !== $alert['by'] ? $alert['by'] : null,
					'at'       => gmdate( 'c', (int) $alert['at'] ),
					'message'  => self::message( $alert ),
				);
			}
		}
		if ( ! $pending ) {
			return;
		}
		$result = MyKavo_API::request( 'POST', '/alerts', array( 'alerts' => $pending ), 10 );
		if ( is_wp_error( $result ) ) {
			$data = $result->get_error_data();
			// 404: a MyKavo that does not take alerts yet. Do not retry forever.
			if ( ! is_array( $data ) || ! isset( $data['status'] ) || 404 !== (int) $data['status'] ) {
				return;
			}
		}
		$sent = wp_list_pluck( $pending, 'id' );
		foreach ( $list as $i => $alert ) {
			if ( in_array( $alert['id'], $sent, true ) ) {
				$list[ $i ]['reported'] = true;
			}
		}
		self::save( $list );
	}

	/* ---------------------------------------------------------- private -- */

	/**
	 * Record an alert, and queue it for MyKavo.
	 *
	 * @param string $type     Alert type.
	 * @param string $severity critical or high.
	 * @param string $from     Value before.
	 * @param string $to       Value after.
	 * @return void
	 */
	private static function add( $type, $severity, $from, $to ) {
		$user = wp_get_current_user();
		$by   = ( $user && $user->exists() ) ? (string) $user->display_name : ( wp_doing_cron() ? 'WP-Cron' : ( defined( 'WP_CLI' ) && WP_CLI ? 'WP-CLI' : '' ) );
		$list = self::all();
		array_unshift(
			$list,
			array(
				'id'        => strtolower( wp_generate_password( 12, false ) ),
				'type'      => $type,
				'severity'  => $severity,
				'from'      => substr( sanitize_text_field( $from ), 0, 200 ),
				'to'        => substr( sanitize_text_field( $to ), 0, 200 ),
				'by'        => substr( sanitize_text_field( $by ), 0, 100 ),
				'at'        => time(),
				'dismissed' => false,
				'reported'  => false,
			)
		);
		self::save( array_slice( $list, 0, self::MAX ) );
		if ( get_option( 'mykavo_connection' ) && ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_single_event( time() + 5, self::CRON_HOOK );
		}
	}

	/**
	 * Save (never autoloaded).
	 *
	 * @param array $list Alerts.
	 * @return void
	 */
	private static function save( array $list ) {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, array_values( $list ), '', false );
		} else {
			update_option( self::OPTION, array_values( $list ), false );
		}
	}
}
