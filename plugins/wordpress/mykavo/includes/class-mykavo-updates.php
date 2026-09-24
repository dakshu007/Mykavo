<?php
/**
 * Safe Updates: tell MyKavo whenever WordPress updates something.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Records every plugin, theme, core and translation update - including the
 * automatic ones WordPress runs on its own - plus plugins being activated or
 * deactivated and the theme being switched, and asks MyKavo to check the
 * site right afterwards, so the owner learns whether it broke anything and
 * exactly which change it was.
 *
 * Runs only inside an update. Versions are read BEFORE the files are
 * replaced (upgrader_pre_install), a whole batch is reported once at the end
 * of the request, and the local log is one non-autoloaded option.
 */
final class MyKavo_Updates {

	const LOG      = 'mykavo_updates';
	const SETTINGS = 'mykavo_settings';
	const MAX_LOG  = 30;
	const TIMEOUT  = 6;

	/**
	 * Version of each package before this request updated it.
	 *
	 * @var array<string,string>
	 */
	private static $before = array();

	/**
	 * Items updated during this request, keyed to de-duplicate.
	 *
	 * @var array<string,array>
	 */
	private static $pending = array();

	/**
	 * Whether the shutdown report is already scheduled.
	 *
	 * @var bool
	 */
	private static $scheduled = false;

	/**
	 * Whether update checks are switched on (default: yes).
	 *
	 * @return bool
	 */
	public static function enabled() {
		$settings = get_option( self::SETTINGS, array() );
		return ! is_array( $settings ) || ! isset( $settings['check_updates'] ) || (bool) $settings['check_updates'];
	}

	/**
	 * Switch update checks on or off.
	 *
	 * @param bool $enabled New state.
	 * @return void
	 */
	public static function set_enabled( $enabled ) {
		$settings = get_option( self::SETTINGS, array() );
		$settings = is_array( $settings ) ? $settings : array();

		$settings['check_updates'] = (bool) $enabled;
		if ( false === get_option( self::SETTINGS, false ) ) {
			add_option( self::SETTINGS, $settings, '', false );
		} else {
			update_option( self::SETTINGS, $settings, false );
		}
	}

	/**
	 * The update log, newest first.
	 *
	 * @return array
	 */
	public static function log() {
		$log = get_option( self::LOG, array() );
		return is_array( $log ) ? array_values( $log ) : array();
	}

	/**
	 * Record final verdicts from MyKavo's scan list into the local log, so an
	 * update keeps its "nothing changed" / "3 changes" long after the scan
	 * has scrolled out of the recent list.
	 *
	 * @param array $scans Scans from /api/wp/v1/scans.
	 * @return void
	 */
	public static function absorb_results( array $scans ) {
		$by_id = array();
		foreach ( $scans as $scan ) {
			if ( is_array( $scan ) && ! empty( $scan['id'] ) ) {
				$by_id[ (string) $scan['id'] ] = $scan;
			}
		}
		$log     = self::log();
		$changed = false;
		foreach ( $log as $i => $entry ) {
			if ( empty( $entry['scan_id'] ) || ! empty( $entry['result'] ) || ! isset( $by_id[ $entry['scan_id'] ] ) ) {
				continue;
			}
			$scan = $by_id[ $entry['scan_id'] ];
			if ( ! in_array( $scan['status'], array( 'COMPLETED', 'PARTIAL', 'FAILED' ), true ) ) {
				continue;
			}
			$log[ $i ]['result'] = array(
				'status'   => sanitize_key( (string) $scan['status'] ),
				'changes'  => isset( $scan['changesDetected'] ) ? (int) $scan['changesDetected'] : 0,
				'severity' => isset( $scan['highestSeverity'] ) ? sanitize_key( (string) $scan['highestSeverity'] ) : '',
			);
			$changed             = true;
		}
		if ( $changed ) {
			update_option( self::LOG, $log, false );
		}
	}

	/**
	 * What MyKavo found the last time a given package's update was checked,
	 * from the log. Updates that were not checked are skipped.
	 *
	 * @param string $type Package type (plugin, theme).
	 * @param string $name Display name as WordPress shows it.
	 * @return array|null { from, to, at, changes|null, severity }
	 */
	public static function last_update_of( $type, $name ) {
		foreach ( self::log() as $entry ) {
			if ( empty( $entry['result'] ) ) {
				continue;
			}
			foreach ( isset( $entry['items'] ) ? (array) $entry['items'] : array() as $item ) {
				$is_update = empty( $item['action'] ) || 'update' === $item['action'];
				if ( $is_update && isset( $item['type'], $item['name'] ) && $type === $item['type'] && $name === $item['name'] ) {
					return array(
						'from'     => isset( $item['from'] ) ? $item['from'] : '',
						'to'       => isset( $item['to'] ) ? $item['to'] : '',
						'at'       => isset( $entry['at'] ) ? (int) $entry['at'] : 0,
						'changes'  => isset( $entry['result']['changes'] ) ? (int) $entry['result']['changes'] : null,
						'severity' => isset( $entry['result']['severity'] ) ? (string) $entry['result']['severity'] : '',
					);
				}
			}
		}
		return null;
	}

	/* ---------------------------------------------------------- the hooks -- */

	/**
	 * Filter: note a package's version before WordPress replaces it. Returns
	 * the response untouched - this must never change how an update runs.
	 *
	 * @param mixed $response   Filter value, passed through.
	 * @param array $hook_extra Which package is being installed.
	 * @return mixed
	 */
	public static function remember_before( $response, $hook_extra ) {
		if ( ! is_array( $hook_extra ) ) {
			return $response;
		}
		if ( ! empty( $hook_extra['plugin'] ) && is_string( $hook_extra['plugin'] ) ) {
			$data = self::plugin_data( $hook_extra['plugin'] );
			if ( $data ) {
				self::$before[ 'plugin:' . $hook_extra['plugin'] ] = $data['Version'];
			}
		}
		if ( ! empty( $hook_extra['theme'] ) && is_string( $hook_extra['theme'] ) ) {
			$theme = wp_get_theme( $hook_extra['theme'] );
			if ( $theme->exists() ) {
				self::$before[ 'theme:' . $hook_extra['theme'] ] = (string) $theme->get( 'Version' );
			}
		}
		return $response;
	}

	/**
	 * Action: a plugin was activated or deactivated. Switching plugins on and
	 * off breaks sites as often as updating them (caching, SEO and page
	 * builder plugins especially).
	 *
	 * @param string $file   Plugin basename.
	 * @param string $action 'activate' or 'deactivate'.
	 * @return void
	 */
	public static function plugin_toggled( $file, $action ) {
		// Our own activation has nothing to check against yet, and our own
		// deactivation is the owner turning MyKavo off.
		if ( ! is_string( $file ) || plugin_basename( MYKAVO_FILE ) === $file ) {
			return;
		}
		$data = self::plugin_data( $file );
		if ( $data ) {
			self::add( 'plugin', $action . ':plugin:' . $file, $data['Name'], $data['Version'], $action );
			self::schedule();
		}
	}

	/**
	 * Action: the active theme was switched.
	 *
	 * @param string   $name  New theme name.
	 * @param WP_Theme $theme New theme.
	 * @return void
	 */
	public static function theme_switched( $name, $theme = null ) {
		$version = ( $theme instanceof WP_Theme ) ? (string) $theme->get( 'Version' ) : '';
		self::add( 'theme', 'switch:theme', (string) $name, $version, 'switch' );
		self::schedule();
	}

	/**
	 * Action: an update finished. Collect what changed; report at shutdown.
	 *
	 * @param mixed $upgrader Upgrader instance (unused).
	 * @param array $options  What was updated.
	 * @return void
	 */
	public static function collect( $upgrader, $options ) {
		unset( $upgrader );
		if ( ! is_array( $options ) || ! isset( $options['action'], $options['type'] ) || 'update' !== $options['action'] ) {
			return;
		}

		switch ( $options['type'] ) {
			case 'plugin':
				$plugins = isset( $options['plugins'] ) ? (array) $options['plugins'] : ( isset( $options['plugin'] ) ? array( $options['plugin'] ) : array() );
				foreach ( $plugins as $file ) {
					$data = is_string( $file ) ? self::plugin_data( $file ) : null;
					if ( $data ) {
						self::add( 'plugin', 'plugin:' . $file, $data['Name'], $data['Version'] );
					}
				}
				break;

			case 'theme':
				$themes = isset( $options['themes'] ) ? (array) $options['themes'] : ( isset( $options['theme'] ) ? array( $options['theme'] ) : array() );
				foreach ( $themes as $slug ) {
					$theme = is_string( $slug ) ? wp_get_theme( $slug ) : null;
					if ( $theme && $theme->exists() ) {
						self::add( 'theme', 'theme:' . $slug, (string) $theme->get( 'Name' ), (string) $theme->get( 'Version' ) );
					}
				}
				break;

			case 'core':
				// This request loaded the old version.php, so the global still
				// holds the version being replaced; the file now holds the new one.
				$old                       = isset( $GLOBALS['wp_version'] ) ? (string) $GLOBALS['wp_version'] : '';
				self::$before['core:core'] = $old;
				self::add( 'core', 'core:core', 'WordPress', self::installed_core_version() );
				break;

			case 'translation':
				$names = array();
				foreach ( isset( $options['translations'] ) ? (array) $options['translations'] : array() as $translation ) {
					if ( is_array( $translation ) && ! empty( $translation['slug'] ) ) {
						$names[] = (string) $translation['slug'];
					}
				}
				self::add( 'translation', 'translation:' . implode( ',', $names ), $names ? implode( ', ', array_slice( $names, 0, 3 ) ) : 'WordPress', '' );
				break;
		}

		self::schedule();
	}

	/**
	 * Report once, at the end of the request, however many packages a bulk
	 * or automatic update touched.
	 *
	 * @return void
	 */
	private static function schedule() {
		if ( self::$pending && ! self::$scheduled ) {
			self::$scheduled = true;
			add_action( 'shutdown', array( __CLASS__, 'report' ) );
		}
	}

	/**
	 * Shutdown: write the log entry and ask MyKavo to check the site.
	 *
	 * @return void
	 */
	public static function report() {
		if ( ! self::$pending ) {
			return;
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		if ( ! MyKavo_Connection::is_connected() ) {
			return;
		}

		$items   = array_values( self::$pending );
		$trigger = ( wp_doing_cron() || doing_action( 'wp_maybe_auto_update' ) ) ? 'auto' : 'manual';
		$entry   = array(
			'id'      => wp_generate_password( 12, false ),
			'at'      => time(),
			'trigger' => $trigger,
			'items'   => $items,
			'note'    => '',
			'scan_id' => '',
			'reason'  => '',
			'message' => '',
		);

		if ( ! self::enabled() ) {
			$entry['reason'] = 'OFF';
		} else {
			$result = MyKavo_API::request(
				'POST',
				'/updates',
				array(
					'trigger' => $trigger,
					'items'   => array_map(
						static function ( $item ) {
							return array(
								'type'   => $item['type'],
								'name'   => $item['name'],
								'from'   => '' !== $item['from'] ? $item['from'] : null,
								'to'     => '' !== $item['to'] ? $item['to'] : null,
								'action' => $item['action'],
							);
						},
						$items
					),
				),
				self::TIMEOUT
			);
			if ( is_wp_error( $result ) ) {
				$entry['reason']  = 'UNREACHABLE';
				$entry['message'] = $result->get_error_message();
			} else {
				$entry['note']    = isset( $result['note'] ) ? sanitize_text_field( (string) $result['note'] ) : '';
				$entry['scan_id'] = isset( $result['scan']['id'] ) ? sanitize_text_field( (string) $result['scan']['id'] ) : '';
				$entry['reason']  = isset( $result['reason'] ) ? sanitize_key( (string) $result['reason'] ) : '';
				$entry['message'] = isset( $result['message'] ) ? sanitize_text_field( (string) $result['message'] ) : '';
				MyKavo_Connection::flush_cache();
			}
		}

		$log = self::log();
		array_unshift( $log, $entry );
		$log = array_slice( $log, 0, self::MAX_LOG );
		if ( false === get_option( self::LOG, false ) ) {
			add_option( self::LOG, $log, '', false );
		} else {
			update_option( self::LOG, $log, false );
		}
		self::$pending = array();
	}

	/* ------------------------------------------------------------- helpers -- */

	/**
	 * Queue one updated package.
	 *
	 * @param string $type Package type.
	 * @param string $key  De-duplication key (also the "before" lookup).
	 * @param string $name Display name.
	 * @param string $to     New version, or ''.
	 * @param string $action update, activate, deactivate or switch.
	 * @return void
	 */
	private static function add( $type, $key, $name, $to, $action = 'update' ) {
		$from = isset( self::$before[ $key ] ) ? (string) self::$before[ $key ] : '';
		// Re-installing the same version is not an update worth a check.
		if ( 'update' === $action && '' !== $from && $from === $to && 'translation' !== $type ) {
			return;
		}
		self::$pending[ $key ] = array(
			'type'   => $type,
			'name'   => substr( wp_strip_all_tags( $name ), 0, 100 ),
			'from'   => substr( $from, 0, 40 ),
			'to'     => substr( (string) $to, 0, 40 ),
			'action' => $action,
		);
	}

	/**
	 * A plugin's header data, without translating it or touching the cache.
	 *
	 * @param string $file Plugin basename.
	 * @return array|null
	 */
	private static function plugin_data( $file ) {
		$path = WP_PLUGIN_DIR . '/' . $file;
		if ( ! is_readable( $path ) ) {
			return null;
		}
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$data = get_plugin_data( $path, false, false );
		return ! empty( $data['Name'] ) ? $data : null;
	}

	/**
	 * The WordPress version now on disk, read from version.php.
	 *
	 * @return string
	 */
	private static function installed_core_version() {
		$file = ABSPATH . WPINC . '/version.php';
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local core file.
		$source = is_readable( $file ) ? (string) file_get_contents( $file ) : '';
		return preg_match( '/\$wp_version\s*=\s*\'([^\']+)\'/', $source, $m ) ? $m[1] : '';
	}
}
