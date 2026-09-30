<?php
/**
 * AI crawler visits: which AI systems read this site, and which pages.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Counts requests from known AI crawlers (ChatGPT, Claude, Perplexity and
 * others) by their User-Agent. Stores daily totals per crawler and page in
 * one small table. No IP addresses, no cookies, nothing about human
 * visitors: a request that is not from an AI crawler never reaches this
 * class (see the User-Agent match in mykavo.php).
 *
 * Once a day, WP-Cron sends the last two weeks of totals to MyKavo so they
 * appear in the MyKavo dashboard, and prunes anything older than 35 days.
 */
final class MyKavo_Bots {

	const DB_VERSION   = '1';
	const DB_OPTION    = 'mykavo_bots_db';
	const CRON_HOOK    = 'mykavo_bots_daily';
	const KEEP_DAYS    = 35;
	const SEND_DAYS    = 14;
	const PATHS_PER    = 10;
	const INSTALL_FAIL = 'mykavo_bots_install_failed';

	/**
	 * Crawler User-Agent token => who runs it and why it visits. The keys are
	 * the canonical names MyKavo accepts; mykavo.php matches the same tokens.
	 *
	 * @return array<string,array{owner:string,purpose:string}>
	 */
	public static function agents() {
		return array(
			'OAI-SearchBot'      => array(
				'owner'   => 'ChatGPT search',
				'purpose' => 'search',
			),
			'ChatGPT-User'       => array(
				'owner'   => 'ChatGPT',
				'purpose' => 'user',
			),
			'GPTBot'             => array(
				'owner'   => 'OpenAI',
				'purpose' => 'training',
			),
			'Claude-SearchBot'   => array(
				'owner'   => 'Claude search',
				'purpose' => 'search',
			),
			'Claude-User'        => array(
				'owner'   => 'Claude',
				'purpose' => 'user',
			),
			'ClaudeBot'          => array(
				'owner'   => 'Anthropic',
				'purpose' => 'training',
			),
			'PerplexityBot'      => array(
				'owner'   => 'Perplexity',
				'purpose' => 'search',
			),
			'Perplexity-User'    => array(
				'owner'   => 'Perplexity',
				'purpose' => 'user',
			),
			'Amazonbot'          => array(
				'owner'   => 'Amazon',
				'purpose' => 'search',
			),
			'DuckAssistBot'      => array(
				'owner'   => 'DuckDuckGo',
				'purpose' => 'search',
			),
			'Meta-ExternalAgent' => array(
				'owner'   => 'Meta AI',
				'purpose' => 'training',
			),
			'MistralAI-User'     => array(
				'owner'   => 'Mistral',
				'purpose' => 'user',
			),
			'CCBot'              => array(
				'owner'   => 'Common Crawl',
				'purpose' => 'training',
			),
			'Bytespider'         => array(
				'owner'   => 'ByteDance',
				'purpose' => 'training',
			),
		);
	}

	/**
	 * The canonical name for a matched User-Agent token, or '' if unknown.
	 *
	 * @param string $token Token as it appeared in the User-Agent.
	 * @return string
	 */
	public static function canonical( $token ) {
		foreach ( array_keys( self::agents() ) as $agent ) {
			if ( 0 === strcasecmp( $agent, (string) $token ) ) {
				return $agent;
			}
		}
		return '';
	}

	/**
	 * Counting is on unless an administrator switched it off.
	 *
	 * @return bool
	 */
	public static function enabled() {
		$settings = get_option( 'mykavo_settings', array() );
		return ! is_array( $settings ) || ! isset( $settings['count_ai_bots'] ) || (bool) $settings['count_ai_bots'];
	}

	/**
	 * Switch counting on or off.
	 *
	 * @param bool $enabled New state.
	 * @return void
	 */
	public static function set_enabled( $enabled ) {
		self::save_setting( 'count_ai_bots', (bool) $enabled );
	}

	/**
	 * Merge one key into the plugin settings (never autoloaded).
	 *
	 * @param string $key   Setting name.
	 * @param mixed  $value Value.
	 * @return void
	 */
	private static function save_setting( $key, $value ) {
		$settings         = get_option( 'mykavo_settings', array() );
		$settings         = is_array( $settings ) ? $settings : array();
		$settings[ $key ] = $value;
		if ( false === get_option( 'mykavo_settings', false ) ) {
			add_option( 'mykavo_settings', $settings, '', false );
		} else {
			update_option( 'mykavo_settings', $settings, false );
		}
	}

	/**
	 * Called for a request whose User-Agent matched an AI crawler: count it
	 * once the response is complete, when its status code is known.
	 *
	 * @param string $token Matched User-Agent token.
	 * @return void
	 */
	public static function track( $token ) {
		$agent = self::canonical( $token );
		if ( '' === $agent ) {
			return;
		}
		add_action(
			'shutdown',
			static function () use ( $agent ) {
				MyKavo_Bots::record( $agent );
			},
			PHP_INT_MAX
		);
	}

	/**
	 * Add one visit to today's row for this crawler and page. A single atomic
	 * INSERT ... ON DUPLICATE KEY UPDATE, so concurrent crawler requests never
	 * lose counts.
	 *
	 * @param string $agent Canonical crawler name.
	 * @return void
	 */
	public static function record( $agent ) {
		if ( ! self::enabled() || ! self::connected() ) {
			return;
		}
		global $wpdb;

		$path   = self::request_path();
		$status = (int) http_response_code();
		$errors = $status >= 400 ? 1 : 0;
		$table  = self::table();
		$sql    = $wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix.
			"INSERT INTO {$table} (day, agent, path_hash, path, hits, errors) VALUES (%s, %s, %s, %s, 1, %d) ON DUPLICATE KEY UPDATE hits = hits + 1, errors = errors + %d",
			gmdate( 'Y-m-d' ),
			$agent,
			md5( $path ),
			$path,
			$errors,
			$errors
		);

		$suppress = $wpdb->suppress_errors( true );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared -- a counter; prepared above.
		$done = $wpdb->query( $sql );
		if ( false === $done && self::install() ) {
			// First crawler visit after an update, before any admin screen created the table.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared -- as above.
			$wpdb->query( $sql );
		}
		$wpdb->suppress_errors( $suppress );
	}

	/**
	 * Whether this site is connected, read without loading the connection class.
	 *
	 * @return bool
	 */
	private static function connected() {
		$connection = get_option( 'mykavo_connection', null );
		return is_array( $connection ) && ! empty( $connection['token'] );
	}

	/**
	 * The requested path without its query string: which page, never who.
	 *
	 * @return string
	 */
	private static function request_path() {
		$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- reduced to a bare path below.
		$path = wp_parse_url( $uri, PHP_URL_PATH );
		$path = is_string( $path ) && '' !== $path ? $path : '/';
		$path = preg_replace( '/[^\x21-\x7E]/', '', $path );
		$path = '' === $path ? '/' : $path;
		// Plain permalinks (/?p=123): keep the post or page id, the only query
		// that names a page. Everything else (tracking tags, searches) is dropped.
		$query = wp_parse_url( $uri, PHP_URL_QUERY );
		if ( is_string( $query ) && '' !== $query ) {
			parse_str( $query, $args );
			foreach ( array( 'p', 'page_id' ) as $key ) {
				if ( isset( $args[ $key ] ) && is_string( $args[ $key ] ) && ctype_digit( $args[ $key ] ) ) {
					$path .= '?' . $key . '=' . $args[ $key ];
					break;
				}
			}
		}
		return substr( $path, 0, 255 );
	}

	/**
	 * The table name.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'mykavo_bot_visits';
	}

	/**
	 * Create or upgrade the table. Cheap to call: it returns straight away
	 * once the current version is installed.
	 *
	 * @return bool Whether the table is ready.
	 */
	public static function install() {
		if ( self::DB_VERSION === get_option( self::DB_OPTION ) ) {
			return true;
		}
		if ( get_transient( self::INSTALL_FAIL ) ) {
			return false;
		}
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$table   = self::table();
		$charset = $wpdb->get_charset_collate();
		dbDelta(
			"CREATE TABLE {$table} (
  day date NOT NULL,
  agent varchar(32) NOT NULL,
  path_hash char(32) NOT NULL,
  path varchar(255) NOT NULL,
  hits int(10) unsigned NOT NULL DEFAULT 0,
  errors int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY  (day,agent,path_hash)
) {$charset};"
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- checking our own table exists.
		$exists = $table === $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );
		if ( ! $exists ) {
			set_transient( self::INSTALL_FAIL, 1, DAY_IN_SECONDS );
			return false;
		}
		update_option( self::DB_OPTION, self::DB_VERSION, false );
		return true;
	}

	/**
	 * Make sure the daily send is scheduled while the site is connected.
	 *
	 * @return void
	 */
	public static function ensure_schedule() {
		if ( self::connected() && ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_HOOK );
		}
	}

	/**
	 * Stop the daily send (disconnect, deactivation).
	 *
	 * @return void
	 */
	public static function unschedule() {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * The daily job: share recent totals with MyKavo, then prune.
	 *
	 * @return void
	 */
	public static function daily() {
		if ( ! self::connected() ) {
			self::unschedule();
			return;
		}
		if ( self::install() ) {
			if ( self::enabled() ) {
				self::send();
			}
			self::prune();
		}
	}

	/**
	 * Send the last two weeks, day by day. MyKavo replaces each day it
	 * receives, so sending a day again (today, a retry) never double-counts.
	 *
	 * @return bool Whether MyKavo accepted them.
	 */
	public static function send() {
		$days = self::daily_totals( self::SEND_DAYS );
		if ( ! $days ) {
			return true;
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		$result = MyKavo_API::request( 'POST', '/ai-bots', array( 'days' => $days ), 20 );
		if ( is_wp_error( $result ) ) {
			return false;
		}
		self::save_setting( 'ai_bots_sent_at', time() );
		return true;
	}

	/**
	 * Per day and crawler: visits, error responses and the most-read pages.
	 *
	 * @param int $days How many days back, including today.
	 * @return array<int,array{day:string,agents:array}>
	 */
	public static function daily_totals( $days ) {
		global $wpdb;
		$table = self::table();
		$since = gmdate( 'Y-m-d', time() - ( $days - 1 ) * DAY_IN_SECONDS );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- our own table.
		$groups = $wpdb->get_results( $wpdb->prepare( "SELECT day, agent, SUM(hits) AS hits, SUM(errors) AS errors FROM {$table} WHERE day >= %s GROUP BY day, agent ORDER BY day ASC", $since ), ARRAY_A );
		if ( ! is_array( $groups ) || ! $groups ) {
			return array();
		}

		$out = array();
		foreach ( $groups as $g ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- our own table.
			$paths = $wpdb->get_results( $wpdb->prepare( "SELECT path, hits, errors FROM {$table} WHERE day = %s AND agent = %s ORDER BY hits DESC LIMIT %d", $g['day'], $g['agent'], self::PATHS_PER ), ARRAY_A );
			$day   = (string) $g['day'];
			if ( ! isset( $out[ $day ] ) ) {
				$out[ $day ] = array(
					'day'    => $day,
					'agents' => array(),
				);
			}
			$out[ $day ]['agents'][] = array(
				'agent'  => (string) $g['agent'],
				'hits'   => (int) $g['hits'],
				'errors' => (int) $g['errors'],
				'paths'  => array_map(
					static function ( $p ) {
						return array(
							'path'   => (string) $p['path'],
							'hits'   => (int) $p['hits'],
							'errors' => (int) $p['errors'],
						);
					},
					is_array( $paths ) ? $paths : array()
				),
			);
		}
		return array_values( $out );
	}

	/**
	 * Forget days older than KEEP_DAYS.
	 *
	 * @return void
	 */
	public static function prune() {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- our own table.
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE day < %s", gmdate( 'Y-m-d', time() - self::KEEP_DAYS * DAY_IN_SECONDS ) ) );
	}

	/**
	 * The admin screen's summary of the last 30 days, read from this site.
	 *
	 * @return array
	 */
	public static function summary() {
		$settings = get_option( 'mykavo_settings', array() );
		$sent_at  = is_array( $settings ) && ! empty( $settings['ai_bots_sent_at'] ) ? (int) $settings['ai_bots_sent_at'] : 0;
		$base     = array(
			'enabled' => self::enabled(),
			'sentAt'  => $sent_at ? gmdate( 'c', $sent_at ) : null,
			'ready'   => self::install(),
			'total'   => 0,
			'errors'  => 0,
			'agents'  => array(),
			'daily'   => array(),
			'pages'   => array(),
		);
		if ( ! $base['ready'] ) {
			return $base;
		}

		global $wpdb;
		$table = self::table();
		$since = gmdate( 'Y-m-d', time() - 29 * DAY_IN_SECONDS );
		$known = self::agents();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- our own table, admin screen only.
		$agents = $wpdb->get_results( $wpdb->prepare( "SELECT agent, SUM(hits) AS hits, SUM(errors) AS errors, MAX(day) AS last_day FROM {$table} WHERE day >= %s GROUP BY agent ORDER BY hits DESC", $since ), ARRAY_A );
		$daily  = $wpdb->get_results( $wpdb->prepare( "SELECT day, SUM(hits) AS hits FROM {$table} WHERE day >= %s GROUP BY day", $since ), ARRAY_A );
		$pages  = $wpdb->get_results( $wpdb->prepare( "SELECT path_hash, path, SUM(hits) AS hits, SUM(errors) AS errors FROM {$table} WHERE day >= %s GROUP BY path_hash, path ORDER BY hits DESC LIMIT 15", $since ), ARRAY_A );
		$by     = array();
		$hashes = is_array( $pages ) ? array_column( $pages, 'path_hash' ) : array();
		if ( $hashes ) {
			$in = implode( ',', array_fill( 0, count( $hashes ), '%s' ) );
			// Which crawlers read each of those pages.
			$pairs = $wpdb->get_results( $wpdb->prepare( "SELECT DISTINCT path_hash, agent FROM {$table} WHERE day >= %s AND path_hash IN ({$in})", array_merge( array( $since ), $hashes ) ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- placeholders built above.
			foreach ( is_array( $pairs ) ? $pairs : array() as $pair ) {
				$by[ $pair['path_hash'] ][] = (string) $pair['agent'];
			}
		}
		// phpcs:enable

		foreach ( is_array( $agents ) ? $agents : array() as $a ) {
			$name              = (string) $a['agent'];
			$base['total']    += (int) $a['hits'];
			$base['errors']   += (int) $a['errors'];
			$base['agents'][]  = array(
				'agent'    => $name,
				'owner'    => isset( $known[ $name ] ) ? $known[ $name ]['owner'] : $name,
				'purpose'  => isset( $known[ $name ] ) ? $known[ $name ]['purpose'] : 'training',
				'hits'     => (int) $a['hits'],
				'errors'   => (int) $a['errors'],
				'lastSeen' => (string) $a['last_day'],
			);
		}

		$by_day = array();
		foreach ( is_array( $daily ) ? $daily : array() as $d ) {
			$by_day[ (string) $d['day'] ] = (int) $d['hits'];
		}
		for ( $i = 29; $i >= 0; $i-- ) {
			$day             = gmdate( 'Y-m-d', time() - $i * DAY_IN_SECONDS );
			$base['daily'][] = array(
				'day'  => $day,
				'hits' => isset( $by_day[ $day ] ) ? $by_day[ $day ] : 0,
			);
		}

		foreach ( is_array( $pages ) ? $pages : array() as $p ) {
			$base['pages'][] = array(
				'path'   => (string) $p['path'],
				'hits'   => (int) $p['hits'],
				'errors' => (int) $p['errors'],
				'agents' => isset( $by[ $p['path_hash'] ] ) ? self::sorted( $by[ $p['path_hash'] ] ) : array(),
			);
		}
		return $base;
	}

	/**
	 * Unique, alphabetical.
	 *
	 * @param string[] $names Crawler names.
	 * @return string[]
	 */
	private static function sorted( array $names ) {
		$names = array_values( array_unique( $names ) );
		sort( $names, SORT_STRING | SORT_FLAG_CASE );
		return $names;
	}

	/**
	 * Drop the table and everything stored for it (uninstall).
	 *
	 * @return void
	 */
	public static function uninstall() {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- removing our own table on uninstall.
		$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
		delete_option( self::DB_OPTION );
		delete_transient( self::INSTALL_FAIL );
		self::unschedule();
	}
}
