<?php
/**
 * Email and contact forms: does this site's mail actually go out?
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * A contact form that silently stops sending is one of the costliest quiet
 * failures a site can have.
 *
 * - Free, on this site: an email delivery test. When switched on, WordPress
 *   sends a short test email to the administration address once a day (or
 *   on demand), and a failure reported by wp_mail (wp_mail_failed) is
 *   recorded and shown. Off by default.
 * - Paid, from Starter: the pages that hold a Contact Form 7, Gravity Forms
 *   or WPForms form are sent to MyKavo, which checks each form still renders.
 * - Pro and Agency: MyKavo also submits a test entry; the plugin shows
 *   MyKavo's result.
 */
final class MyKavo_Forms {

	const RESULT    = 'mykavo_mail_check';
	const CRON_HOOK = 'mykavo_mail_daily';
	const FORMS     = 'mykavo_forms';

	/**
	 * Whether the daily email test is on (default: off).
	 *
	 * @return bool
	 */
	public static function mail_enabled() {
		$settings = get_option( 'mykavo_settings', array() );
		return is_array( $settings ) && ! empty( $settings['mail_check'] );
	}

	/**
	 * Switch the daily email test on or off.
	 *
	 * @param bool $on New state.
	 * @return void
	 */
	public static function set_mail_enabled( $on ) {
		$settings               = get_option( 'mykavo_settings', array() );
		$settings               = is_array( $settings ) ? $settings : array();
		$settings['mail_check'] = (bool) $on;
		if ( false === get_option( 'mykavo_settings', false ) ) {
			add_option( 'mykavo_settings', $settings, '', false );
		} else {
			update_option( 'mykavo_settings', $settings, false );
		}
		if ( $on && ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_HOOK );
		} elseif ( ! $on ) {
			wp_clear_scheduled_hook( self::CRON_HOOK );
		}
	}

	/**
	 * Send the test email now and record whether WordPress could send it.
	 *
	 * @return array The result.
	 */
	public static function test_mail() {
		$error   = '';
		$capture = static function ( $wp_error ) use ( &$error ) {
			if ( is_wp_error( $wp_error ) ) {
				$error = $wp_error->get_error_message();
			}
		};
		add_action( 'wp_mail_failed', $capture );
		$to   = (string) get_option( 'admin_email' );
		$sent = '' !== $to && wp_mail(
			$to,
			/* translators: %s: site name. */
			sprintf( __( '[%s] MyKavo email check', 'mykavo' ), wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES ) ),
			__( "This is MyKavo's daily check that this site can send email. If it reached you, your contact forms and password resets can too.\n\nYou can switch this check off on the MyKavo screen, under Safe Updates.", 'mykavo' )
		);
		remove_action( 'wp_mail_failed', $capture );

		$result = array(
			'ok'    => (bool) $sent && '' === $error,
			'error' => '' !== $error ? sanitize_text_field( $error ) : ( $sent ? '' : __( 'WordPress could not send the email.', 'mykavo' ) ),
			'to'    => $to,
			'at'    => time(),
		);
		if ( false === get_option( self::RESULT, false ) ) {
			add_option( self::RESULT, $result, '', false );
		} else {
			update_option( self::RESULT, $result, false );
		}
		return $result;
	}

	/**
	 * WP-Cron: the daily email test.
	 *
	 * @return void
	 */
	public static function cron() {
		if ( self::mail_enabled() ) {
			self::test_mail();
		} else {
			wp_clear_scheduled_hook( self::CRON_HOOK );
		}
	}

	/**
	 * Published pages and posts that hold a form from a known form plugin.
	 *
	 * @return array<int,array{url:string,title:string,plugin:string}>
	 */
	public static function form_pages() {
		global $wpdb;
		$patterns = array(
			'contact-form-7' => array( '[contact-form-7', 'wp:contact-form-7/' ),
			'gravityforms'   => array( '[gravityform', 'wp:gravityforms/' ),
			'wpforms'        => array( '[wpforms', 'wp:wpforms/' ),
		);
		$out = array();
		foreach ( $patterns as $plugin => $needles ) {
			$where = array();
			$args  = array();
			foreach ( $needles as $needle ) {
				$where[] = 'post_content LIKE %s';
				$args[]  = '%' . $wpdb->esc_like( $needle ) . '%';
			}
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- admin action / daily cron; placeholders built above.
			$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_type IN ('page','post') AND (" . implode( ' OR ', $where ) . ') ORDER BY post_type ASC, ID ASC LIMIT 10', $args ) );
			foreach ( (array) $ids as $id ) {
				$out[] = array(
					'url'    => (string) get_permalink( (int) $id ),
					'title'  => wp_strip_all_tags( get_the_title( (int) $id ) ),
					'plugin' => $plugin,
				);
			}
		}
		return array_slice( $out, 0, 20 );
	}

	/**
	 * Send the form pages to MyKavo (paid) and keep its answer.
	 *
	 * @return array
	 */
	public static function sync() {
		$pages  = self::form_pages();
		$result = MyKavo_API::request( 'POST', '/forms', array( 'pages' => $pages ), 15 );
		if ( MyKavo_API::is_plan_error( $result ) ) {
			$stored = array(
				'allowed' => false,
				'pages'   => $pages,
				'forms'   => array(),
				'at'      => time(),
			);
		} elseif ( is_wp_error( $result ) ) {
			$last = get_option( self::FORMS, null );
			return is_array( $last ) ? $last : array(
				'allowed' => false,
				'pages'   => $pages,
				'forms'   => array(),
				'at'      => 0,
				'error'   => $result->get_error_message(),
			);
		} else {
			$forms = array();
			foreach ( isset( $result['forms'] ) && is_array( $result['forms'] ) ? $result['forms'] : array() as $row ) {
				if ( ! is_array( $row ) || empty( $row['url'] ) ) {
					continue;
				}
				$forms[] = array(
					'url'         => esc_url_raw( (string) $row['url'] ),
					'status'      => isset( $row['status'] ) ? sanitize_key( (string) $row['status'] ) : 'pending',
					'checkedAt'   => isset( $row['checkedAt'] ) ? sanitize_text_field( (string) $row['checkedAt'] ) : null,
					'submission'  => isset( $row['submission'] ) && is_array( $row['submission'] ) ? array(
						'status' => isset( $row['submission']['status'] ) ? sanitize_key( (string) $row['submission']['status'] ) : '',
						'at'     => isset( $row['submission']['at'] ) ? sanitize_text_field( (string) $row['submission']['at'] ) : null,
					) : null,
					'message'     => isset( $row['message'] ) ? sanitize_text_field( (string) $row['message'] ) : '',
				);
			}
			$stored = array(
				'allowed'     => true,
				'submissions' => ! empty( $result['submissions'] ),
				'pages'       => $pages,
				'forms'       => $forms,
				'at'          => time(),
			);
		}
		if ( false === get_option( self::FORMS, false ) ) {
			add_option( self::FORMS, $stored, '', false );
		} else {
			update_option( self::FORMS, $stored, false );
		}
		return $stored;
	}

	/**
	 * What the screen shows.
	 *
	 * @return array
	 */
	public static function status() {
		$mail  = get_option( self::RESULT, null );
		$forms = get_option( self::FORMS, null );
		return array(
			'mail'  => array(
				'enabled' => self::mail_enabled(),
				'last'    => is_array( $mail ) ? $mail : null,
				'to'      => (string) get_option( 'admin_email' ),
			),
			'forms' => is_array( $forms ) ? $forms : array(
				'allowed' => null,
				'pages'   => self::form_pages(),
				'forms'   => array(),
				'at'      => 0,
			),
		);
	}

	/**
	 * Daily (from the AI crawler job): refresh form checks on paid plans.
	 *
	 * @return void
	 */
	public static function daily() {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		if ( MyKavo_API::has_feature( 'formChecks' ) ) {
			self::sync();
		}
	}
}
