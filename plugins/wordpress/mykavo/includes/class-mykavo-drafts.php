<?php
/**
 * Drafts from MyKavo's AI Keywords & Blog Writer.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * When someone clicks "Save as draft in WordPress" in MyKavo, the post waits
 * there until this site collects it: as soon as someone who can write posts
 * opens WP Admin (at most once a minute), and every 15 minutes in the
 * background. Each one becomes a normal WordPress draft, or updates the
 * draft MyKavo made before while it is still a draft. Nothing is ever
 * published: the site owner reviews the draft and publishes it.
 */
final class MyKavo_Drafts {

	const CRON_HOOK = 'mykavo_drafts_sync';

	const INTERVAL = 'mykavo_fifteen_minutes';

	/** Transient that limits collecting on wp-admin loads to once a minute. */
	const CHECKED = 'mykavo_drafts_checked';

	/** Recently saved drafts, for the "review your new draft" notice. */
	const NOTICE_OPTION = 'mykavo_new_drafts';

	/** The MyKavo draft id a post was made from. */
	const META_ID = '_mykavo_draft_id';

	/** The post's JSON-LD from MyKavo, printed only when no SEO plugin adds schema. */
	const META_JSONLD = '_mykavo_jsonld';

	/** At most this many drafts per collection. */
	const BATCH = 5;

	/**
	 * The 15-minute WP-Cron interval.
	 *
	 * @param array $schedules Registered schedules.
	 * @return array
	 */
	public static function add_interval( $schedules ) {
		$schedules[ self::INTERVAL ] = array(
			'interval' => 15 * MINUTE_IN_SECONDS,
			'display'  => __( 'Every 15 minutes (MyKavo drafts)', 'mykavo' ),
		);
		return $schedules;
	}

	/**
	 * Keep the background collection scheduled while the site is connected.
	 *
	 * @return void
	 */
	public static function ensure_schedule() {
		if ( null !== MyKavo_Connection::get() && ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + MINUTE_IN_SECONDS, self::INTERVAL, self::CRON_HOOK );
		}
	}

	/**
	 * Stop the background collection (deactivation).
	 *
	 * @return void
	 */
	public static function unschedule() {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * On a wp-admin load: collect now, so a draft sent from MyKavo is waiting
	 * by the time the Posts screen opens. At most once a minute per site.
	 *
	 * @return void
	 */
	public static function maybe_collect() {
		if ( wp_doing_ajax() || ! current_user_can( 'edit_posts' ) || get_transient( self::CHECKED ) ) {
			return;
		}
		set_transient( self::CHECKED, 1, MINUTE_IN_SECONDS );
		self::collect();
	}

	/**
	 * Ask MyKavo for queued drafts and save each one.
	 *
	 * @return int Drafts saved.
	 */
	public static function collect() {
		if ( null === MyKavo_Connection::get() ) {
			return 0;
		}
		$result = MyKavo_Api::request( 'GET', '/drafts', null, 8 );
		if ( is_wp_error( $result ) || empty( $result['drafts'] ) || ! is_array( $result['drafts'] ) ) {
			return 0;
		}
		$saved = 0;
		foreach ( array_slice( $result['drafts'], 0, self::BATCH ) as $draft ) {
			if ( is_array( $draft ) && self::receive( $draft ) ) {
				++$saved;
			}
		}
		return $saved;
	}

	/**
	 * Save one draft and tell MyKavo how it went.
	 *
	 * @param array $draft One entry from GET /drafts.
	 * @return bool True when the draft was saved.
	 */
	private static function receive( array $draft ) {
		$id    = isset( $draft['id'] ) && is_string( $draft['id'] ) && preg_match( '/^[A-Za-z0-9_-]{1,64}$/', $draft['id'] ) ? $draft['id'] : '';
		$token = isset( $draft['token'] ) && is_string( $draft['token'] ) ? substr( $draft['token'], 0, 40 ) : '';
		if ( '' === $id ) {
			return false;
		}
		$title = isset( $draft['title'] ) && is_string( $draft['title'] ) ? sanitize_text_field( $draft['title'] ) : '';
		if ( '' === $title ) {
			self::report( $id, array( 'ok' => false, 'token' => $token, 'error' => __( 'The post had no title.', 'mykavo' ) ) );
			return false;
		}
		$slug        = isset( $draft['slug'] ) && is_string( $draft['slug'] ) ? $draft['slug'] : $title;
		$content     = isset( $draft['contentHtml'] ) && is_string( $draft['contentHtml'] ) ? $draft['contentHtml'] : '';
		$description = isset( $draft['metaDescription'] ) && is_string( $draft['metaDescription'] ) ? sanitize_text_field( $draft['metaDescription'] ) : '';

		$postarr = array(
			'post_type'    => 'post',
			'post_status'  => 'draft',
			'post_title'   => $title,
			'post_name'    => sanitize_title( $slug ),
			// The same tags a post author may use, whoever (or no one, in WP-Cron) is signed in.
			'post_content' => wp_kses_post( $content ),
			'post_excerpt' => $description,
		);

		// A resend updates the draft made last time, while it is still a draft.
		$existing = isset( $draft['wpPostId'] ) ? absint( $draft['wpPostId'] ) : 0;
		if ( 0 === $existing ) {
			// Saved before but the report back never arrived: find it by its MyKavo id.
			$found    = get_posts(
				array(
					'post_type'   => 'post',
					'post_status' => array( 'draft', 'pending' ),
					'meta_key'    => self::META_ID, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- one indexed lookup, only for a draft without a known post.
					'meta_value'  => $id, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- as above.
					'fields'      => 'ids',
					'numberposts' => 1,
				)
			);
			$existing = empty( $found ) ? 0 : (int) $found[0];
		}
		$update = false;
		if ( $existing > 0 ) {
			$post = get_post( $existing );
			if ( $post && 'post' === $post->post_type && in_array( $post->post_status, array( 'draft', 'pending', 'auto-draft' ), true ) && get_post_meta( $existing, self::META_ID, true ) === $id ) {
				$postarr['ID'] = $existing;
				$update        = true;
			}
		}
		if ( ! $update ) {
			$postarr['post_author'] = self::author();
		}

		$post_id = $update ? wp_update_post( wp_slash( $postarr ), true ) : wp_insert_post( wp_slash( $postarr ), true );
		if ( is_wp_error( $post_id ) || ! $post_id ) {
			$message = is_wp_error( $post_id ) ? $post_id->get_error_message() : __( 'WordPress could not save the draft.', 'mykavo' );
			self::report( $id, array( 'ok' => false, 'token' => $token, 'error' => wp_strip_all_tags( $message ) ) );
			return false;
		}
		$post_id = (int) $post_id;

		update_post_meta( $post_id, self::META_ID, $id );
		self::seo_meta( $post_id, $description, isset( $draft['focusKeyword'] ) && is_string( $draft['focusKeyword'] ) ? sanitize_text_field( $draft['focusKeyword'] ) : '' );
		$json = isset( $draft['jsonLd'] ) && is_array( $draft['jsonLd'] ) ? wp_json_encode( $draft['jsonLd'] ) : '';
		if ( is_string( $json ) && '' !== $json && strlen( $json ) < 50000 ) {
			update_post_meta( $post_id, self::META_JSONLD, wp_slash( $json ) );
		}

		self::report(
			$id,
			array(
				'ok'       => true,
				'token'    => $token,
				'version'  => isset( $draft['version'] ) ? max( 1, absint( $draft['version'] ) ) : 1,
				'wpPostId' => $post_id,
				'editUrl'  => admin_url( 'post.php?post=' . $post_id . '&action=edit' ),
			)
		);
		self::remember( $post_id, $title );
		return true;
	}

	/**
	 * Fill in the SEO plugin's own fields, so its meta description and focus
	 * keyword match what MyKavo wrote.
	 *
	 * @param int    $post_id     Post.
	 * @param string $description Meta description.
	 * @param string $keyword     Focus keyword.
	 * @return void
	 */
	private static function seo_meta( $post_id, $description, $keyword ) {
		if ( defined( 'WPSEO_VERSION' ) ) {
			if ( '' !== $description ) {
				update_post_meta( $post_id, '_yoast_wpseo_metadesc', $description );
			}
			if ( '' !== $keyword ) {
				update_post_meta( $post_id, '_yoast_wpseo_focuskw', $keyword );
			}
		}
		if ( defined( 'RANK_MATH_VERSION' ) ) {
			if ( '' !== $description ) {
				update_post_meta( $post_id, 'rank_math_description', $description );
			}
			if ( '' !== $keyword ) {
				update_post_meta( $post_id, 'rank_math_focus_keyword', $keyword );
			}
		}
	}

	/**
	 * Whether an SEO plugin that prints its own schema is active.
	 *
	 * @return bool
	 */
	private static function seo_plugin_active() {
		return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' );
	}

	/**
	 * The author for a new draft: the person signed in, else the first administrator.
	 *
	 * @return int
	 */
	private static function author() {
		if ( current_user_can( 'edit_posts' ) ) {
			return get_current_user_id();
		}
		$admins = get_users(
			array(
				'role'    => 'administrator',
				'number'  => 1,
				'orderby' => 'ID',
				'order'   => 'ASC',
				'fields'  => 'ID',
			)
		);
		return empty( $admins ) ? 0 : (int) $admins[0];
	}

	/**
	 * Tell MyKavo what happened to one draft. A refusal shows in MyKavo with
	 * a way to send it again; if this report itself fails, the draft stays
	 * queued there and the next collection updates the same post.
	 *
	 * @param string $id   MyKavo draft id.
	 * @param array  $body Result.
	 * @return void
	 */
	private static function report( $id, array $body ) {
		MyKavo_Api::request( 'POST', '/drafts/' . rawurlencode( $id ), $body, 8 );
	}

	/**
	 * Remember a new draft for the notice in wp-admin.
	 *
	 * @param int    $post_id Post.
	 * @param string $title   Title.
	 * @return void
	 */
	private static function remember( $post_id, $title ) {
		$list = get_option( self::NOTICE_OPTION, array() );
		$list = is_array( $list ) ? $list : array();
		unset( $list[ $post_id ] );
		$list[ $post_id ] = array(
			'title' => $title,
			'at'    => time(),
		);
		update_option( self::NOTICE_OPTION, array_slice( $list, -5, null, true ), false );
	}

	/**
	 * The drafts still worth pointing at: still drafts, under a week old.
	 *
	 * @return array<int,array{title:string,at:int}>
	 */
	private static function fresh_notices() {
		$list = get_option( self::NOTICE_OPTION, array() );
		if ( ! is_array( $list ) || empty( $list ) ) {
			return array();
		}
		$fresh = array();
		foreach ( $list as $post_id => $entry ) {
			$post = get_post( (int) $post_id );
			if ( $post && 'draft' === $post->post_status && is_array( $entry ) && isset( $entry['at'] ) && time() - (int) $entry['at'] < WEEK_IN_SECONDS ) {
				$fresh[ (int) $post_id ] = $entry;
			}
		}
		if ( count( $fresh ) !== count( $list ) ) {
			update_option( self::NOTICE_OPTION, $fresh, false );
		}
		return $fresh;
	}

	/**
	 * "MyKavo saved a draft for you" on the Dashboard and Posts screens.
	 *
	 * @return void
	 */
	public static function admin_notice() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		$screen = get_current_screen();
		if ( ! $screen || ! in_array( $screen->id, array( 'dashboard', 'edit-post', 'toplevel_page_mykavo' ), true ) ) {
			return;
		}
		$drafts = self::fresh_notices();
		if ( empty( $drafts ) ) {
			return;
		}
		$dismiss = wp_nonce_url( admin_url( 'admin-post.php?action=mykavo_dismiss_drafts' ), 'mykavo_dismiss_drafts' );
		echo '<div class="notice notice-info"><p><strong>' . esc_html(
			sprintf(
				/* translators: %d: number of drafts. */
				_n( 'MyKavo saved %d new draft to your Posts. Review it, then publish when you are happy.', 'MyKavo saved %d new drafts to your Posts. Review them, then publish when you are happy.', count( $drafts ), 'mykavo' ),
				count( $drafts )
			)
		) . '</strong></p><ul style="margin:0 0 8px 18px;list-style:disc">';
		foreach ( array_reverse( $drafts, true ) as $post_id => $entry ) {
			echo '<li><a href="' . esc_url( admin_url( 'post.php?post=' . (int) $post_id . '&action=edit' ) ) . '">' . esc_html( $entry['title'] ) . '</a></li>';
		}
		echo '</ul><p><a href="' . esc_url( $dismiss ) . '">' . esc_html__( 'Dismiss', 'mykavo' ) . '</a></p></div>';
	}

	/**
	 * Opening a draft's edit screen takes it off the notice.
	 *
	 * @return void
	 */
	public static function seen() {
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only: which post the edit screen shows.
		if ( $post_id <= 0 ) {
			return;
		}
		$list = get_option( self::NOTICE_OPTION, array() );
		if ( is_array( $list ) && isset( $list[ $post_id ] ) ) {
			unset( $list[ $post_id ] );
			update_option( self::NOTICE_OPTION, $list, false );
		}
	}

	/**
	 * The notice's Dismiss link.
	 *
	 * @return void
	 */
	public static function handle_dismiss() {
		check_admin_referer( 'mykavo_dismiss_drafts' );
		if ( current_user_can( 'edit_posts' ) ) {
			delete_option( self::NOTICE_OPTION );
		}
		wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url( 'edit.php' ) );
		exit;
	}

	/**
	 * Print the post's JSON-LD on its page, with its real address, dates,
	 * author and current title. Skipped when an SEO plugin prints schema of
	 * its own, so a page never carries two.
	 *
	 * @return void
	 */
	public static function print_schema() {
		if ( ! is_singular( 'post' ) || self::seo_plugin_active() ) {
			return;
		}
		$post_id = get_queried_object_id();
		$json    = get_post_meta( $post_id, self::META_JSONLD, true );
		$nodes   = is_string( $json ) && '' !== $json ? json_decode( $json, true ) : null;
		if ( ! is_array( $nodes ) ) {
			return;
		}
		$url = get_permalink( $post_id );
		foreach ( $nodes as $node ) {
			if ( ! is_array( $node ) ) {
				continue;
			}
			if ( isset( $node['@type'] ) && 'BlogPosting' === $node['@type'] ) {
				$node['headline']         = wp_strip_all_tags( get_the_title( $post_id ) );
				$node['url']              = $url;
				$node['mainEntityOfPage'] = $url;
				$node['datePublished']    = get_the_date( 'c', $post_id );
				$node['dateModified']     = get_the_modified_date( 'c', $post_id );
				$author                   = get_the_author_meta( 'display_name', (int) get_post_field( 'post_author', $post_id ) );
				if ( '' !== $author ) {
					$node['author'] = array(
						'@type' => 'Person',
						'name'  => $author,
					);
				}
			}
			// JSON_HEX_TAG: a "<" in the data can never close the script tag.
			echo '<script type="application/ld+json">' . wp_json_encode( $node, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP ) . "</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON encoded with tags hexed.
		}
	}
}
