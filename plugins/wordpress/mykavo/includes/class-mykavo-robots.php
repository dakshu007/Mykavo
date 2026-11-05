<?php
/**
 * Rules in robots.txt for AI crawlers: block AI training, allow AI search.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * A table on the AI crawlers screen with every known AI crawler, each one
 * allowed or blocked. The "Block training, allow search" button sets the
 * usual choice in one go: crawlers that collect AI training data are told to
 * stay away, and the crawlers that read pages to answer people in AI search
 * (and to open a page someone asked about) are left alone, so the site can
 * still be found and quoted there. (1.3.0 had only that one switch; its
 * setting carries over.)
 *
 * Works through the robots_txt filter, which only runs for robots.txt
 * requests. A physical robots.txt file replaces WordPress's virtual one, so
 * in that case the screen shows the rules to copy into it instead.
 */
final class MyKavo_Robots {

	const SETTING = 'ai_robots';
	const RULES   = 'ai_rules';

	/**
	 * Every crawler that can be allowed or blocked: the ones MyKavo counts,
	 * plus the training-only tokens Google and Apple read from robots.txt.
	 *
	 * @return array<string,array{owner:string,purpose:string}>
	 */
	public static function agents() {
		require_once MYKAVO_DIR . 'includes/class-mykavo-bots.php';
		return array_merge(
			MyKavo_Bots::agents(),
			array(
				'Google-Extended'   => array(
					'owner'   => 'Google Gemini',
					'purpose' => 'training',
				),
				'Applebot-Extended' => array(
					'owner'   => 'Apple Intelligence',
					'purpose' => 'training',
				),
			)
		);
	}

	/**
	 * The crawlers this site blocks. Reads the 1.3.0 switch when there is no
	 * per-crawler choice yet.
	 *
	 * @return string[]
	 */
	public static function blocked_agents() {
		$settings = get_option( 'mykavo_settings', array() );
		if ( is_array( $settings ) && isset( $settings[ self::RULES ] ) && is_array( $settings[ self::RULES ] ) ) {
			$known = self::agents();
			return array_values(
				array_filter(
					$settings[ self::RULES ],
					static function ( $agent ) use ( $known ) {
						return is_string( $agent ) && isset( $known[ $agent ] );
					}
				)
			);
		}
		return ( is_array( $settings ) && ! empty( $settings[ self::SETTING ] ) ) ? self::blocked() : array();
	}

	/**
	 * Save which crawlers are blocked.
	 *
	 * @param string[] $agents Crawler tokens to block.
	 * @return void
	 */
	public static function set_blocked( array $agents ) {
		$known = self::agents();
		$clean = array();
		foreach ( $agents as $agent ) {
			if ( is_string( $agent ) && isset( $known[ $agent ] ) ) {
				$clean[] = $agent;
			}
		}
		$settings                  = get_option( 'mykavo_settings', array() );
		$settings                  = is_array( $settings ) ? $settings : array();
		$settings[ self::RULES ]   = array_values( array_unique( $clean ) );
		$settings[ self::SETTING ] = (bool) $clean;
		if ( false === get_option( 'mykavo_settings', false ) ) {
			add_option( 'mykavo_settings', $settings, '', false );
		} else {
			update_option( 'mykavo_settings', $settings, false );
		}
	}

	/**
	 * Crawlers that collect AI training data: blocked when the switch is on.
	 *
	 * @return string[]
	 */
	public static function blocked() {
		return array( 'GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'Meta-ExternalAgent' );
	}

	/**
	 * Crawlers for AI search and for pages a person asked about: never
	 * touched, so the site stays visible in AI answers.
	 *
	 * @return string[]
	 */
	public static function allowed() {
		return array( 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User' );
	}

	/**
	 * Whether the switch is on (default: off).
	 *
	 * @return bool
	 */
	public static function enabled() {
		return (bool) self::blocked_agents();
	}

	/**
	 * Switch the rules on or off.
	 *
	 * @param bool $enabled New state.
	 * @return void
	 */
	public static function set_enabled( $enabled ) {
		// The "Block training, allow search" preset, or allow everything.
		self::set_blocked( $enabled ? self::blocked() : array() );
	}

	/**
	 * The rules, as robots.txt lines: one group per crawler, which every
	 * robots.txt parser reads the same way.
	 *
	 * @return string
	 */
	public static function rules() {
		$lines = array( '# MyKavo: AI crawlers this site asks to stay away' );
		foreach ( self::blocked_agents() as $agent ) {
			$lines[] = 'User-agent: ' . $agent;
			$lines[] = 'Disallow: /';
			$lines[] = '';
		}
		return implode( "\n", $lines );
	}

	/**
	 * Filter: robots_txt. Adds the rules to WordPress's virtual robots.txt.
	 *
	 * @param string $output    robots.txt so far.
	 * @param bool|string $is_public Whether the site is public (false asks search engines to stay away already).
	 * @return string
	 */
	public static function filter( $output, $is_public ) {
		// WordPress 5.3+ passes a boolean; older versions passed '0' or '1'.
		if ( ! $is_public || '0' === (string) $is_public || ! self::enabled() ) {
			return $output;
		}
		return rtrim( (string) $output ) . "\n\n" . self::rules() . "\n";
	}

	/**
	 * What the AI crawlers screen shows about robots.txt.
	 *
	 * @return array
	 */
	public static function status() {
		$file     = ABSPATH . 'robots.txt';
		$physical = file_exists( $file );
		$found    = array();
		if ( $physical && is_readable( $file ) && filesize( $file ) < 512 * KB_IN_BYTES ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading the site's own robots.txt.
			$text = (string) file_get_contents( $file );
			foreach ( self::blocked_agents() as $agent ) {
				if ( preg_match( '/^\s*User-agent:\s*' . preg_quote( $agent, '/' ) . '\s*$/mi', $text ) ) {
					$found[] = $agent;
				}
			}
		}
		$blocked = self::blocked_agents();
		$agents  = array();
		foreach ( self::agents() as $agent => $info ) {
			$agents[] = array(
				'agent'   => $agent,
				'owner'   => $info['owner'],
				'purpose' => $info['purpose'],
				'blocked' => in_array( $agent, $blocked, true ),
			);
		}
		return array(
			'agents'   => $agents,
			'preset'   => self::blocked(),
			'enabled'  => self::enabled(),
			'physical' => $physical,
			'inFile'   => $found,
			'public'   => '0' !== (string) get_option( 'blog_public', '1' ),
			'rules'    => self::rules(),
			'blocked'  => $blocked,
			'allowed'  => self::allowed(),
			'url'      => home_url( '/robots.txt' ),
		);
	}
}
