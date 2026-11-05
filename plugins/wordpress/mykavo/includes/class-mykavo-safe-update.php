<?php
/**
 * Safe Update All: back up, update every plugin, check each one, keep a verdict.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * One button on the Safe Updates screen that does what a careful person
 * does by hand:
 *
 * 1. Optionally starts a backup in UpdraftPlus first (when it is active).
 * 2. On paid plans, asks MyKavo for a fresh baseline of the site.
 * 3. Updates the plugins one at a time (the screen drives it, one request per
 *    plugin, so no request runs long), with a snapshot before each.
 * 4. After each one, loads the site locally ("did it crash?") and rolls that
 *    plugin straight back if it broke the site.
 * 5. Reports the whole batch to MyKavo once, which checks the site (paid),
 *    and writes one entry to the update history:
 *    "7 updated, 6 verified, 1 rolled back".
 *
 * Steps 1, 3, 4 and the history work on every plan.
 */
final class MyKavo_Safe_Update {

	const OPTION  = 'mykavo_batch';
	const MAX_AGE = 3600; // A batch nobody finished within an hour is stale.

	/**
	 * What the screen needs before starting: plugins with an update waiting,
	 * and which backup plugin is active.
	 *
	 * @return array
	 */
	public static function overview() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$plugins = get_plugins();
		$updates = get_site_transient( 'update_plugins' );
		$self    = plugin_basename( MYKAVO_FILE );
		$list    = array();
		if ( is_object( $updates ) && ! empty( $updates->response ) && is_array( $updates->response ) ) {
			foreach ( $updates->response as $file => $offer ) {
				$offer = (object) $offer;
				if ( $self === $file || ! isset( $plugins[ $file ] ) || empty( $offer->new_version ) || empty( $offer->package ) ) {
					continue;
				}
				$list[] = array(
					'file' => (string) $file,
					'name' => wp_strip_all_tags( (string) $plugins[ $file ]['Name'] ),
					'from' => (string) $plugins[ $file ]['Version'],
					'to'   => (string) $offer->new_version,
				);
			}
		}
		return array(
			'plugins'     => $list,
			'backup'      => self::backup_plugin(),
			'canUpdate'   => current_user_can( 'update_plugins' ) && wp_is_file_mod_allowed( 'mykavo_safe_update' ),
			'batch'       => self::current(),
			'backupFirst' => self::backup_first(),
		);
	}

	/**
	 * The backup plugin found on this site, if any.
	 *
	 * @return array|null { id, name, canStart }
	 */
	public static function backup_plugin() {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		if ( is_plugin_active( 'updraftplus/updraftplus.php' ) && has_action( 'updraft_backupnow_backup_all' ) ) {
			return array(
				'id'       => 'updraftplus',
				'name'     => 'UpdraftPlus',
				'canStart' => true,
			);
		}
		if ( is_plugin_active( 'blogvault-real-time-backup/blogvault.php' ) ) {
			// BlogVault backs up continuously from its own servers; there is
			// nothing to start from here.
			return array(
				'id'       => 'blogvault',
				'name'     => 'BlogVault',
				'canStart' => false,
			);
		}
		return null;
	}

	/**
	 * Whether "Back up first" is ticked (remembered per site).
	 *
	 * @return bool
	 */
	public static function backup_first() {
		$settings = get_option( 'mykavo_settings', array() );
		return is_array( $settings ) && ! empty( $settings['backup_first'] );
	}

	/**
	 * Remember "Back up first".
	 *
	 * @param bool $on New state.
	 * @return void
	 */
	public static function set_backup_first( $on ) {
		$settings                 = get_option( 'mykavo_settings', array() );
		$settings                 = is_array( $settings ) ? $settings : array();
		$settings['backup_first'] = (bool) $on;
		if ( false === get_option( 'mykavo_settings', false ) ) {
			add_option( 'mykavo_settings', $settings, '', false );
		} else {
			update_option( 'mykavo_settings', $settings, false );
		}
	}

	/**
	 * The running batch, or null.
	 *
	 * @return array|null
	 */
	public static function current() {
		$batch = get_option( self::OPTION, null );
		if ( ! is_array( $batch ) || empty( $batch['id'] ) ) {
			return null;
		}
		if ( (int) $batch['started'] < time() - self::MAX_AGE ) {
			delete_option( self::OPTION );
			return null;
		}
		if ( ! empty( $batch['backup'] ) && 'running' === $batch['backup']['state'] ) {
			$batch['backup']['state'] = self::backup_state( (int) $batch['backup']['started'] );
		}
		return $batch;
	}

	/**
	 * Start a batch: optional backup, optional fresh baseline (paid).
	 *
	 * @param bool $backup   Start a backup first.
	 * @param bool $baseline Ask MyKavo for a fresh baseline first.
	 * @return array|WP_Error The batch.
	 */
	public static function start( $backup, $baseline ) {
		if ( ! current_user_can( 'update_plugins' ) || ! wp_is_file_mod_allowed( 'mykavo_safe_update' ) ) {
			return new WP_Error( 'mykavo_safe_update', __( 'You cannot update plugins on this site.', 'mykavo' ), array( 'status' => 403 ) );
		}
		self::set_backup_first( $backup );
		$batch = array(
			'id'       => strtolower( wp_generate_password( 10, false ) ),
			'started'  => time(),
			'items'    => array(),
			'kept'     => array(),
			'rolled'   => array(),
			'failed'   => array(),
			'backup'   => null,
			'baseline' => null,
		);

		$plugin = self::backup_plugin();
		if ( $backup && $plugin && $plugin['canStart'] ) {
			wp_schedule_single_event(
				time(),
				'updraft_backupnow_backup_all',
				array(
					array(
						'label' => 'MyKavo Safe Update All',
					),
				)
			);
			spawn_cron();
			$batch['backup'] = array(
				'plugin'  => $plugin['id'],
				'state'   => 'running',
				'started' => time(),
			);
		}

		if ( $baseline && MyKavo_API::has_feature( 'baselineBeforeUpdate' ) ) {
			$scan = MyKavo_API::request( 'POST', '/scans', array( 'purpose' => 'before-update' ), 10 );
			if ( ! is_wp_error( $scan ) && isset( $scan['scan']['id'] ) ) {
				$batch['baseline'] = array( 'scanId' => sanitize_text_field( (string) $scan['scan']['id'] ) );
			}
		}

		self::save( $batch );
		return $batch;
	}

	/**
	 * Update one plugin inside the batch, check the site, roll it back if the
	 * site broke.
	 *
	 * @param string $file Plugin basename.
	 * @return array|WP_Error { file, name, from, to, outcome, problem }
	 */
	public static function update_one( $file ) {
		$batch = self::current();
		if ( ! $batch ) {
			return new WP_Error( 'mykavo_safe_update', __( 'Start Safe Update All again: the previous run expired.', 'mykavo' ), array( 'status' => 409 ) );
		}
		if ( ! current_user_can( 'update_plugins' ) ) {
			return new WP_Error( 'mykavo_safe_update', __( 'You cannot update plugins on this site.', 'mykavo' ), array( 'status' => 403 ) );
		}
		$before = MyKavo_Updates::plugin_data( $file );
		if ( ! $before ) {
			return new WP_Error( 'mykavo_safe_update', __( 'That plugin is not installed.', 'mykavo' ), array( 'status' => 404 ) );
		}
		$wporg = MyKavo_Updates::is_wporg( $file );

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		MyKavo_Updates::$suppress = true;
		$skin     = new WP_Ajax_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$results  = $upgrader->bulk_upgrade( array( $file ) );
		wp_clean_plugins_cache( true );

		$after = MyKavo_Updates::plugin_data( $file );
		$item  = MyKavo_Updates::item( 'plugin', (string) $before['Name'], (string) $before['Version'], $after ? (string) $after['Version'] : '', 'update', $file );
		if ( $wporg ) {
			$item['wporg'] = true;
		}
		$row = array(
			'file'    => $file,
			'name'    => $item['name'],
			'from'    => $item['from'],
			'to'      => $item['to'],
			'outcome' => 'updated',
			'problem' => '',
		);

		$failed = ! is_array( $results ) || empty( $results[ $file ] ) || is_wp_error( $results[ $file ] ) || ! $after || $item['from'] === $item['to'];
		if ( $failed ) {
			$message        = $skin->get_error_messages();
			$row['outcome'] = 'failed';
			$row['problem'] = '' !== $message ? wp_strip_all_tags( $message ) : __( 'WordPress could not update this plugin.', 'mykavo' );
			$batch['failed'][] = $row;
			self::save( $batch );
			return $row;
		}

		require_once MYKAVO_DIR . 'includes/class-mykavo-crash-check.php';
		$check = MyKavo_Crash_Check::check();
		if ( 'broken' === $check['state'] ) {
			require_once MYKAVO_DIR . 'includes/class-mykavo-rollback.php';
			require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
			$problem  = self::first_problem( $check );
			$restored = MyKavo_Rollback::restore_item( $item );
			if ( is_wp_error( $restored ) ) {
				$row['outcome'] = 'broken';
				$row['problem'] = $problem . ' ' . $restored->get_error_message();
			} else {
				$row['outcome'] = 'rolled-back';
				$row['problem'] = $problem;
				MyKavo_Auto_Updates::hold( $file, $item['to'] );
			}
			$batch['rolled'][] = $row;
		} else {
			$batch['kept'][]  = $row;
			$batch['items'][] = $item;
		}
		self::save( $batch );
		return $row;
	}

	/**
	 * Finish: one history entry for the whole batch, one report to MyKavo.
	 *
	 * @return array|WP_Error Summary, with the log entry.
	 */
	public static function finish() {
		$batch = self::current();
		if ( ! $batch ) {
			return new WP_Error( 'mykavo_safe_update', __( 'There is no Safe Update All run to finish.', 'mykavo' ), array( 'status' => 409 ) );
		}
		delete_option( self::OPTION );
		$summary = array(
			'updated'    => count( $batch['kept'] ) + count( $batch['rolled'] ),
			'kept'       => wp_list_pluck( $batch['kept'], 'name' ),
			'rolledBack' => array_map(
				static function ( $row ) {
					return array(
						'name'    => $row['name'],
						'to'      => $row['to'],
						'outcome' => $row['outcome'],
						'problem' => $row['problem'],
					);
				},
				$batch['rolled']
			),
			'failed'     => array_map(
				static function ( $row ) {
					return array(
						'name'    => $row['name'],
						'problem' => $row['problem'],
					);
				},
				$batch['failed']
			),
			'backup'     => $batch['backup'] ? $batch['backup']['plugin'] : null,
		);
		$entry = null;
		$rolled_items = array();
		foreach ( $batch['rolled'] as $row ) {
			$rolled_items[] = MyKavo_Updates::item( 'plugin', $row['name'], $row['from'], $row['to'], 'update', $row['file'] );
		}
		if ( ! $batch['items'] && $rolled_items ) {
			$entry = MyKavo_Updates::record(
				$rolled_items,
				'manual',
				array(
					'batch'      => $summary,
					'local_only' => true,
				)
			);
		}
		if ( $batch['items'] ) {
			$entry = MyKavo_Updates::record(
				$batch['items'],
				'manual',
				array(
					'batch' => $summary,
					'crash' => array(
						'state' => 'ok',
						'at'    => time(),
						'pages' => array(),
					),
				)
			);
		}
		return array(
			'summary' => $summary,
			'entry'   => $entry,
		);
	}

	/**
	 * Words for the first problem the crash check found.
	 *
	 * @param array $check Crash check result.
	 * @return string
	 */
	private static function first_problem( array $check ) {
		foreach ( $check['pages'] as $page ) {
			if ( '' !== $page['problem'] && 'unreachable' !== $page['problem'] ) {
				$what = array(
					'server-error' => __( 'answered with a server error', 'mykavo' ),
					'fatal-error'  => __( 'showed a PHP error', 'mykavo' ),
					'empty'        => __( 'came back empty', 'mykavo' ),
				);
				/* translators: 1: page address, 2: what went wrong. */
				return sprintf( __( '%1$s %2$s after the update.', 'mykavo' ), $page['url'], isset( $what[ $page['problem'] ] ) ? $what[ $page['problem'] ] : $page['problem'] );
			}
		}
		return __( 'The site broke after the update.', 'mykavo' );
	}

	/**
	 * Whether the UpdraftPlus backup started for this batch has finished.
	 *
	 * @param int $started When it was started.
	 * @return string running, done or timeout
	 */
	private static function backup_state( $started ) {
		$last = get_option( 'updraft_last_backup', array() );
		if ( is_array( $last ) && isset( $last['backup_time'] ) && (int) $last['backup_time'] >= $started - 60 ) {
			return 'done';
		}
		return $started < time() - 20 * MINUTE_IN_SECONDS ? 'timeout' : 'running';
	}

	/**
	 * Save the batch (never autoloaded).
	 *
	 * @param array $batch Batch.
	 * @return void
	 */
	private static function save( array $batch ) {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, $batch, '', false );
		} else {
			update_option( self::OPTION, $batch, false );
		}
	}
}
