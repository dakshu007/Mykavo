<?php
/**
 * Snapshots: a zip of a plugin or theme taken just before WordPress updates it.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Right before WordPress replaces a plugin or theme during an update, the
 * folder as it is now is zipped into wp-content/mykavo-snapshots/. That copy
 * is what lets any plugin or theme be rolled back - including premium ones
 * that are not on WordPress.org - and it is exactly what was running before.
 *
 * Rules:
 * - Only updates (never fresh installs), and never MyKavo itself.
 * - Skipped when the folder is over 200 MB or the disk is low.
 * - The last two snapshots per plugin or theme are kept, and none for longer
 *   than seven days (a daily WP-Cron job deletes older ones).
 * - The folder is closed to the web (index.php, .htaccess and random file
 *   names for servers that ignore .htaccess).
 *
 * Free on every plan: it runs entirely inside WordPress.
 */
final class MyKavo_Snapshots {

	const OPTION    = 'mykavo_snapshots';
	const CRON_HOOK = 'mykavo_snapshots_daily';
	const KEEP      = 2;
	const MAX_AGE   = 604800; // Seven days.
	const MAX_BYTES = 209715200; // 200 MB.
	const MIN_FREE  = 104857600; // Keep at least 100 MB free after the zip.

	/**
	 * The folder snapshots live in.
	 *
	 * @return string
	 */
	public static function dir() {
		return trailingslashit( WP_CONTENT_DIR ) . 'mykavo-snapshots';
	}

	/**
	 * Filter callback for upgrader_pre_install: snapshot what is about to be
	 * replaced. Never changes the update: the response is returned untouched,
	 * and any problem only means there is no snapshot.
	 *
	 * @param mixed $response   Filter value, passed through.
	 * @param array $hook_extra Which package is being updated.
	 * @return mixed
	 */
	public static function before_update( $response, $hook_extra ) {
		if ( is_wp_error( $response ) || ! is_array( $hook_extra ) ) {
			return $response;
		}
		try {
			if ( ! empty( $hook_extra['plugin'] ) && is_string( $hook_extra['plugin'] ) ) {
				$slug = dirname( $hook_extra['plugin'] );
				if ( '.' !== $slug && plugin_basename( MYKAVO_FILE ) !== $hook_extra['plugin'] ) {
					require_once MYKAVO_DIR . 'includes/class-mykavo-updates.php';
					$data = MyKavo_Updates::plugin_data( $hook_extra['plugin'] );
					if ( $data ) {
						self::take( 'plugin', $slug, (string) $data['Version'], WP_PLUGIN_DIR . '/' . $slug );
					}
				}
			} elseif ( ! empty( $hook_extra['theme'] ) && is_string( $hook_extra['theme'] ) ) {
				$theme = wp_get_theme( $hook_extra['theme'] );
				if ( $theme->exists() ) {
					self::take( 'theme', $hook_extra['theme'], (string) $theme->get( 'Version' ), $theme->get_stylesheet_directory() );
				}
			}
		} catch ( Throwable $e ) {
			// A snapshot must never stop an update.
			unset( $e );
		}
		return $response;
	}

	/**
	 * Zip one folder.
	 *
	 * @param string $type    plugin or theme.
	 * @param string $slug    Folder name.
	 * @param string $version Installed version.
	 * @param string $path    Absolute folder path.
	 * @return array|null The snapshot record, or null when skipped.
	 */
	public static function take( $type, $slug, $version, $path ) {
		if ( ! self::valid_slug( $slug ) || '' === $version || ! is_dir( $path ) ) {
			return null;
		}
		if ( 'plugin' === $type && dirname( plugin_basename( MYKAVO_FILE ) ) === $slug ) {
			return null;
		}
		$size = self::folder_size( $path, self::MAX_BYTES );
		if ( $size > self::MAX_BYTES ) {
			return null;
		}
		if ( ! self::prepare_dir() ) {
			return null;
		}
		$free = function_exists( 'disk_free_space' ) ? @disk_free_space( self::dir() ) : false; // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- disabled on some hosts.
		if ( false === $free ? $size > 50 * MB_IN_BYTES : $free < $size + self::MIN_FREE ) {
			return null;
		}

		$id   = wp_generate_password( 20, false );
		$file = sanitize_file_name( $type . '-' . $slug . '-' . $version . '-' . $id . '.zip' );
		$dest = trailingslashit( self::dir() ) . $file;
		if ( ! self::zip( $path, $slug, $dest ) ) {
			wp_delete_file( $dest );
			return null;
		}

		$record = array(
			'id'      => $id,
			'type'    => $type,
			'slug'    => $slug,
			'version' => substr( $version, 0, 40 ),
			'file'    => $file,
			'at'      => time(),
			'size'    => (int) filesize( $dest ),
		);
		$list   = self::all();
		array_unshift( $list, $record );
		self::save( self::trim( $list ) );
		self::ensure_schedule();
		return $record;
	}

	/**
	 * The newest snapshot of a plugin or theme at a given version.
	 *
	 * @param string $type    plugin or theme.
	 * @param string $slug    Folder name.
	 * @param string $version Version.
	 * @return array|null
	 */
	public static function find( $type, $slug, $version ) {
		foreach ( self::all() as $snap ) {
			if ( $type === $snap['type'] && $slug === $snap['slug'] && (string) $version === $snap['version'] && is_readable( self::path( $snap ) ) ) {
				return $snap;
			}
		}
		return null;
	}

	/**
	 * Put a snapshot back in place of the installed folder, through
	 * WordPress's own upgrader (so file permissions, maintenance mode and
	 * caches are handled the usual way). Keeps a plugin active if it was.
	 *
	 * @param array  $snap Snapshot record.
	 * @param string $file Plugin basename (plugins only).
	 * @return true|WP_Error
	 */
	public static function restore( array $snap, $file = '' ) {
		$source = self::path( $snap );
		if ( ! is_readable( $source ) ) {
			return new WP_Error( 'mykavo_snapshot', __( 'The saved copy of that version is no longer on this site.', 'mykavo' ) );
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		// The upgrader deletes the package it installs: give it a copy.
		$package = wp_tempnam( 'mykavo-restore.zip' );
		if ( ! $package || ! copy( $source, $package ) ) {
			return new WP_Error( 'mykavo_snapshot', __( 'WordPress could not prepare the saved copy. Check that wp-content is writable.', 'mykavo' ) );
		}

		$skin = new WP_Ajax_Upgrader_Skin();
		if ( 'theme' === $snap['type'] ) {
			$upgrader = new Theme_Upgrader( $skin );
			$result   = $upgrader->install(
				$package,
				array(
					'overwrite_package'  => true,
					'clear_update_cache' => true,
				)
			);
		} else {
			$was_active = '' !== $file && is_plugin_active( $file );
			$network    = '' !== $file && is_multisite() && is_plugin_active_for_network( $file );
			$upgrader   = new Plugin_Upgrader( $skin );
			$result     = $upgrader->install(
				$package,
				array(
					'overwrite_package'  => true,
					'clear_update_cache' => true,
				)
			);
		}
		if ( file_exists( $package ) ) {
			wp_delete_file( $package );
		}
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( ! $result ) {
			$message = $skin->get_error_messages();
			return new WP_Error( 'mykavo_snapshot', '' !== $message ? wp_strip_all_tags( $message ) : __( 'WordPress could not put the saved copy back. Check that it can write to the plugins and themes folders.', 'mykavo' ) );
		}

		if ( 'plugin' === $snap['type'] && '' !== $file ) {
			wp_clean_plugins_cache( true );
			if ( ! empty( $was_active ) && ! is_plugin_active( $file ) ) {
				activate_plugin( $file, '', ! empty( $network ), true );
			}
		} else {
			wp_clean_themes_cache( true );
		}
		return true;
	}

	/* ---------------------------------------------------------- housekeeping -- */

	/**
	 * Every snapshot record, newest first.
	 *
	 * @return array
	 */
	public static function all() {
		$list = get_option( self::OPTION, array() );
		$out  = array();
		foreach ( is_array( $list ) ? $list : array() as $snap ) {
			if ( is_array( $snap ) && isset( $snap['id'], $snap['type'], $snap['slug'], $snap['version'], $snap['file'], $snap['at'] ) ) {
				$out[] = $snap;
			}
		}
		return $out;
	}

	/**
	 * For the Safe Updates screen: what is kept, and how much space it takes.
	 *
	 * @return array
	 */
	public static function summary() {
		$items = array();
		$bytes = 0;
		foreach ( self::all() as $snap ) {
			$bytes  += isset( $snap['size'] ) ? (int) $snap['size'] : 0;
			$items[] = array(
				'type'    => $snap['type'],
				'slug'    => $snap['slug'],
				'version' => $snap['version'],
				'at'      => (int) $snap['at'],
				'size'    => isset( $snap['size'] ) ? (int) $snap['size'] : 0,
			);
		}
		return array(
			'items' => $items,
			'bytes' => $bytes,
			'keep'  => self::KEEP,
			'days'  => (int) ( self::MAX_AGE / DAY_IN_SECONDS ),
		);
	}

	/**
	 * Daily: delete snapshots older than seven days, and files no record
	 * points to.
	 *
	 * @return void
	 */
	public static function purge() {
		$keep = array();
		foreach ( self::all() as $snap ) {
			if ( (int) $snap['at'] >= time() - self::MAX_AGE ) {
				$keep[] = $snap;
			} else {
				wp_delete_file( self::path( $snap ) );
			}
		}
		self::save( $keep );
		$known = wp_list_pluck( $keep, 'file' );
		foreach ( (array) glob( trailingslashit( self::dir() ) . '*.zip' ) as $path ) {
			if ( is_string( $path ) && ! in_array( basename( $path ), $known, true ) ) {
				wp_delete_file( $path );
			}
		}
		if ( ! $keep ) {
			wp_clear_scheduled_hook( self::CRON_HOOK );
		}
	}

	/**
	 * Schedule the daily purge while there is something to purge.
	 *
	 * @return void
	 */
	public static function ensure_schedule() {
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + DAY_IN_SECONDS, 'daily', self::CRON_HOOK );
		}
	}

	/**
	 * Remove every snapshot and the folder (uninstall).
	 *
	 * @return void
	 */
	public static function remove_all() {
		wp_clear_scheduled_hook( self::CRON_HOOK );
		$dir = self::dir();
		foreach ( array( '*.zip', 'index.php', '.htaccess', 'web.config' ) as $pattern ) {
			foreach ( (array) glob( trailingslashit( $dir ) . $pattern ) as $path ) {
				if ( is_string( $path ) ) {
					wp_delete_file( $path );
				}
			}
		}
		if ( is_dir( $dir ) ) {
			@rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.file_system_operations_rmdir -- our own folder, only if empty.
		}
		delete_option( self::OPTION );
	}

	/* --------------------------------------------------------------- private -- */

	/**
	 * Keep the newest KEEP per plugin or theme; delete the rest.
	 *
	 * @param array $list Records, newest first.
	 * @return array
	 */
	private static function trim( array $list ) {
		$count = array();
		$out   = array();
		foreach ( $list as $snap ) {
			$key           = $snap['type'] . ':' . $snap['slug'];
			$count[ $key ] = isset( $count[ $key ] ) ? $count[ $key ] + 1 : 1;
			if ( $count[ $key ] <= self::KEEP ) {
				$out[] = $snap;
			} else {
				wp_delete_file( self::path( $snap ) );
			}
		}
		return $out;
	}

	/**
	 * Save the records (never autoloaded).
	 *
	 * @param array $list Records.
	 * @return void
	 */
	private static function save( array $list ) {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, array_values( $list ), '', false );
		} else {
			update_option( self::OPTION, array_values( $list ), false );
		}
	}

	/**
	 * Absolute path of a snapshot's zip.
	 *
	 * @param array $snap Record.
	 * @return string
	 */
	private static function path( array $snap ) {
		return trailingslashit( self::dir() ) . basename( (string) $snap['file'] );
	}

	/**
	 * Create the folder and close it to the web.
	 *
	 * @return bool
	 */
	private static function prepare_dir() {
		$dir = self::dir();
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return false;
		}
		$files = array(
			'index.php'  => "<?php\n// Silence is golden.\n",
			'.htaccess'  => "# MyKavo snapshots: never served.\n<IfModule mod_authz_core.c>\n\tRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n\tDeny from all\n</IfModule>\n",
			'web.config' => "<?xml version=\"1.0\"?>\n<configuration><system.webServer><authorization><deny users=\"*\" /></authorization></system.webServer></configuration>\n",
		);
		foreach ( $files as $name => $body ) {
			$path = trailingslashit( $dir ) . $name;
			if ( ! file_exists( $path ) ) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- tiny guard files in our own folder.
				file_put_contents( $path, $body );
			}
		}
		return is_writable( $dir );
	}

	/**
	 * Size of a folder in bytes, stopping once it passes a limit.
	 *
	 * @param string $path  Folder.
	 * @param int    $limit Stop counting above this.
	 * @return int
	 */
	private static function folder_size( $path, $limit ) {
		$total = 0;
		try {
			$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $path, FilesystemIterator::SKIP_DOTS ) );
			foreach ( $files as $file ) {
				if ( $file->isFile() ) {
					$total += (int) $file->getSize();
					if ( $total > $limit ) {
						return $total;
					}
				}
			}
		} catch ( Exception $e ) {
			return PHP_INT_MAX;
		}
		return $total;
	}

	/**
	 * Zip a folder so it unpacks as "{slug}/...", the shape WordPress's
	 * upgrader expects.
	 *
	 * @param string $path Folder.
	 * @param string $slug Folder name inside the zip.
	 * @param string $dest Zip file to write.
	 * @return bool
	 */
	private static function zip( $path, $slug, $dest ) {
		$path = untrailingslashit( wp_normalize_path( $path ) );
		if ( class_exists( 'ZipArchive' ) ) {
			$zip = new ZipArchive();
			if ( true !== $zip->open( $dest, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
				return false;
			}
			$zip->addEmptyDir( $slug );
			$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $path, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::SELF_FIRST );
			foreach ( $files as $file ) {
				$abs   = wp_normalize_path( $file->getPathname() );
				$local = $slug . substr( $abs, strlen( $path ) );
				if ( $file->isDir() ) {
					$zip->addEmptyDir( $local );
				} elseif ( $file->isFile() && $file->isReadable() ) {
					$zip->addFile( $abs, $local );
				}
			}
			return $zip->close();
		}
		require_once ABSPATH . 'wp-admin/includes/class-pclzip.php';
		$archive = new PclZip( $dest );
		$result  = $archive->create( $path, PCLZIP_OPT_REMOVE_PATH, dirname( $path ) );
		return 0 !== $result;
	}

	/**
	 * Plugin and theme folder names: letters, digits, dots, dashes and underscores.
	 *
	 * @param string $slug Candidate.
	 * @return bool
	 */
	public static function valid_slug( $slug ) {
		return is_string( $slug ) && (bool) preg_match( '/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/', $slug );
	}
}
