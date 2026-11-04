<?php
/**
 * Plugin health: which installed plugins are abandoned or closed.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Once a day (from the existing daily WP-Cron job) the list of installed
 * plugins - folder name, name, version and whether it is active - is sent to
 * MyKavo. MyKavo looks each one up on WordPress.org and answers with the ones
 * that were closed or have not been updated in two years, on plans that
 * include plugin health. The answer is kept here for the admin screen.
 */
final class MyKavo_Health {

	const OPTION = 'mykavo_plugin_health';
	const MAX    = 300;

	/**
	 * The installed plugins, as MyKavo expects them. Plugins that are a
	 * single file without a folder are left out: their file name is not
	 * their WordPress.org slug, so MyKavo could only misreport them.
	 *
	 * @return array<int,array{slug:string,name:string,version:string,active:bool}>
	 */
	public static function inventory() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$self = plugin_basename( MYKAVO_FILE );
		$out  = array();
		foreach ( get_plugins() as $file => $data ) {
			$slug = strtolower( dirname( (string) $file ) );
			if ( $self === $file || '.' === $slug || ! preg_match( '/^[a-z0-9_-]{1,100}$/', $slug ) ) {
				continue;
			}
			$out[ $slug ] = array(
				'slug'    => $slug,
				'name'    => substr( wp_strip_all_tags( (string) $data['Name'] ), 0, 200 ),
				'version' => substr( (string) $data['Version'], 0, 40 ),
				'active'  => is_plugin_active( $file ),
			);
			if ( count( $out ) >= self::MAX ) {
				break;
			}
		}
		return array_values( $out );
	}

	/**
	 * Send the inventory (POST /plugins) and keep the answer.
	 *
	 * @return array|WP_Error The stored result.
	 */
	public static function send() {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		$plugins = self::inventory();
		if ( ! $plugins ) {
			return self::store( self::nothing(), 0 );
		}
		$result = MyKavo_API::request( 'POST', '/plugins', array( 'plugins' => $plugins ), 20 );
		if ( is_wp_error( $result ) ) {
			$data = $result->get_error_data();
			if ( is_array( $data ) && isset( $data['status'] ) && 404 === (int) $data['status'] ) {
				// A MyKavo that does not check plugins yet.
				return self::store( self::nothing(), count( $plugins ) );
			}
			return $result;
		}
		return self::store( $result, count( $plugins ) );
	}

	/**
	 * An answer with nothing flagged.
	 *
	 * @return array
	 */
	private static function nothing() {
		return array(
			'allowed' => false,
			'flagged' => array(),
		);
	}

	/**
	 * Keep MyKavo's answer (never autoloaded).
	 *
	 * @param array $result POST /plugins response.
	 * @param int   $count  How many plugins were sent.
	 * @return array
	 */
	private static function store( array $result, $count ) {
		$flagged = array();
		foreach ( isset( $result['flagged'] ) && is_array( $result['flagged'] ) ? $result['flagged'] : array() as $row ) {
			if ( ! is_array( $row ) || empty( $row['slug'] ) ) {
				continue;
			}
			$status    = isset( $row['status'] ) && 'closed' === $row['status'] ? 'closed' : 'outdated';
			$updated   = isset( $row['lastUpdated'] ) && is_string( $row['lastUpdated'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $row['lastUpdated'] ) ? $row['lastUpdated'] : null;
			$flagged[] = array(
				'slug'        => sanitize_key( (string) $row['slug'] ),
				'name'        => isset( $row['name'] ) ? sanitize_text_field( (string) $row['name'] ) : '',
				'status'      => $status,
				'lastUpdated' => $updated,
				'reason'      => isset( $row['reason'] ) ? sanitize_text_field( (string) $row['reason'] ) : '',
			);
		}
		$stored = array(
			'allowed' => isset( $result['allowed'] ) && true === $result['allowed'],
			'flagged' => array_slice( $flagged, 0, self::MAX ),
			'checked' => (int) $count,
			'at'      => time(),
		);
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, $stored, '', false );
		} else {
			update_option( self::OPTION, $stored, false );
		}
		return $stored;
	}

	/**
	 * The last answer, or null before the first send.
	 *
	 * @return array|null
	 */
	public static function last() {
		$stored = get_option( self::OPTION, null );
		return is_array( $stored ) ? $stored : null;
	}
}
