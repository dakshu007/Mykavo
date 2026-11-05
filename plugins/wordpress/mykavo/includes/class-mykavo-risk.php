<?php
/**
 * Update risk: how a plugin update went on other MyKavo sites.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * On the Plugins screen, next to "Update now", a line like "Updated on 214
 * MyKavo sites, 3% saw changes". MyKavo builds that from the anonymous
 * results of Safe Updates across every site that runs it.
 *
 * Asked only when the Plugins screen opens and a plugin has an update
 * waiting, and kept for twelve hours. On Pro and Agency, an automatic update
 * MyKavo marks risky is held back for 48 hours (see MyKavo_Auto_Updates).
 */
final class MyKavo_Risk {

	const CACHE     = 'mykavo_cache_update_risk';
	const CACHE_TTL = 43200; // Twelve hours.
	const HOLD_FOR  = 172800; // 48 hours.

	/**
	 * Action: load-plugins.php. Fetch (or reuse) the risk for waiting updates.
	 *
	 * @return void
	 */
	public static function prefetch() {
		if ( ! current_user_can( 'update_plugins' ) || ! MyKavo_Connection::is_connected() ) {
			return;
		}
		self::get();
	}

	/**
	 * Risk per plugin file, from cache or MyKavo.
	 *
	 * @return array<string,array{sites:int,changedPercent:int,risky:bool}>
	 */
	public static function get() {
		$wanted = self::waiting();
		if ( ! $wanted ) {
			return array();
		}
		$cached = get_transient( self::CACHE );
		$sig    = md5( wp_json_encode( $wanted ) );
		if ( is_array( $cached ) && isset( $cached['sig'], $cached['risk'] ) && $sig === $cached['sig'] ) {
			return $cached['risk'];
		}
		$result = MyKavo_API::request(
			'POST',
			'/update-risk',
			array( 'plugins' => array_values( $wanted ) ),
			5
		);
		$risk = array();
		if ( ! is_wp_error( $result ) && isset( $result['plugins'] ) && is_array( $result['plugins'] ) ) {
			$by_slug = array();
			foreach ( $wanted as $file => $row ) {
				$by_slug[ $row['slug'] . '@' . $row['to'] ] = $file;
			}
			foreach ( $result['plugins'] as $row ) {
				if ( ! is_array( $row ) || ! isset( $row['slug'], $row['to'] ) ) {
					continue;
				}
				$key = sanitize_key( (string) $row['slug'] ) . '@' . (string) $row['to'];
				if ( isset( $by_slug[ $key ] ) ) {
					$risk[ $by_slug[ $key ] ] = array(
						'to'             => (string) $row['to'],
						'sites'          => isset( $row['sites'] ) ? max( 0, (int) $row['sites'] ) : 0,
						'changedPercent' => isset( $row['changedPercent'] ) ? max( 0, min( 100, (int) $row['changedPercent'] ) ) : 0,
						'risky'          => ! empty( $row['risky'] ),
					);
				}
			}
		}
		// Cached even when empty or failed, so the Plugins screen asks at most twice a day.
		set_transient(
			self::CACHE,
			array(
				'sig'  => $sig,
				'risk' => $risk,
			),
			is_wp_error( $result ) ? HOUR_IN_SECONDS : self::CACHE_TTL
		);
		self::remember_risky( $risk );
		return $risk;
	}

	/**
	 * The line under a plugin with an update waiting.
	 *
	 * @param string $file Plugin basename.
	 * @return string Plain text, or ''.
	 */
	public static function line( $file ) {
		$cached = get_transient( self::CACHE );
		$risk   = is_array( $cached ) && isset( $cached['risk'][ $file ] ) ? $cached['risk'][ $file ] : null;
		if ( ! $risk || $risk['sites'] < 5 ) {
			return '';
		}
		return sprintf(
			/* translators: 1: number of sites, 2: percentage. */
			_n( 'MyKavo: updated on %1$d MyKavo site, %2$d%% saw changes.', 'MyKavo: updated on %1$d MyKavo sites, %2$d%% saw changes.', $risk['sites'], 'mykavo' ),
			$risk['sites'],
			$risk['changedPercent']
		);
	}

	/**
	 * Whether MyKavo marked a plugin's offered version risky.
	 *
	 * @param string $file Plugin basename.
	 * @return array|null
	 */
	public static function risk_for( $file ) {
		$cached = get_transient( self::CACHE );
		return is_array( $cached ) && isset( $cached['risk'][ $file ] ) ? $cached['risk'][ $file ] : null;
	}

	/**
	 * Plugins with an update waiting: file => { slug, from, to }.
	 *
	 * @return array
	 */
	private static function waiting() {
		$updates = get_site_transient( 'update_plugins' );
		if ( ! is_object( $updates ) || empty( $updates->response ) || ! is_array( $updates->response ) ) {
			return array();
		}
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$plugins = get_plugins();
		$out     = array();
		foreach ( $updates->response as $file => $offer ) {
			$offer = (object) $offer;
			$slug  = dirname( (string) $file );
			if ( '.' === $slug || ! isset( $plugins[ $file ] ) || empty( $offer->new_version ) ) {
				continue;
			}
			$out[ $file ] = array(
				'slug' => sanitize_key( $slug ),
				'from' => (string) $plugins[ $file ]['Version'],
				'to'   => (string) $offer->new_version,
			);
			if ( count( $out ) >= 100 ) {
				break;
			}
		}
		ksort( $out );
		return $out;
	}

	/**
	 * Pro and Agency: hold risky versions back from automatic updates for 48
	 * hours (MyKavo_Auto_Updates applies the hold).
	 *
	 * @param array $risk Risk per plugin file.
	 * @return void
	 */
	private static function remember_risky( array $risk ) {
		if ( ! MyKavo_API::has_feature( 'riskHold' ) ) {
			return;
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
		foreach ( $risk as $file => $row ) {
			if ( $row['risky'] ) {
				MyKavo_Auto_Updates::hold( $file, $row['to'], time() + self::HOLD_FOR );
			}
		}
	}
}
