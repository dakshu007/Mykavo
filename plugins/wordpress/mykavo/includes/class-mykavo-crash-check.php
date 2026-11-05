<?php
/**
 * "Did it crash?": a quick local look at the site right after an update.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * About ten seconds after WordPress updates something, a one-off WP-Cron job
 * loads the home page and up to three monitored pages from this server, and
 * looks for the signs of a broken update: a 5xx answer, WordPress's "critical
 * error" page, a PHP fatal error, or an empty page. The verdict goes into
 * the update log, where a broken update gets a "Roll back now" button.
 *
 * Free on every plan: it is this site checking itself. When connected, the
 * result is also sent to MyKavo; on plans with automatic rollback MyKavo may
 * answer "rollback", and the existing automatic rollback carries it out.
 */
final class MyKavo_Crash_Check {

	const CRON_HOOK = 'mykavo_crash_check';
	const DELAY     = 10;
	const TIMEOUT   = 10;
	const MAX_PAGES = 3;

	/**
	 * Queue the check for a log entry.
	 *
	 * @param array $entry Update log entry.
	 * @return void
	 */
	public static function schedule( array $entry ) {
		if ( empty( $entry['id'] ) || ! empty( $entry['rollback_of'] ) || ! self::worth_checking( $entry ) ) {
			return;
		}
		MyKavo_Updates::update_entry( (string) $entry['id'], array( 'crash' => array( 'state' => 'pending' ) ) );
		wp_schedule_single_event( time() + self::DELAY, self::CRON_HOOK, array( (string) $entry['id'] ) );
	}

	/**
	 * Translations cannot crash a site; everything else can.
	 *
	 * @param array $entry Update log entry.
	 * @return bool
	 */
	private static function worth_checking( array $entry ) {
		foreach ( isset( $entry['items'] ) ? (array) $entry['items'] : array() as $item ) {
			if ( is_array( $item ) && isset( $item['type'] ) && 'translation' !== $item['type'] ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * WP-Cron: run the check for one log entry, record it, tell MyKavo.
	 *
	 * @param string $entry_id Log entry id.
	 * @return array|null The result.
	 */
	public static function run( $entry_id ) {
		$entry = MyKavo_Updates::entry( (string) $entry_id );
		if ( ! $entry ) {
			return null;
		}
		$result = self::check();
		MyKavo_Updates::update_entry( (string) $entry['id'], array( 'crash' => $result ) );
		self::report( MyKavo_Updates::entry( (string) $entry['id'] ), $result );
		return $result;
	}

	/**
	 * Load the pages and judge them.
	 *
	 * @return array{state:string,at:int,pages:array}
	 */
	public static function check() {
		$pages  = array();
		$broken = false;
		$seen   = 0;
		foreach ( self::urls() as $url ) {
			$page  = self::probe( $url );
			$pages[] = $page;
			if ( 'unreachable' !== $page['problem'] ) {
				++$seen;
			}
			if ( in_array( $page['problem'], array( 'server-error', 'fatal-error', 'empty' ), true ) ) {
				$broken = true;
			}
		}
		// This server could not load its own pages at all (loopback requests
		// blocked): no verdict, rather than a false alarm.
		$state = $broken ? 'broken' : ( $seen ? 'ok' : 'unknown' );
		return array(
			'state' => $state,
			'at'    => time(),
			'pages' => $pages,
		);
	}

	/**
	 * The home page, then up to three monitored pages on this site.
	 *
	 * @return string[]
	 */
	public static function urls() {
		$home = home_url( '/' );
		$urls = array( $home );
		$host = wp_parse_url( $home, PHP_URL_HOST );
		$known = get_option( 'mykavo_known_pages', array() );
		foreach ( is_array( $known ) ? $known : array() as $url ) {
			if ( count( $urls ) > self::MAX_PAGES ) {
				break;
			}
			if ( is_string( $url ) && wp_parse_url( $url, PHP_URL_HOST ) === $host && ! in_array( untrailingslashit( $url ), array_map( 'untrailingslashit', $urls ), true ) ) {
				$urls[] = $url;
			}
		}
		return $urls;
	}

	/**
	 * Load one page from this server, past page caches.
	 *
	 * @param string $url Page address.
	 * @return array{url:string,code:int,problem:string}
	 */
	private static function probe( $url ) {
		$response = wp_remote_get(
			add_query_arg( 'mykavo_check', wp_generate_password( 8, false ), $url ),
			array(
				'timeout'     => self::TIMEOUT,
				'redirection' => 3,
				// The same choice WordPress makes for its own loopback requests.
				'sslverify'   => apply_filters( 'https_local_ssl_verify', false ),
				'headers'     => array(
					'Cache-Control' => 'no-cache',
					'User-Agent'    => 'MyKavo-WordPress/' . MYKAVO_VERSION . ' (update check)',
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			return array(
				'url'     => $url,
				'code'    => 0,
				'problem' => 'unreachable',
			);
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$body = (string) wp_remote_retrieve_body( $response );
		return array(
			'url'     => $url,
			'code'    => $code,
			'problem' => self::problem( $code, $body ),
		);
	}

	/**
	 * What is wrong with an answer, or '' when it looks fine.
	 *
	 * @param int    $code HTTP status.
	 * @param string $body Response body.
	 * @return string
	 */
	public static function problem( $code, $body ) {
		if ( $code >= 500 ) {
			return 'server-error';
		}
		if ( false !== stripos( $body, 'There has been a critical error on this website' ) || preg_match( '/<b>(?:Fatal|Parse) error<\/b>:|PHP (?:Fatal|Parse) error:/i', $body ) ) {
			return 'fatal-error';
		}
		if ( $code >= 200 && $code < 300 && strlen( trim( $body ) ) < 20 ) {
			return 'empty';
		}
		return '';
	}

	/**
	 * Send the result to MyKavo; carry out a rollback if MyKavo says so on a
	 * plan with automatic rollback.
	 *
	 * @param array|null $entry  Log entry.
	 * @param array      $result Check result.
	 * @return void
	 */
	private static function report( $entry, array $result ) {
		if ( ! $entry || ! MyKavo_Connection::is_connected() || ! MyKavo_Updates::enabled() ) {
			return;
		}
		$answer = MyKavo_API::request(
			'POST',
			'/crash-check',
			array(
				'scanId' => ! empty( $entry['scan_id'] ) ? (string) $entry['scan_id'] : null,
				'state'  => $result['state'],
				'items'  => array_map(
					static function ( $item ) {
						return array(
							'type' => isset( $item['type'] ) ? $item['type'] : '',
							'name' => isset( $item['name'] ) ? $item['name'] : '',
							'from' => isset( $item['from'] ) && '' !== $item['from'] ? $item['from'] : null,
							'to'   => isset( $item['to'] ) && '' !== $item['to'] ? $item['to'] : null,
						);
					},
					isset( $entry['items'] ) ? (array) $entry['items'] : array()
				),
				'pages'  => array_map(
					static function ( $page ) {
						return array(
							'url'     => $page['url'],
							'status'  => $page['code'],
							'problem' => '' !== $page['problem'] ? $page['problem'] : null,
						);
					},
					$result['pages']
				),
			),
			8
		);
		if ( is_wp_error( $answer ) || 'broken' !== $result['state'] ) {
			return;
		}
		if ( ! isset( $answer['action'] ) || 'rollback' !== $answer['action'] || ! MyKavo_Updates::auto_rollback_enabled() || ! MyKavo_API::has_feature( 'autoRollback' ) ) {
			return;
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-auto-updates.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-rollback.php';
		$items = array();
		foreach ( (array) $entry['items'] as $item ) {
			if ( is_array( $item ) && '' === MyKavo_Rollback::blocker( $item, false ) ) {
				$items[] = $item;
			}
		}
		if ( $items ) {
			MyKavo_Rollback::run( $entry, $items, 'auto' );
		}
	}
}
