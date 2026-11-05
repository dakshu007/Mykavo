<?php
/**
 * Is that really GPTBot? Checks a crawler's claimed name against its owner.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Anyone can send "GPTBot" in a User-Agent header. Where the company behind
 * a crawler publishes a way to check, MyKavo checks:
 *
 * - IP ranges (OpenAI, Perplexity): the published lists are downloaded once
 *   a day by WP-Cron and kept in one option; a visit is checked against them
 *   with plain arithmetic, no network call.
 * - Reverse DNS (Amazon): the visitor's address must resolve to the
 *   company's crawler host name, and that name back to the same address.
 *   Only done after the page has been delivered (fastcgi_finish_request),
 *   so a slow DNS answer never delays a response.
 *
 * Crawlers whose owner publishes neither stay "not checked". Results are
 * cached for six hours per address in a transient keyed by a salted hash:
 * the address itself is never stored. Requests that arrive through a proxy
 * header (a CDN, a load balancer) are not checked, because the real address
 * cannot be trusted there; the mykavo_client_ip filter lets a site that
 * knows its proxy pass the real one.
 */
final class MyKavo_Bot_Verify {

	const RANGES    = 'mykavo_bot_ranges';
	const CACHE_TTL = 21600; // Six hours.

	/**
	 * Published IP range lists per crawler.
	 *
	 * @return array<string,string>
	 */
	public static function range_sources() {
		return array(
			'GPTBot'          => 'https://openai.com/gptbot.json',
			'OAI-SearchBot'   => 'https://openai.com/searchbot.json',
			'ChatGPT-User'    => 'https://openai.com/chatgpt-user.json',
			'PerplexityBot'   => 'https://www.perplexity.ai/perplexitybot.json',
			'Perplexity-User' => 'https://www.perplexity.ai/perplexity-user.json',
		);
	}

	/**
	 * Crawler host names checked by reverse DNS.
	 *
	 * @return array<string,string>
	 */
	public static function rdns_hosts() {
		return array(
			'Amazonbot' => '.crawl.amazonbot.amazon',
		);
	}

	/**
	 * Whether MyKavo can check a crawler at all.
	 *
	 * @param string $agent Canonical crawler name.
	 * @return bool
	 */
	public static function checkable( $agent ) {
		$sources = self::range_sources();
		$hosts   = self::rdns_hosts();
		return isset( $sources[ $agent ] ) || isset( $hosts[ $agent ] );
	}

	/**
	 * Verdict for the current request: verified, unverified or unknown.
	 *
	 * @param string $agent    Canonical crawler name.
	 * @param bool   $finished Whether the response was already delivered.
	 * @return string
	 */
	public static function state( $agent, $finished ) {
		if ( ! self::checkable( $agent ) ) {
			return 'unknown';
		}
		$ip = self::client_ip();
		if ( '' === $ip ) {
			return 'unknown';
		}
		$key    = 'mykavo_bv_' . substr( hash_hmac( 'sha256', $agent . '|' . $ip, wp_salt( 'nonce' ) ), 0, 32 );
		$cached = get_transient( $key );
		if ( is_string( $cached ) && '' !== $cached ) {
			return $cached;
		}

		$state   = 'unknown';
		$sources = self::range_sources();
		$hosts   = self::rdns_hosts();
		if ( isset( $sources[ $agent ] ) ) {
			$ranges = get_option( self::RANGES, array() );
			if ( is_array( $ranges ) && ! empty( $ranges['agents'][ $agent ] ) ) {
				$state = self::in_ranges( $ip, (array) $ranges['agents'][ $agent ] ) ? 'verified' : 'unverified';
			}
		} elseif ( isset( $hosts[ $agent ] ) && $finished ) {
			$state = self::rdns( $ip, $hosts[ $agent ] ) ? 'verified' : 'unverified';
		}
		if ( 'unknown' !== $state ) {
			set_transient( $key, $state, self::CACHE_TTL );
		}
		return $state;
	}

	/**
	 * The visitor's address, unless the request came through a proxy whose
	 * forwarding header cannot be trusted.
	 *
	 * @return string
	 */
	private static function client_ip() {
		$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) filter_var( wp_unslash( $_SERVER['REMOTE_ADDR'] ), FILTER_VALIDATE_IP ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- validated as an IP.
		$proxied = isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) || isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) || isset( $_SERVER['HTTP_X_REAL_IP'] );
		/**
		 * The crawler's real IP address, for sites behind a proxy they trust.
		 *
		 * @param string $ip      The address MyKavo would use ('' when proxied).
		 * @param string $remote  REMOTE_ADDR.
		 */
		$ip = (string) apply_filters( 'mykavo_client_ip', $proxied ? '' : $remote, $remote );
		return (string) filter_var( $ip, FILTER_VALIDATE_IP );
	}

	/**
	 * Whether an address falls in any CIDR range.
	 *
	 * @param string   $ip     Address.
	 * @param string[] $ranges CIDR ranges.
	 * @return bool
	 */
	public static function in_ranges( $ip, array $ranges ) {
		$bin = @inet_pton( $ip ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- invalid input returns false.
		if ( false === $bin ) {
			return false;
		}
		foreach ( $ranges as $range ) {
			$parts = explode( '/', (string) $range, 2 );
			$net   = @inet_pton( $parts[0] ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- as above.
			if ( false === $net || strlen( $net ) !== strlen( $bin ) ) {
				continue;
			}
			$bits = isset( $parts[1] ) ? (int) $parts[1] : strlen( $net ) * 8;
			$full = intdiv( $bits, 8 );
			$rest = $bits % 8;
			if ( substr( $bin, 0, $full ) !== substr( $net, 0, $full ) ) {
				continue;
			}
			if ( 0 === $rest ) {
				return true;
			}
			$mask = chr( ( 0xFF << ( 8 - $rest ) ) & 0xFF );
			if ( ( $bin[ $full ] & $mask ) === ( $net[ $full ] & $mask ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Reverse DNS, then forward DNS back to the same address.
	 *
	 * @param string $ip     Address.
	 * @param string $suffix Host name the crawler must resolve to.
	 * @return bool
	 */
	private static function rdns( $ip, $suffix ) {
		$host = gethostbyaddr( $ip );
		if ( ! is_string( $host ) || $host === $ip || substr( strtolower( $host ), -strlen( $suffix ) ) !== $suffix ) {
			return false;
		}
		$back = gethostbynamel( $host );
		return is_array( $back ) && in_array( $ip, $back, true );
	}

	/**
	 * Daily (WP-Cron): download the published IP ranges.
	 *
	 * @return void
	 */
	public static function refresh_ranges() {
		$stored = get_option( self::RANGES, array() );
		$agents = is_array( $stored ) && isset( $stored['agents'] ) && is_array( $stored['agents'] ) ? $stored['agents'] : array();
		foreach ( self::range_sources() as $agent => $url ) {
			$response = wp_safe_remote_get(
				$url,
				array(
					'timeout'    => 10,
					'user-agent' => 'MyKavo-WordPress/' . MYKAVO_VERSION,
				)
			);
			if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
				continue; // Keep the last good list.
			}
			$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
			$list = array();
			foreach ( isset( $data['prefixes'] ) && is_array( $data['prefixes'] ) ? $data['prefixes'] : array() as $prefix ) {
				foreach ( array( 'ipv4Prefix', 'ipv6Prefix' ) as $field ) {
					if ( is_array( $prefix ) && isset( $prefix[ $field ] ) && preg_match( '#^[0-9a-fA-F.:]+/\d{1,3}$#', (string) $prefix[ $field ] ) ) {
						$list[] = (string) $prefix[ $field ];
					}
				}
			}
			if ( $list ) {
				$agents[ $agent ] = array_slice( array_values( array_unique( $list ) ), 0, 2000 );
			}
		}
		$value = array(
			'agents' => $agents,
			'at'     => time(),
		);
		if ( false === get_option( self::RANGES, false ) ) {
			add_option( self::RANGES, $value, '', false );
		} else {
			update_option( self::RANGES, $value, false );
		}
	}
}
