<?php
/**
 * WP-CLI commands: `wp mykavo ...`.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Check a site's MyKavo monitoring from the command line: status, changes,
 * scans, pages and Safe Updates. Built for agencies that script their
 * maintenance runs, for example "update everything, then run a scan and wait
 * for the verdict". Loaded only under WP-CLI.
 */
final class MyKavo_CLI {

	/**
	 * Show this site's monitoring status.
	 *
	 * ## EXAMPLES
	 *
	 *     wp mykavo status
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Named arguments (unused).
	 * @return void
	 */
	public function status( $args, $assoc_args ) {
		unset( $args, $assoc_args );
		$site = $this->call( 'GET', '/site' );
		$by   = isset( $site['stats']['bySeverity'] ) ? (array) $site['stats']['bySeverity'] : array();

		$rows = array(
			array(
				'Field' => 'Website',
				'Value' => $site['website']['name'] . ' (' . $site['website']['url'] . ')',
			),
			array(
				'Field' => 'Plan',
				'Value' => isset( $site['workspace']['plan']['name'] ) ? $site['workspace']['plan']['name'] : '-',
			),
			array(
				'Field' => 'Monitored pages',
				'Value' => $site['stats']['monitoredPages'] . ' (' . $site['stats']['baselinedPages'] . ' with a baseline)',
			),
			array(
				'Field' => 'Open changes',
				'Value' => $site['stats']['openChanges'] . $this->severity_summary( $by ),
			),
			array(
				'Field' => 'Last scan',
				'Value' => $this->when( isset( $site['website']['lastScanAt'] ) ? $site['website']['lastScanAt'] : null ),
			),
			array(
				'Field' => 'Next scan',
				'Value' => $this->when( isset( $site['website']['nextScanAt'] ) ? $site['website']['nextScanAt'] : null ),
			),
			array(
				'Field' => 'Safe Updates',
				'Value' => MyKavo_Updates::enabled() ? 'on' : 'off',
			),
		);
		WP_CLI\Utils\format_items( 'table', $rows, array( 'Field', 'Value' ) );

		$critical = isset( $by['CRITICAL'] ) ? (int) $by['CRITICAL'] : 0;
		$high     = isset( $by['HIGH'] ) ? (int) $by['HIGH'] : 0;
		if ( $critical + $high > 0 ) {
			WP_CLI::warning( sprintf( '%d important change(s) need attention. Run: wp mykavo changes', $critical + $high ) );
		} else {
			WP_CLI::success( 'All clear.' );
		}
	}

	/**
	 * List detected changes.
	 *
	 * ## OPTIONS
	 *
	 * [--all]
	 * : Include reviewed, approved, fixed and ignored changes, not only open ones.
	 *
	 * [--format=<format>]
	 * : Output format.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 *   - csv
	 *   - count
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp mykavo changes
	 *     wp mykavo changes --all --format=json
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Named arguments.
	 * @return void
	 */
	public function changes( $args, $assoc_args ) {
		unset( $args );
		$all  = WP_CLI\Utils\get_flag_value( $assoc_args, 'all', false );
		$data = $this->call( 'GET', '/changes?status=' . ( $all ? 'all' : 'open' ) );
		$rows = array();
		foreach ( isset( $data['changes'] ) ? (array) $data['changes'] : array() as $change ) {
			$rows[] = array(
				'id'       => $change['id'],
				'severity' => $change['severity'],
				'category' => $change['category'],
				'page'     => isset( $change['pagePath'] ) ? (string) $change['pagePath'] : '',
				'title'    => $change['title'],
				'status'   => $change['status'],
				'detected' => $change['detectedAt'],
			);
		}
		WP_CLI\Utils\format_items( $this->format( $assoc_args ), $rows, array( 'id', 'severity', 'category', 'page', 'title', 'status', 'detected' ) );
	}

	/**
	 * Run a scan now, optionally waiting for the result.
	 *
	 * ## OPTIONS
	 *
	 * [--wait]
	 * : Wait for the scan to finish (up to 15 minutes) and exit non-zero if it found important changes.
	 *
	 * ## EXAMPLES
	 *
	 *     wp plugin update --all && wp mykavo scan --wait
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Named arguments.
	 * @return void
	 */
	public function scan( $args, $assoc_args ) {
		unset( $args );
		$started = $this->call( 'POST', '/scans', array() );
		$id      = isset( $started['scan']['id'] ) ? (string) $started['scan']['id'] : '';
		MyKavo_Connection::flush_cache();
		WP_CLI::log( sprintf( 'Scan %s started.', $id ) );
		if ( ! WP_CLI\Utils\get_flag_value( $assoc_args, 'wait', false ) || '' === $id ) {
			return;
		}

		$deadline = time() + 15 * MINUTE_IN_SECONDS;
		while ( time() < $deadline ) {
			sleep( 5 );
			$scans = $this->call( 'GET', '/scans' );
			foreach ( isset( $scans['scans'] ) ? (array) $scans['scans'] : array() as $scan ) {
				if ( $scan['id'] !== $id ) {
					continue;
				}
				if ( in_array( $scan['status'], array( 'QUEUED', 'RUNNING' ), true ) ) {
					WP_CLI::log( sprintf( '  %d of %d pages checked...', (int) $scan['pagesScanned'], (int) $scan['pagesRequested'] ) );
					break;
				}
				if ( 'FAILED' === $scan['status'] ) {
					WP_CLI::error( 'The scan could not finish. See MyKavo for details.' );
				}
				$changes  = (int) $scan['changesDetected'];
				$severity = isset( $scan['highestSeverity'] ) ? (string) $scan['highestSeverity'] : '';
				if ( 0 === $changes ) {
					WP_CLI::success( 'Verified - nothing changed.' );
					return;
				}
				$message = sprintf( '%d change(s) found, highest severity %s. Run: wp mykavo changes', $changes, $severity );
				if ( in_array( $severity, array( 'CRITICAL', 'HIGH' ), true ) ) {
					WP_CLI::error( $message );
				}
				WP_CLI::warning( $message );
				return;
			}
		}
		WP_CLI::error( 'Still scanning after 15 minutes. Check MyKavo for the result.' );
	}

	/**
	 * Start monitoring pages of this site.
	 *
	 * ## OPTIONS
	 *
	 * <url>...
	 * : One or more page addresses on this site (up to 20).
	 *
	 * ## EXAMPLES
	 *
	 *     wp mykavo monitor https://example.com/pricing/ https://example.com/contact/
	 *
	 * @param array $args       Page addresses.
	 * @param array $assoc_args Named arguments (unused).
	 * @return void
	 */
	public function monitor( $args, $assoc_args ) {
		unset( $assoc_args );
		if ( count( $args ) > 20 ) {
			WP_CLI::error( 'Add at most 20 pages at a time.' );
		}
		$pages = array();
		foreach ( $args as $url ) {
			$pages[] = array( 'url' => esc_url_raw( (string) $url ) );
		}
		$result = $this->call( 'POST', '/pages', array( 'pages' => $pages ) );
		MyKavo_Connection::flush_cache();
		WP_CLI::success(
			sprintf(
				'%d page(s) added, %d already monitored. New pages get their baseline on the next scan.',
				isset( $result['added'] ) ? (int) $result['added'] : 0,
				isset( $result['alreadyMonitored'] ) ? (int) $result['alreadyMonitored'] : 0
			)
		);
	}

	/**
	 * List recent updates and what MyKavo found after each.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 *   - csv
	 *   - count
	 * ---
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Named arguments.
	 * @return void
	 */
	public function updates( $args, $assoc_args ) {
		unset( $args );
		$rows = array();
		foreach ( MyKavo_Updates::log() as $entry ) {
			$items = isset( $entry['items'] ) ? (array) $entry['items'] : array();
			$first = $items ? $items[0] : array();
			if ( ! empty( $entry['result'] ) ) {
				$verdict = 0 === (int) $entry['result']['changes'] ? 'nothing changed' : sprintf( '%d change(s)', (int) $entry['result']['changes'] );
			} elseif ( ! empty( $entry['reason'] ) ) {
				$verdict = 'not checked (' . $entry['reason'] . ')';
			} else {
				$verdict = $entry['scan_id'] ? 'checked' : '-';
			}
			$rows[] = array(
				'when'    => gmdate( 'Y-m-d H:i', (int) $entry['at'] ) . ' UTC',
				'what'    => '' !== $entry['note'] ? $entry['note'] : ( isset( $first['name'] ) ? $first['name'] : '' ),
				'by'      => 'auto' === $entry['trigger'] ? 'automatic' : 'admin',
				'verdict' => $verdict,
			);
		}
		WP_CLI\Utils\format_items( $this->format( $assoc_args ), $rows, array( 'when', 'what', 'by', 'verdict' ) );
	}

	/**
	 * Turn Safe Updates on or off.
	 *
	 * ## OPTIONS
	 *
	 * <state>
	 * : on or off.
	 * ---
	 * options:
	 *   - on
	 *   - off
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp mykavo safe-updates off
	 *
	 * @subcommand safe-updates
	 *
	 * @param array $args       The state.
	 * @param array $assoc_args Named arguments (unused).
	 * @return void
	 */
	public function safe_updates( $args, $assoc_args ) {
		unset( $assoc_args );
		MyKavo_Updates::set_enabled( 'on' === $args[0] );
		WP_CLI::success( 'Safe Updates is ' . $args[0] . '.' );
	}

	/**
	 * Disconnect this site from MyKavo and revoke its key.
	 *
	 * ## OPTIONS
	 *
	 * [--yes]
	 * : Do not ask for confirmation.
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Named arguments.
	 * @return void
	 */
	public function disconnect( $args, $assoc_args ) {
		unset( $args );
		if ( ! MyKavo_Connection::is_connected() ) {
			WP_CLI::success( 'This site is not connected.' );
			return;
		}
		WP_CLI::confirm( 'Disconnect this site from MyKavo?', $assoc_args );
		MyKavo_API::request( 'POST', '/disconnect', array() );
		MyKavo_Connection::clear();
		WP_CLI::success( 'Disconnected. Monitoring in your MyKavo account is not affected.' );
	}

	/* ------------------------------------------------------------- helpers -- */

	/**
	 * Call MyKavo or stop with a readable error.
	 *
	 * @param string     $method HTTP method.
	 * @param string     $path   API path.
	 * @param array|null $body   JSON body.
	 * @return array
	 */
	private function call( $method, $path, $body = null ) {
		if ( ! MyKavo_Connection::is_connected() ) {
			WP_CLI::error( 'This site is not connected to MyKavo. Connect it from the MyKavo screen in wp-admin first.' );
		}
		$result = MyKavo_API::request( $method, $path, $body );
		if ( is_wp_error( $result ) ) {
			WP_CLI::error( $result->get_error_message() );
		}
		return $result;
	}

	/**
	 * The --format value, restricted to what we support.
	 *
	 * @param array $assoc_args Named arguments.
	 * @return string
	 */
	private function format( $assoc_args ) {
		$format = WP_CLI\Utils\get_flag_value( $assoc_args, 'format', 'table' );
		return in_array( $format, array( 'table', 'json', 'csv', 'count' ), true ) ? $format : 'table';
	}

	/**
	 * " (2 critical, 1 high)" or ''.
	 *
	 * @param array $by Open changes by severity.
	 * @return string
	 */
	private function severity_summary( array $by ) {
		$parts = array();
		foreach ( array( 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO' ) as $severity ) {
			if ( ! empty( $by[ $severity ] ) ) {
				$parts[] = (int) $by[ $severity ] . ' ' . strtolower( $severity );
			}
		}
		return $parts ? ' (' . implode( ', ', $parts ) . ')' : '';
	}

	/**
	 * A timestamp for humans, or '-'.
	 *
	 * @param string|null $iso ISO 8601 date.
	 * @return string
	 */
	private function when( $iso ) {
		$time = $iso ? strtotime( (string) $iso ) : false;
		return $time ? gmdate( 'Y-m-d H:i', $time ) . ' UTC (' . human_time_diff( $time ) . ( $time > time() ? ' from now' : ' ago' ) . ')' : '-';
	}
}
