<?php
/**
 * Rollback: put a plugin back to the version it had before an update.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Two ways to undo a plugin update that broke something:
 *
 * - One click (every plan): on the update history, "Roll back to 8.1.0"
 *   reinstalls the previous version from WordPress.org.
 * - Automatically (plans whose MyKavo service includes it): after an update,
 *   WP-Cron asks MyKavo every five minutes, for up to 40 minutes, how the
 *   check of that update went. When MyKavo recommends a rollback (it found a
 *   critical change), the plugins that batch updated are rolled back.
 *   MyKavo makes the decision; this site carries it out.
 *
 * Plugins hosted on WordPress.org are reinstalled from there. Since 1.3.1
 * every plugin and theme update also leaves a snapshot (a zip of the folder
 * as it was, see MyKavo_Snapshots), so premium plugins and themes can be
 * rolled back too, for seven days. MyKavo never rolls itself back, and a
 * rollback is never rolled back automatically.
 * Every rollback is reported to MyKavo, so it checks the site again, and
 * written to the local update log.
 */
final class MyKavo_Rollback {

	const CRON_HOOK = 'mykavo_rollback_watch';
	const POLL      = 300;  // Ask MyKavo every five minutes...
	const WATCH_FOR = 2400; // ...for up to 40 minutes after the update.
	const LOCK      = 'mykavo_rollback_lock';

	/* ------------------------------------------------------- eligibility -- */

	/**
	 * Why a log item cannot be rolled back, or '' when it can.
	 *
	 * @param array $item     Log item.
	 * @param bool  $for_user Also require the current user to be allowed to update plugins.
	 * @return string
	 */
	public static function blocker( array $item, $for_user = true ) {
		if ( isset( $item['type'] ) && 'theme' === $item['type'] ) {
			return self::theme_blocker( $item, $for_user );
		}
		if ( ! isset( $item['type'] ) || 'plugin' !== $item['type'] ) {
			return 'type';
		}
		if ( ! empty( $item['action'] ) && 'update' !== $item['action'] ) {
			return 'action';
		}
		$from = isset( $item['from'] ) ? (string) $item['from'] : '';
		if ( '' === $from || ! self::is_version( $from ) ) {
			return 'from';
		}
		$file = self::file_for( $item );
		if ( '' === $file ) {
			return 'missing';
		}
		if ( plugin_basename( MYKAVO_FILE ) === $file ) {
			return 'self';
		}
		if ( '' === self::slug_of( $file ) ) {
			return 'single-file';
		}
		$data      = MyKavo_Updates::plugin_data( $file );
		$installed = $data ? (string) $data['Version'] : '';
		if ( '' === $installed || $installed === $from || ( isset( $item['to'] ) && '' !== $item['to'] && $installed !== $item['to'] ) ) {
			// Already rolled back, or updated again since: this entry is history.
			return 'version';
		}
		if ( ! self::is_wporg( $item, $file ) && ! self::snapshot_for( $item ) ) {
			return 'not-wporg';
		}
		if ( ! wp_is_file_mod_allowed( 'mykavo_rollback' ) ) {
			return 'file-mods';
		}
		if ( $for_user && ! current_user_can( 'update_plugins' ) ) {
			return 'capability';
		}
		return '';
	}

	/**
	 * Why a theme update cannot be rolled back, or ''. Themes roll back from
	 * their snapshot only.
	 *
	 * @param array $item     Log item.
	 * @param bool  $for_user Also require the current user to be allowed to update themes.
	 * @return string
	 */
	private static function theme_blocker( array $item, $for_user ) {
		if ( ! empty( $item['action'] ) && 'update' !== $item['action'] ) {
			return 'action';
		}
		$from = isset( $item['from'] ) ? (string) $item['from'] : '';
		$slug = isset( $item['file'] ) ? (string) $item['file'] : '';
		if ( '' === $from || ! self::is_version( $from ) ) {
			return 'from';
		}
		if ( '' === $slug ) {
			return 'missing';
		}
		$theme = wp_get_theme( $slug );
		if ( ! $theme->exists() ) {
			return 'missing';
		}
		$installed = (string) $theme->get( 'Version' );
		if ( $installed === $from || ( isset( $item['to'] ) && '' !== $item['to'] && $installed !== $item['to'] ) ) {
			return 'version';
		}
		if ( ! self::snapshot_for( $item ) ) {
			return 'no-snapshot';
		}
		if ( ! wp_is_file_mod_allowed( 'mykavo_rollback' ) ) {
			return 'file-mods';
		}
		if ( $for_user && ! current_user_can( 'update_themes' ) ) {
			return 'capability';
		}
		return '';
	}

	/**
	 * The snapshot taken just before this item's update, if it is still kept.
	 *
	 * @param array $item Log item.
	 * @return array|null
	 */
	public static function snapshot_for( array $item ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-snapshots.php';
		$type = isset( $item['type'] ) ? (string) $item['type'] : '';
		$from = isset( $item['from'] ) ? (string) $item['from'] : '';
		if ( 'theme' === $type ) {
			$slug = isset( $item['file'] ) ? (string) $item['file'] : '';
		} else {
			$slug = self::slug_of( self::file_for( $item ) );
		}
		if ( '' === $slug || '' === $from ) {
			return null;
		}
		return MyKavo_Snapshots::find( $type, $slug, $from );
	}

	/**
	 * The update log for the admin screen, with which items can be rolled
	 * back right now.
	 *
	 * @param array $log Update log.
	 * @return array
	 */
	public static function decorate( array $log ) {
		$seen = array();
		foreach ( $log as $i => $entry ) {
			foreach ( isset( $entry['items'] ) ? (array) $entry['items'] : array() as $j => $item ) {
				if ( is_array( $item ) && isset( $item['type'] ) && 'theme' === $item['type'] && ( empty( $item['action'] ) || 'update' === $item['action'] ) ) {
					$slug = isset( $item['file'] ) ? (string) $item['file'] : '';

					$log[ $i ]['items'][ $j ]['canRollback'] = '' !== $slug && ! isset( $seen[ 'theme:' . $slug ] ) && '' === self::blocker( $item );
					$log[ $i ]['items'][ $j ]['fromSnapshot'] = true;
					if ( '' !== $slug ) {
						$seen[ 'theme:' . $slug ] = true;
					}
					continue;
				}
				if ( is_array( $item ) && isset( $item['type'] ) && 'plugin' === $item['type'] && ( empty( $item['action'] ) || 'update' === $item['action'] ) ) {
					$file = self::file_for( $item );

					$log[ $i ]['items'][ $j ]['file'] = $file;
					// Only a plugin's latest update can be undone; older ones are history.
					$log[ $i ]['items'][ $j ]['canRollback'] = '' !== $file && ! isset( $seen[ $file ] ) && '' === self::blocker( $item );
					$log[ $i ]['items'][ $j ]['fromSnapshot'] = '' !== $file && ! self::is_wporg( $item, $file );
					if ( '' !== $file ) {
						$seen[ $file ] = true;
					}
				}
			}
		}
		return $log;
	}

	/**
	 * The plugin file a log item names: stored since 1.3.0, looked up by
	 * name for older entries.
	 *
	 * @param array $item Log item.
	 * @return string Plugin basename, or ''.
	 */
	public static function file_for( array $item ) {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$plugins = get_plugins();
		if ( ! empty( $item['file'] ) && is_string( $item['file'] ) && isset( $plugins[ $item['file'] ] ) ) {
			return $item['file'];
		}
		$name = isset( $item['name'] ) ? (string) $item['name'] : '';
		foreach ( $plugins as $file => $data ) {
			if ( '' !== $name && isset( $data['Name'] ) && $name === $data['Name'] ) {
				return (string) $file;
			}
		}
		return '';
	}

	/**
	 * The WordPress.org slug of a plugin: its folder name.
	 *
	 * @param string $file Plugin basename.
	 * @return string '' for single-file plugins.
	 */
	public static function slug_of( $file ) {
		$dir = dirname( (string) $file );
		return ( '.' !== $dir && preg_match( '/^[a-z0-9][a-z0-9_-]*$/', $dir ) ) ? $dir : '';
	}

	/**
	 * Whether a log item's plugin comes from WordPress.org: noted at update
	 * time (WordPress clears its update data right after an update), or read
	 * from WordPress's update data now. A plugin that only shares a slug with
	 * a WordPress.org plugin never qualifies, so it is never overwritten.
	 *
	 * @param array  $item Log item.
	 * @param string $file Plugin basename.
	 * @return bool
	 */
	public static function is_wporg( array $item, $file ) {
		if ( '' === (string) $file ) {
			return false;
		}
		return ! empty( $item['wporg'] ) || MyKavo_Updates::is_wporg( $file );
	}

	/**
	 * A plain version string (digits, letters, dots, dashes).
	 *
	 * @param string $version Candidate.
	 * @return bool
	 */
	private static function is_version( $version ) {
		return (bool) preg_match( '/^[0-9][0-9A-Za-z._-]{0,39}$/', (string) $version );
	}

	/* ------------------------------------------------------------ manual -- */

	/**
	 * One-click rollback of one plugin from one log entry.
	 *
	 * @param string $entry_id Log entry id.
	 * @param string $file     Plugin basename.
	 * @return array|WP_Error { rolledBack: string[], failed: array }
	 */
	public static function manual( $entry_id, $file ) {
		$entry = MyKavo_Updates::entry( $entry_id );
		if ( ! $entry ) {
			return new WP_Error( 'mykavo_rollback', __( 'That update is no longer in the history.', 'mykavo' ), array( 'status' => 404 ) );
		}
		$target = null;
		foreach ( isset( $entry['items'] ) ? (array) $entry['items'] : array() as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			$is_theme = isset( $item['type'] ) && 'theme' === $item['type'];
			if ( ( $is_theme && isset( $item['file'] ) && $item['file'] === $file ) || ( ! $is_theme && self::file_for( $item ) === $file ) ) {
				$target = $item;
				break;
			}
		}
		if ( null === $target ) {
			return new WP_Error( 'mykavo_rollback', __( 'That plugin or theme is not part of this update.', 'mykavo' ), array( 'status' => 404 ) );
		}
		$blocker = self::blocker( $target );
		if ( '' !== $blocker ) {
			return new WP_Error( 'mykavo_rollback', self::blocker_message( $blocker ), array( 'status' => 409 ) );
		}
		return self::run( $entry, array( $target ), 'manual' );
	}

	/**
	 * Words for a blocker.
	 *
	 * @param string $blocker Code from blocker().
	 * @return string
	 */
	private static function blocker_message( $blocker ) {
		switch ( $blocker ) {
			case 'version':
				return __( 'This plugin has changed version since that update, so this rollback no longer applies.', 'mykavo' );
			case 'not-wporg':
			case 'no-snapshot':
				return __( 'There is no saved copy of the previous version: MyKavo keeps one for seven days after each update.', 'mykavo' );
			case 'single-file':
				return __( 'Plugins made of a single file cannot be rolled back here.', 'mykavo' );
			case 'file-mods':
				return __( 'This site does not allow plugins to be installed or updated from wp-admin (DISALLOW_FILE_MODS).', 'mykavo' );
			case 'capability':
				return __( 'You do not have permission to update plugins and themes on this site.', 'mykavo' );
			case 'self':
				return __( 'MyKavo does not roll itself back.', 'mykavo' );
			default:
				return __( 'This update cannot be rolled back.', 'mykavo' );
		}
	}

	/* --------------------------------------------------------- automatic -- */

	/**
	 * After an update report that started a check, watch the check from
	 * WP-Cron so a broken update can be rolled back without anyone present.
	 *
	 * @param array $entry Log entry just written.
	 * @return void
	 */
	public static function maybe_watch( array $entry ) {
		if ( empty( $entry['scan_id'] ) || empty( $entry['id'] ) || ! empty( $entry['rollback_of'] ) || ! MyKavo_Updates::auto_rollback_enabled() ) {
			return;
		}
		// Known not to be included in this plan: do not ask MyKavo for nothing.
		$features = MyKavo_API::known_features();
		if ( is_array( $features ) && empty( $features['autoRollback'] ) ) {
			return;
		}
		$candidates = 0;
		foreach ( (array) $entry['items'] as $item ) {
			if ( is_array( $item ) && '' === self::blocker( $item, false ) ) {
				++$candidates;
			}
		}
		if ( ! $candidates ) {
			return;
		}
		MyKavo_Updates::update_entry(
			$entry['id'],
			array(
				'watch' => array(
					'state' => 'watching',
					'until' => time() + self::WATCH_FOR,
				),
			)
		);
		wp_schedule_single_event( time() + self::POLL, self::CRON_HOOK, array( (string) $entry['id'] ) );
	}

	/**
	 * WP-Cron: how did MyKavo's check of this update go? Roll back when it
	 * recommends it; ask again in five minutes while the check runs.
	 *
	 * @param string $entry_id Log entry id.
	 * @return void
	 */
	public static function watch( $entry_id ) {
		$entry = MyKavo_Updates::entry( (string) $entry_id );
		if ( ! $entry || empty( $entry['scan_id'] ) || empty( $entry['watch'] ) || 'watching' !== $entry['watch']['state'] || ! empty( $entry['rollback'] ) ) {
			return;
		}
		$until = (int) $entry['watch']['until'];
		if ( ! MyKavo_Connection::is_connected() || ! MyKavo_Updates::auto_rollback_enabled() ) {
			self::finish( $entry, 'off' );
			return;
		}

		$result = MyKavo_API::request( 'GET', '/scans', null, 10 );
		$scan   = null;
		if ( ! is_wp_error( $result ) && isset( $result['scans'] ) && is_array( $result['scans'] ) ) {
			MyKavo_Updates::absorb_results( $result['scans'] );
			foreach ( $result['scans'] as $candidate ) {
				if ( is_array( $candidate ) && isset( $candidate['id'] ) && (string) $candidate['id'] === $entry['scan_id'] ) {
					$scan = $candidate;
					break;
				}
			}
		}

		$status   = $scan && isset( $scan['status'] ) ? (string) $scan['status'] : '';
		$finished = in_array( $status, array( 'COMPLETED', 'PARTIAL', 'FAILED' ), true );
		if ( ! $finished ) {
			if ( time() + self::POLL <= $until ) {
				wp_schedule_single_event( time() + self::POLL, self::CRON_HOOK, array( (string) $entry['id'] ) );
			} else {
				self::finish( $entry, 'timeout' );
			}
			return;
		}

		$advice = isset( $scan['rollback'] ) && is_array( $scan['rollback'] ) ? $scan['rollback'] : array();
		if ( empty( $advice['recommended'] ) || true !== $advice['recommended'] ) {
			self::finish( $entry, 'kept' );
			return;
		}

		$items = array();
		foreach ( (array) $entry['items'] as $item ) {
			if ( is_array( $item ) && '' === self::blocker( $item, false ) ) {
				$items[] = $item;
			}
		}
		$reason = isset( $advice['reason'] ) && is_string( $advice['reason'] ) ? sanitize_text_field( $advice['reason'] ) : '';
		if ( ! $items ) {
			self::finish( $entry, 'nothing', $reason );
			return;
		}
		self::finish( $entry, 'rolling-back', $reason );
		$outcome = self::run( MyKavo_Updates::entry( (string) $entry['id'] ), $items, 'auto' );
		$after   = MyKavo_Updates::entry( (string) $entry['id'] );
		if ( $after ) {
			self::finish( $after, is_wp_error( $outcome ) ? 'failed' : 'rolled-back', $reason );
		}
	}

	/**
	 * Stop watching an entry, noting why.
	 *
	 * @param array  $entry  Log entry.
	 * @param string $state  Outcome.
	 * @param string $reason MyKavo's reason, if any.
	 * @return void
	 */
	private static function finish( array $entry, $state, $reason = '' ) {
		$watch          = isset( $entry['watch'] ) && is_array( $entry['watch'] ) ? $entry['watch'] : array();
		$watch['state'] = $state;
		if ( '' !== $reason ) {
			$watch['reason'] = $reason;
		}
		MyKavo_Updates::update_entry( (string) $entry['id'], array( 'watch' => $watch ) );
	}

	/**
	 * Stop every pending watch (disconnect, deactivation, uninstall).
	 *
	 * @return void
	 */
	public static function unschedule() {
		wp_unschedule_hook( self::CRON_HOOK );
	}

	/* ---------------------------------------------------------------- run -- */

	/**
	 * Roll back the given items of one log entry, report the rollback to
	 * MyKavo and log it.
	 *
	 * @param array  $entry   The update's log entry.
	 * @param array  $items   Its items to roll back (already checked).
	 * @param string $trigger 'manual' or 'auto'.
	 * @return array|WP_Error { rolledBack: string[], failed: array<string,string> }
	 */
	public static function run( array $entry, array $items, $trigger ) {
		if ( ! self::lock() ) {
			return new WP_Error( 'mykavo_rollback_busy', __( 'A rollback is already running on this site. Try again in a minute.', 'mykavo' ), array( 'status' => 409 ) );
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';

		$done   = array();
		$failed = array();
		$logged = array();
		foreach ( $items as $item ) {
			// Checked again: WordPress's update data may say otherwise by now.
			if ( '' !== self::blocker( $item, false ) ) {
				$failed[ (string) $item['name'] ] = __( 'This update cannot be rolled back.', 'mykavo' );
				continue;
			}
			$bad = isset( $item['to'] ) ? (string) $item['to'] : '';
			if ( 'theme' === $item['type'] ) {
				$file   = (string) $item['file'];
				$snap   = self::snapshot_for( $item );
				$result = $snap ? MyKavo_Snapshots::restore( $snap ) : new WP_Error( 'mykavo_rollback', self::blocker_message( 'no-snapshot' ) );
			} else {
				$file   = self::file_for( $item );
				$result = self::install( $file, self::slug_of( $file ), (string) $item['from'], $item );
			}
			if ( is_wp_error( $result ) ) {
				$failed[ (string) $item['name'] ] = $result->get_error_message();
				continue;
			}
			$done[]   = (string) $item['name'];
			$logged[] = MyKavo_Updates::item( $item['type'], (string) $item['name'], $bad, (string) $item['from'], 'rollback', $file );
			if ( '' !== $bad && 'plugin' === $item['type'] ) {
				MyKavo_Auto_Updates::hold( $file, $bad );
			}
		}
		self::unlock();

		MyKavo_Updates::update_entry(
			(string) $entry['id'],
			array(
				'rollback' => array(
					'at'      => time(),
					'trigger' => 'auto' === $trigger ? 'auto' : 'manual',
					'done'    => array_merge( isset( $entry['rollback']['done'] ) ? (array) $entry['rollback']['done'] : array(), $done ),
					'failed'  => $failed,
				),
			)
		);
		if ( $logged ) {
			MyKavo_Updates::record( $logged, $trigger, array( 'rollback_of' => (string) $entry['id'] ) );
		}

		if ( ! $done && $failed ) {
			return new WP_Error( 'mykavo_rollback_failed', (string) reset( $failed ), array( 'status' => 502 ) );
		}
		return array(
			'rolledBack' => $done,
			'failed'     => $failed,
		);
	}

	/**
	 * Put one plugin or theme back to the version before its update, without
	 * logging (Safe Update All logs its whole batch itself).
	 *
	 * @param array $item Log item.
	 * @return true|WP_Error
	 */
	public static function restore_item( array $item ) {
		$blocker = self::blocker( $item, false );
		if ( '' !== $blocker ) {
			return new WP_Error( 'mykavo_rollback', self::blocker_message( $blocker ) );
		}
		if ( 'theme' === $item['type'] ) {
			$snap = self::snapshot_for( $item );
			return $snap ? MyKavo_Snapshots::restore( $snap ) : new WP_Error( 'mykavo_rollback', self::blocker_message( 'no-snapshot' ) );
		}
		$file = self::file_for( $item );
		return self::install( $file, self::slug_of( $file ), (string) $item['from'], $item );
	}

	/**
	 * Reinstall one version of a WordPress.org plugin over the installed one,
	 * keeping it active if it was.
	 *
	 * @param string $file    Plugin basename.
	 * @param string $slug    WordPress.org slug.
	 * @param string $version Version to install.
	 * @param array  $item    The log item (to find its snapshot).
	 * @return true|WP_Error
	 */
	private static function install( $file, $slug, $version, array $item = array() ) {
		if ( '' === $file || '' === $slug || ! self::is_version( $version ) ) {
			return new WP_Error( 'mykavo_rollback', __( 'This update cannot be rolled back.', 'mykavo' ) );
		}
		$snap = $item ? self::snapshot_for( $item ) : null;
		if ( ! self::is_wporg( $item, $file ) ) {
			// Premium and other non-WordPress.org plugins: the snapshot is the only copy.
			return $snap ? self::from_snapshot( $snap, $file, $version ) : new WP_Error( 'mykavo_rollback', self::blocker_message( 'no-snapshot' ) );
		}
		$result = self::from_wporg( $file, $slug, $version );
		if ( is_wp_error( $result ) && $snap ) {
			// WordPress.org no longer offers that version (or cannot be reached).
			return self::from_snapshot( $snap, $file, $version );
		}
		return $result;
	}

	/**
	 * Restore a plugin from its snapshot and check the version is back.
	 *
	 * @param array  $snap    Snapshot record.
	 * @param string $file    Plugin basename.
	 * @param string $version Version expected after the restore.
	 * @return true|WP_Error
	 */
	private static function from_snapshot( array $snap, $file, $version ) {
		$result = MyKavo_Snapshots::restore( $snap, $file );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$data = MyKavo_Updates::plugin_data( $file );
		if ( ! $data || (string) $data['Version'] !== $version ) {
			return new WP_Error( 'mykavo_rollback', __( 'The saved copy was put back, but WordPress does not see it where the plugin was. Check the Plugins screen.', 'mykavo' ) );
		}
		return true;
	}

	/**
	 * Reinstall one version of a WordPress.org plugin.
	 *
	 * @param string $file    Plugin basename.
	 * @param string $slug    WordPress.org slug.
	 * @param string $version Version to install.
	 * @return true|WP_Error
	 */
	private static function from_wporg( $file, $slug, $version ) {
		$url = 'https://downloads.wordpress.org/plugin/' . rawurlencode( $slug ) . '.' . rawurlencode( $version ) . '.zip';

		// Make sure WordPress.org still has that version before touching anything.
		$head = wp_safe_remote_head(
			$url,
			array(
				'timeout'     => 10,
				'redirection' => 3,
			)
		);
		if ( is_wp_error( $head ) || 200 !== (int) wp_remote_retrieve_response_code( $head ) ) {
			return new WP_Error(
				'mykavo_rollback',
				/* translators: 1: version, 2: plugin slug. */
				sprintf( __( 'Version %1$s of %2$s could not be downloaded from WordPress.org, so nothing was changed.', 'mykavo' ), $version, $slug )
			);
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		$was_active = is_plugin_active( $file );
		$network    = is_multisite() && is_plugin_active_for_network( $file );

		$skin     = new WP_Ajax_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result   = $upgrader->install(
			$url,
			array(
				'overwrite_package'  => true,
				'clear_update_cache' => true,
			)
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( ! $result ) {
			$message = $skin->get_error_messages();
			return new WP_Error( 'mykavo_rollback', '' !== $message ? wp_strip_all_tags( $message ) : __( 'WordPress could not install the previous version. Check that it can write to the plugins folder.', 'mykavo' ) );
		}

		wp_clean_plugins_cache( true );
		$data = MyKavo_Updates::plugin_data( $file );
		if ( ! $data || (string) $data['Version'] !== $version ) {
			return new WP_Error( 'mykavo_rollback', __( 'The previous version was installed, but WordPress does not see it where the plugin was. Check the Plugins screen.', 'mykavo' ) );
		}
		if ( $was_active && ! is_plugin_active( $file ) ) {
			activate_plugin( $file, '', $network, true );
		}
		return true;
	}

	/**
	 * One rollback at a time. add_option() only succeeds when the option does
	 * not exist yet, so two requests cannot both get the lock.
	 *
	 * @return bool
	 */
	private static function lock() {
		$held = get_option( self::LOCK, false );
		if ( false !== $held && (int) $held < time() - 10 * MINUTE_IN_SECONDS ) {
			delete_option( self::LOCK ); // A rollback that died half way.
		}
		return add_option( self::LOCK, time(), '', false );
	}

	/**
	 * Release the lock.
	 *
	 * @return void
	 */
	private static function unlock() {
		delete_option( self::LOCK );
	}
}
