<?php
/**
 * llms.txt: a short guide to this site for AI assistants.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Serves /llms.txt (the proposed llmstxt.org format): the site's name and
 * description, then its important pages as a Markdown list. Built from this
 * site's own content and the pages monitored in MyKavo. On paid plans, from
 * Starter, each page also gets a one-line summary written by MyKavo.
 *
 * Switched on and off on the AI crawlers screen (off by default). The text
 * is built ahead of time and kept in one option, so serving it is a single
 * read, and it is only ever read for a request to /llms.txt: the check in
 * mykavo.php is a string match on the request path, before WordPress runs
 * any query. If the site already has a real llms.txt file, the web server
 * serves that file and the screen shows the text to copy into it instead.
 */
final class MyKavo_Llms {

	const SETTING   = 'llms_txt';
	const CACHE     = 'mykavo_llms';
	const SUMMARIES = 'mykavo_llms_summaries';
	const MAX_PAGES = 30;

	/**
	 * Whether /llms.txt is switched on (default: off).
	 *
	 * @return bool
	 */
	public static function enabled() {
		$settings = get_option( 'mykavo_settings', array() );
		return is_array( $settings ) && ! empty( $settings[ self::SETTING ] );
	}

	/**
	 * Switch /llms.txt on or off.
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
		self::rebuild();
	}

	/**
	 * Filter: do_parse_request. Answers /llms.txt before WordPress parses the
	 * request or queries anything; every other request passes straight on.
	 *
	 * @param bool $parse Whether WordPress should parse the request.
	 * @return bool
	 */
	public static function maybe_serve( $parse ) {
		$path = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_parse_url( esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- reduced to a path.
		$home = (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH );
		if ( trailingslashit( $home ) . 'llms.txt' !== $path || ! self::enabled() ) {
			return $parse;
		}
		$text = get_option( self::CACHE, '' );
		if ( ! is_string( $text ) || '' === $text ) {
			$text = self::rebuild();
		}
		status_header( 200 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'X-Robots-Tag: noindex' );
		header( 'Cache-Control: public, max-age=3600' );
		echo $text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plain text, built from sanitized values.
		exit;
	}

	/**
	 * Build the text and keep it (never autoloaded).
	 *
	 * @return string
	 */
	public static function rebuild() {
		$text = self::build();
		if ( false === get_option( self::CACHE, false ) ) {
			add_option( self::CACHE, $text, '', false );
		} else {
			update_option( self::CACHE, $text, false );
		}
		return $text;
	}

	/**
	 * The llms.txt text.
	 *
	 * @return string
	 */
	public static function build() {
		$name        = self::line( wp_strip_all_tags( (string) get_bloginfo( 'name' ) ) );
		$description = self::line( wp_strip_all_tags( (string) get_bloginfo( 'description' ) ) );
		$summaries   = get_option( self::SUMMARIES, array() );
		$summaries   = is_array( $summaries ) && isset( $summaries['pages'] ) && is_array( $summaries['pages'] ) ? $summaries['pages'] : array();

		$lines = array( '# ' . ( '' !== $name ? $name : wp_parse_url( home_url(), PHP_URL_HOST ) ) );
		if ( '' !== $description ) {
			$lines[] = '';
			$lines[] = '> ' . $description;
		}
		$lines[] = '';
		$lines[] = '## Pages';
		$lines[] = '';
		foreach ( self::pages() as $page ) {
			$summary = isset( $summaries[ $page['url'] ] ) ? self::line( (string) $summaries[ $page['url'] ] ) : '';
			$lines[] = '- [' . self::line( $page['title'] ) . '](' . esc_url_raw( $page['url'] ) . ')' . ( '' !== $summary ? ': ' . $summary : '' );
		}
		return implode( "\n", $lines ) . "\n";
	}

	/**
	 * The pages to list: monitored pages first, then the main published pages.
	 *
	 * @return array<int,array{url:string,title:string}>
	 */
	public static function pages() {
		$out  = array();
		$seen = array();
		$host = wp_parse_url( home_url( '/' ), PHP_URL_HOST );
		$add  = static function ( $url, $title ) use ( &$out, &$seen ) {
			$key = untrailingslashit( strtolower( (string) $url ) );
			if ( '' === $key || isset( $seen[ $key ] ) || count( $out ) >= self::MAX_PAGES ) {
				return;
			}
			$seen[ $key ] = true;
			$out[]        = array(
				'url'   => (string) $url,
				'title' => '' !== trim( (string) $title ) ? (string) $title : (string) $url,
			);
		};

		$add( home_url( '/' ), __( 'Home', 'mykavo' ) );
		$known = get_option( 'mykavo_known_pages', array() );
		foreach ( is_array( $known ) ? $known : array() as $url ) {
			if ( ! is_string( $url ) || wp_parse_url( $url, PHP_URL_HOST ) !== $host ) {
				continue;
			}
			$id = url_to_postid( $url );
			$add( $url, $id ? get_the_title( $id ) : $url );
		}
		$posts = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'posts_per_page' => 20,
				'orderby'        => 'menu_order',
				'order'          => 'ASC',
				'has_password'   => false,
				'no_found_rows'  => true,
			)
		);
		foreach ( $posts as $post ) {
			$add( (string) get_permalink( $post ), $post->post_title );
		}
		return $out;
	}

	/**
	 * Daily (paid plans): ask MyKavo for page summaries, then rebuild.
	 *
	 * @return void
	 */
	public static function refresh_summaries() {
		if ( ! self::enabled() ) {
			return;
		}
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		if ( MyKavo_API::has_feature( 'llmsSummaries' ) ) {
			$urls   = wp_list_pluck( self::pages(), 'url' );
			$result = MyKavo_API::request( 'POST', '/llms-summaries', array( 'urls' => array_values( $urls ) ), 20 );
			if ( ! is_wp_error( $result ) && isset( $result['summaries'] ) && is_array( $result['summaries'] ) ) {
				$pages = array();
				foreach ( $result['summaries'] as $row ) {
					if ( is_array( $row ) && isset( $row['url'], $row['summary'] ) && is_string( $row['url'] ) && is_string( $row['summary'] ) ) {
						$pages[ esc_url_raw( $row['url'] ) ] = substr( sanitize_text_field( $row['summary'] ), 0, 300 );
					}
				}
				update_option(
					self::SUMMARIES,
					array(
						'pages' => $pages,
						'at'    => time(),
					),
					false
				);
			}
		}
		self::rebuild();
	}

	/**
	 * What the AI crawlers screen shows.
	 *
	 * @return array
	 */
	public static function status() {
		$file      = ABSPATH . 'llms.txt';
		$summaries = get_option( self::SUMMARIES, array() );
		return array(
			'enabled'     => self::enabled(),
			'physical'    => file_exists( $file ),
			'url'         => home_url( '/llms.txt' ),
			'text'        => self::build(),
			'summarized'  => is_array( $summaries ) && ! empty( $summaries['pages'] ),
			'summariesAt' => is_array( $summaries ) && ! empty( $summaries['at'] ) ? gmdate( 'c', (int) $summaries['at'] ) : null,
		);
	}

	/**
	 * One line of plain text: no line breaks, no Markdown brackets.
	 *
	 * @param string $text Text.
	 * @return string
	 */
	private static function line( $text ) {
		$text = preg_replace( '/\s+/', ' ', (string) $text );
		return trim( str_replace( array( '[', ']' ), array( '(', ')' ), (string) $text ) );
	}
}
