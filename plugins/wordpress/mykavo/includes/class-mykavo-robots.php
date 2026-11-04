<?php
/**
 * Rules in robots.txt for AI crawlers: block AI training, allow AI search.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * One switch on the AI crawlers screen. When it is on, the robots.txt that
 * WordPress generates tells crawlers that collect AI training data to stay
 * away, and leaves the crawlers that read pages to answer people in AI
 * search (and to open a page someone asked about) alone, so the site can
 * still be found and quoted there.
 *
 * Works through the robots_txt filter, which only runs for robots.txt
 * requests. A physical robots.txt file replaces WordPress's virtual one, so
 * in that case the screen shows the rules to copy into it instead.
 */
final class MyKavo_Robots {

	const SETTING = 'ai_robots';

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
		$settings = get_option( 'mykavo_settings', array() );
		return is_array( $settings ) && ! empty( $settings[ self::SETTING ] );
	}

	/**
	 * Switch the rules on or off.
	 *
	 * @param bool $enabled New state.
	 * @return void
	 */
	public static function set_enabled( $enabled ) {
		$settings                  = get_option( 'mykavo_settings', array() );
		$settings                  = is_array( $settings ) ? $settings : array();
		$settings[ self::SETTING ] = (bool) $enabled;
		if ( false === get_option( 'mykavo_settings', false ) ) {
			add_option( 'mykavo_settings', $settings, '', false );
		} else {
			update_option( 'mykavo_settings', $settings, false );
		}
	}

	/**
	 * The rules, as robots.txt lines: one group per crawler, which every
	 * robots.txt parser reads the same way.
	 *
	 * @return string
	 */
	public static function rules() {
		$lines = array( '# MyKavo: block AI training crawlers, allow AI search' );
		foreach ( self::blocked() as $agent ) {
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
	 * @param string $is_public The blog_public option ('0' asks search engines to stay away already).
	 * @return string
	 */
	public static function filter( $output, $is_public ) {
		if ( '0' === (string) $is_public || ! self::enabled() ) {
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
			foreach ( self::blocked() as $agent ) {
				if ( preg_match( '/^\s*User-agent:\s*' . preg_quote( $agent, '/' ) . '\s*$/mi', $text ) ) {
					$found[] = $agent;
				}
			}
		}
		return array(
			'enabled'  => self::enabled(),
			'physical' => $physical,
			'inFile'   => $found,
			'public'   => '0' !== (string) get_option( 'blog_public', '1' ),
			'rules'    => self::rules(),
			'blocked'  => self::blocked(),
			'allowed'  => self::allowed(),
			'url'      => home_url( '/robots.txt' ),
		);
	}
}
