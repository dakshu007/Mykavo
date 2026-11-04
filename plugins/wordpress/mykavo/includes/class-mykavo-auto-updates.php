<?php
/**
 * Automatic updates: update windows and rollback holds.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Decides, while WordPress runs its automatic updates, whether one may go
 * ahead now:
 *
 * - Update window (set in MyKavo, Agency plan): outside the chosen days and
 *   hours, automatic plugin, theme and core updates wait for the next window.
 *   MyKavo decides whether the window applies; this site only reads it.
 * - Rollback hold: after a plugin was rolled back from a version, WordPress
 *   does not automatically update it straight back to that same version.
 *
 * Only ever loaded from the auto_update_* filters (which run while WordPress
 * updates in the background) and on MyKavo screens. Inside the window, and
 * for anything not held, the value WordPress passed in is returned unchanged.
 */
final class MyKavo_Auto_Updates {

	const HOLDS     = 'mykavo_rollback_holds';
	const LAST      = 'mykavo_remote_settings';
	const CACHE     = 'mykavo_cache_settings';
	const CACHE_TTL = 600; // Ten minutes.

	/**
	 * Filter for auto_update_plugin, auto_update_theme and auto_update_core.
	 *
	 * @param bool|null $update Whether WordPress would update this item. Null
	 *                          when a screen only asks whether it is forced.
	 * @param object    $item   The update offer.
	 * @param string    $type   plugin, theme or core.
	 * @return bool|null
	 */
	public static function filter( $update, $item, $type ) {
		// Null: a screen asking whether auto-updates are forced. False:
		// nothing would update anyway. Neither is ours to change.
		if ( null === $update || ! $update ) {
			return $update;
		}
		if ( 'plugin' === $type && is_object( $item ) && self::is_held( $item ) ) {
			return false;
		}
		if ( ! self::window_allows( time() ) ) {
			return false;
		}
		return $update;
	}

	/* ------------------------------------------------------ update window -- */

	/**
	 * The update window setting from MyKavo (GET /settings), cached for ten
	 * minutes. While MyKavo cannot be reached, the last answer keeps
	 * applying, so a window is not dropped because of a network blip.
	 *
	 * @param bool $fresh Skip the cache.
	 * @return array{updateWindow:array|null,allowed:array{updateWindows:bool}}
	 */
	public static function settings( $fresh = false ) {
		$cached = get_transient( self::CACHE );
		if ( ! $fresh && is_array( $cached ) ) {
			return $cached;
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		if ( ! MyKavo_Connection::is_connected() ) {
			return self::normalize( array() );
		}

		$result = MyKavo_API::request( 'GET', '/settings', null, 6 );
		if ( is_wp_error( $result ) ) {
			$data   = $result->get_error_data();
			$status = is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 0;
			// 404: a MyKavo without settings yet, so no window. Anything else
			// (unreachable, 5xx): keep using what MyKavo said last.
			$last     = get_option( self::LAST, null );
			$settings = ( 404 !== $status && is_array( $last ) ) ? $last : self::normalize( array() );
		} else {
			$settings = self::normalize( $result );
			self::remember( $settings );
		}
		// Cached either way, so a batch of automatic updates asks once.
		set_transient( self::CACHE, $settings, self::CACHE_TTL );
		return $settings;
	}

	/**
	 * Save a new window through PUT /settings.
	 *
	 * @param array|null $window Window, or null to remove it.
	 * @return array|WP_Error Settings as MyKavo now has them.
	 */
	public static function save( $window ) {
		$result = MyKavo_API::request( 'PUT', '/settings', array( 'updateWindow' => null === $window ? null : self::normalize_window( $window ) ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		delete_transient( self::CACHE );
		$settings = self::settings( true );
		return $settings;
	}

	/**
	 * Whether automatic updates may run at a given moment.
	 *
	 * @param int $now Unix time.
	 * @return bool
	 */
	public static function window_allows( $now ) {
		$settings = self::settings();
		if ( empty( $settings['allowed']['updateWindows'] ) || empty( $settings['updateWindow'] ) || empty( $settings['updateWindow']['enabled'] ) ) {
			return true;
		}
		return self::in_window( $settings['updateWindow'], $now );
	}

	/**
	 * Whether a moment falls inside a window. An end hour at or before the
	 * start hour means the window runs past midnight into the next day.
	 *
	 * @param array $window Normalized window.
	 * @param int   $now    Unix time.
	 * @return bool
	 */
	public static function in_window( array $window, $now ) {
		$days = isset( $window['days'] ) ? (array) $window['days'] : array();
		if ( ! $days ) {
			// No days chosen is not a choice to never update: do not hold updates.
			return true;
		}
		try {
			$zone = new DateTimeZone( (string) $window['timezone'] );
		} catch ( Exception $e ) {
			$zone = new DateTimeZone( 'UTC' );
		}
		$at    = ( new DateTimeImmutable( '@' . (int) $now ) )->setTimezone( $zone );
		$day   = (int) $at->format( 'w' );
		$hour  = (int) $at->format( 'G' );
		$start = (int) $window['startHour'];
		$end   = (int) $window['endHour'];

		if ( $start < $end ) {
			return in_array( $day, $days, true ) && $hour >= $start && $hour < $end;
		}
		$yesterday = ( $day + 6 ) % 7;
		return ( in_array( $day, $days, true ) && $hour >= $start ) || ( in_array( $yesterday, $days, true ) && $hour < $end );
	}

	/**
	 * A settings response in a known shape.
	 *
	 * @param mixed $raw GET /settings response.
	 * @return array{updateWindow:array|null,allowed:array{updateWindows:bool}}
	 */
	public static function normalize( $raw ) {
		$raw    = is_array( $raw ) ? $raw : array();
		$window = isset( $raw['updateWindow'] ) && is_array( $raw['updateWindow'] ) ? self::normalize_window( $raw['updateWindow'] ) : null;
		return array(
			'updateWindow' => $window,
			'allowed'      => array(
				'updateWindows' => isset( $raw['allowed']['updateWindows'] ) && true === $raw['allowed']['updateWindows'],
			),
		);
	}

	/**
	 * One window in a known shape: days 0 (Sunday) to 6, hours 0 to 24, an
	 * IANA time zone.
	 *
	 * @param array $raw Window.
	 * @return array{enabled:bool,days:int[],startHour:int,endHour:int,timezone:string}
	 */
	public static function normalize_window( array $raw ) {
		$days = array();
		foreach ( isset( $raw['days'] ) ? (array) $raw['days'] : array() as $day ) {
			if ( is_numeric( $day ) && (int) $day >= 0 && (int) $day <= 6 ) {
				$days[] = (int) $day;
			}
		}
		$days = array_values( array_unique( $days ) );
		sort( $days );
		$start = isset( $raw['startHour'] ) && is_numeric( $raw['startHour'] ) ? (int) $raw['startHour'] : 2;
		$end   = isset( $raw['endHour'] ) && is_numeric( $raw['endHour'] ) ? (int) $raw['endHour'] : 5;
		$zone  = isset( $raw['timezone'] ) && is_string( $raw['timezone'] ) ? $raw['timezone'] : '';
		return array(
			'enabled'   => ! empty( $raw['enabled'] ),
			'days'      => $days,
			'startHour' => max( 0, min( 23, $start ) ),
			'endHour'   => max( 1, min( 24, $end ) ),
			'timezone'  => self::is_timezone( $zone ) ? $zone : 'UTC',
		);
	}

	/**
	 * Whether a string is an IANA time zone name.
	 *
	 * @param string $zone Candidate.
	 * @return bool
	 */
	public static function is_timezone( $zone ) {
		return is_string( $zone ) && '' !== $zone && in_array( $zone, timezone_identifiers_list(), true );
	}

	/**
	 * This site's own time zone when it is a named zone, else UTC (a manual
	 * offset such as UTC+2 is not one).
	 *
	 * @return string
	 */
	public static function site_timezone() {
		$zone = (string) get_option( 'timezone_string', '' );
		return self::is_timezone( $zone ) ? $zone : 'UTC';
	}

	/**
	 * Keep the last settings MyKavo sent (never autoloaded).
	 *
	 * @param array $settings Normalized settings.
	 * @return void
	 */
	private static function remember( array $settings ) {
		if ( false === get_option( self::LAST, false ) ) {
			add_option( self::LAST, $settings, '', false );
		} elseif ( get_option( self::LAST ) !== $settings ) {
			update_option( self::LAST, $settings, false );
		}
	}

	/* ------------------------------------------------------ rollback hold -- */

	/**
	 * After rolling a plugin back from a version, do not let WordPress
	 * automatically update it straight back to that version.
	 *
	 * @param string $file    Plugin basename.
	 * @param string $version The version rolled back from.
	 * @return void
	 */
	public static function hold( $file, $version ) {
		$holds          = self::holds();
		$holds[ $file ] = (string) $version;
		if ( false === get_option( self::HOLDS, false ) ) {
			add_option( self::HOLDS, $holds, '', false );
		} else {
			update_option( self::HOLDS, $holds, false );
		}
	}

	/**
	 * Lift the hold on a plugin (it was updated on purpose).
	 *
	 * @param string $file Plugin basename.
	 * @return void
	 */
	public static function release( $file ) {
		$holds = self::holds();
		if ( isset( $holds[ $file ] ) ) {
			unset( $holds[ $file ] );
			update_option( self::HOLDS, $holds, false );
		}
	}

	/**
	 * Plugin basename => version it may not auto-update to.
	 *
	 * @return array<string,string>
	 */
	public static function holds() {
		$holds = get_option( self::HOLDS, array() );
		return is_array( $holds ) ? $holds : array();
	}

	/**
	 * Whether an automatic plugin update offer is held.
	 *
	 * @param object $item Update offer (plugin, new_version).
	 * @return bool
	 */
	private static function is_held( $item ) {
		if ( empty( $item->plugin ) || ! isset( $item->new_version ) ) {
			return false;
		}
		$holds = self::holds();
		return isset( $holds[ $item->plugin ] ) && (string) $item->new_version === $holds[ $item->plugin ];
	}
}
