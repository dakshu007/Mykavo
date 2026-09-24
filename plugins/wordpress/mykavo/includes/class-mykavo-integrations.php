<?php
/**
 * MyKavo inside the WordPress screens people already use.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Plugins screen and Updates screen warnings, Site Health, "Monitor with
 * MyKavo" on the Pages and Posts lists, and WooCommerce checkout pages.
 *
 * Nothing here calls MyKavo while a screen renders: it reads the local
 * update log and cached summary only. The single remote call is the
 * "Monitor with MyKavo" click itself.
 */
final class MyKavo_Integrations {

	/**
	 * Wire up the hooks (admin requests only).
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'plugin_row_meta', array( __CLASS__, 'plugin_row_meta' ), 10, 3 );
		add_action( 'admin_notices', array( __CLASS__, 'updates_screen_notice' ) );
		add_action( 'admin_notices', array( __CLASS__, 'monitor_result_notice' ) );
		add_filter( 'site_status_tests', array( __CLASS__, 'site_health_tests' ) );
		add_filter( 'debug_information', array( __CLASS__, 'debug_information' ) );
		add_filter( 'page_row_actions', array( __CLASS__, 'row_actions' ), 10, 2 );
		add_filter( 'post_row_actions', array( __CLASS__, 'row_actions' ), 10, 2 );
		add_action( 'admin_post_mykavo_monitor', array( __CLASS__, 'monitor_post' ) );
		add_action( 'admin_init', array( __CLASS__, 'privacy_policy' ) );
	}

	/* -------------------------------------------------------- update safety -- */

	/**
	 * Under each plugin with an update waiting: that MyKavo will check the
	 * site afterwards, and what happened the last time this plugin updated.
	 *
	 * @param array  $meta Row meta links.
	 * @param string $file Plugin basename.
	 * @param array  $data Plugin header data.
	 * @return array
	 */
	public static function plugin_row_meta( $meta, $file, $data ) {
		if ( ! current_user_can( 'update_plugins' ) || ! MyKavo_Connection::is_connected() ) {
			return $meta;
		}
		$updates = get_site_transient( 'update_plugins' );
		if ( ! is_object( $updates ) || empty( $updates->response[ $file ] ) ) {
			return $meta;
		}

		$name = isset( $data['Name'] ) ? (string) $data['Name'] : '';
		$last = '' !== $name ? MyKavo_Updates::last_update_of( 'plugin', $name ) : null;

		if ( $last && null !== $last['changes'] && $last['changes'] > 0 ) {
			$meta[] = '<span class="mykavo-risk" style="color:#b32d2e;font-weight:600">' . esc_html(
				sprintf(
					/* translators: 1: number of changes, 2: old version, 3: new version. */
					_n(
						'MyKavo: last time this plugin updated (%2$s to %3$s), %1$d thing changed on your site.',
						'MyKavo: last time this plugin updated (%2$s to %3$s), %1$d things changed on your site.',
						$last['changes'],
						'mykavo'
					),
					$last['changes'],
					$last['from'] ? $last['from'] : '?',
					$last['to'] ? $last['to'] : '?'
				)
			) . '</span>';
		} elseif ( MyKavo_Updates::enabled() ) {
			$meta[] = '<span class="mykavo-safe" style="color:#1a7f47">' . esc_html__( 'MyKavo will check your site after this update.', 'mykavo' ) . '</span>';
		}
		return $meta;
	}

	/**
	 * Dashboard > Updates: reassurance before pressing Update.
	 *
	 * @return void
	 */
	public static function updates_screen_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'update-core' !== $screen->id || ! current_user_can( 'update_plugins' ) ) {
			return;
		}
		$page = admin_url( 'admin.php?page=' . MyKavo_Admin::SLUG );
		if ( ! MyKavo_Connection::is_connected() ) {
			printf(
				'<div class="notice notice-info"><p>%1$s <a href="%2$s">%3$s</a></p></div>',
				esc_html__( 'Worried an update will break something? MyKavo can check your site after every update and tell you exactly which one did it.', 'mykavo' ),
				esc_url( $page ),
				esc_html__( 'Connect MyKavo', 'mykavo' )
			);
			return;
		}
		if ( ! MyKavo_Updates::enabled() ) {
			return;
		}
		printf(
			'<div class="notice notice-success"><p><strong>%1$s</strong> %2$s <a href="%3$s">%4$s</a></p></div>',
			esc_html__( 'Safe Updates is on.', 'mykavo' ),
			esc_html__( 'After you update, MyKavo checks your pages and tells you whether anything broke.', 'mykavo' ),
			esc_url( $page ),
			esc_html__( 'Update history', 'mykavo' )
		);
	}

	/* ---------------------------------------------------------- site health -- */

	/**
	 * Register MyKavo with Tools > Site Health.
	 *
	 * @param array $tests Site Health tests.
	 * @return array
	 */
	public static function site_health_tests( $tests ) {
		$tests['direct']['mykavo'] = array(
			'label' => __( 'MyKavo monitoring', 'mykavo' ),
			'test'  => array( __CLASS__, 'site_health_result' ),
		);
		return $tests;
	}

	/**
	 * The Site Health verdict, from the cached summary - no remote call.
	 *
	 * @return array
	 */
	public static function site_health_result() {
		$page   = admin_url( 'admin.php?page=' . MyKavo_Admin::SLUG );
		$badge  = array(
			'label' => __( 'Monitoring', 'mykavo' ),
			'color' => 'blue',
		);
		$action = sprintf( '<p><a href="%s">%s</a></p>', esc_url( $page ), esc_html__( 'Open MyKavo', 'mykavo' ) );

		if ( ! MyKavo_Connection::is_connected() ) {
			return array(
				'label'       => __( 'Your site is not monitored for changes', 'mykavo' ),
				'status'      => 'recommended',
				'badge'       => $badge,
				'description' => '<p>' . esc_html__( 'Connect MyKavo to learn when an update or edit breaks a page, a checkout button or your SEO - before your visitors do.', 'mykavo' ) . '</p>',
				'actions'     => $action,
				'test'        => 'mykavo',
			);
		}

		$summary = get_transient( MyKavo_Connection::SUMMARY_KEY );
		if ( ! is_array( $summary ) ) {
			return array(
				'label'       => __( 'MyKavo is monitoring this site', 'mykavo' ),
				'status'      => 'good',
				'badge'       => $badge,
				'description' => '<p>' . esc_html__( 'Open the MyKavo screen to see the latest results.', 'mykavo' ) . '</p>',
				'actions'     => $action,
				'test'        => 'mykavo',
			);
		}

		$urgent = (int) $summary['critical'] + (int) $summary['high'];
		if ( $urgent > 0 ) {
			return array(
				/* translators: %d: number of critical or high changes. */
				'label'       => sprintf( _n( 'MyKavo found %d important change on your site', 'MyKavo found %d important changes on your site', $urgent, 'mykavo' ), $urgent ),
				'status'      => (int) $summary['critical'] > 0 ? 'critical' : 'recommended',
				'badge'       => $badge,
				'description' => '<p>' . esc_html__( 'Something that matters changed on a monitored page - for example a page going down, a noindex tag or a missing button. Review it and fix it, or accept it as intended.', 'mykavo' ) . '</p>',
				'actions'     => $action,
				'test'        => 'mykavo',
			);
		}

		return array(
			'label'       => __( 'MyKavo: nothing important has changed', 'mykavo' ),
			'status'      => 'good',
			'badge'       => $badge,
			'description' => '<p>' . esc_html__( 'Your monitored pages match their approved baseline, or only have minor changes to review.', 'mykavo' ) . '</p>',
			'actions'     => $action,
			'test'        => 'mykavo',
		);
	}

	/**
	 * Tools > Site Health > Info: a MyKavo section for support requests.
	 *
	 * @param array $info Debug sections.
	 * @return array
	 */
	public static function debug_information( $info ) {
		$connection = MyKavo_Connection::get();
		$log        = MyKavo_Updates::log();

		$info['mykavo'] = array(
			'label'  => __( 'MyKavo', 'mykavo' ),
			'fields' => array(
				'version'   => array(
					'label' => __( 'Plugin version', 'mykavo' ),
					'value' => MYKAVO_VERSION,
				),
				'connected' => array(
					'label' => __( 'Connected', 'mykavo' ),
					'value' => $connection ? __( 'Yes', 'mykavo' ) : __( 'No', 'mykavo' ),
				),
				'website'   => array(
					'label' => __( 'MyKavo website', 'mykavo' ),
					'value' => $connection ? $connection['website_url'] : '-',
				),
				'updates'   => array(
					'label' => __( 'Safe Updates', 'mykavo' ),
					'value' => MyKavo_Updates::enabled() ? __( 'On', 'mykavo' ) : __( 'Off', 'mykavo' ),
				),
				'last'      => array(
					'label' => __( 'Last reported update', 'mykavo' ),
					'value' => $log ? gmdate( 'Y-m-d H:i', (int) $log[0]['at'] ) . ' UTC' : '-',
				),
			),
		);
		return $info;
	}

	/* ------------------------------------------------- monitor from WordPress -- */

	/**
	 * "Monitor with MyKavo" under each published page and post.
	 *
	 * @param array   $actions Row actions.
	 * @param WP_Post $post    The row's post.
	 * @return array
	 */
	public static function row_actions( $actions, $post ) {
		if ( ! current_user_can( 'manage_options' ) || 'publish' !== $post->post_status || ! MyKavo_Connection::is_connected() ) {
			return $actions;
		}
		$url                       = wp_nonce_url(
			admin_url( 'admin-post.php?action=mykavo_monitor&post=' . (int) $post->ID ),
			'mykavo_monitor_' . (int) $post->ID
		);
		$actions['mykavo_monitor'] = sprintf(
			'<a href="%s" aria-label="%s">%s</a>',
			esc_url( $url ),
			/* translators: %s: post title. */
			esc_attr( sprintf( __( 'Monitor "%s" with MyKavo', 'mykavo' ), get_the_title( $post ) ) ),
			esc_html__( 'Monitor with MyKavo', 'mykavo' )
		);
		return $actions;
	}

	/**
	 * Add one page to MyKavo monitoring, then go back where the admin was.
	 *
	 * @return void
	 */
	public static function monitor_post() {
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'mykavo' ), 403 );
		}
		check_admin_referer( 'mykavo_monitor_' . $post_id );

		$back = wp_get_referer();
		$back = $back ? $back : admin_url( 'edit.php?post_type=page' );
		$post = get_post( $post_id );
		if ( ! $post || 'publish' !== $post->post_status ) {
			wp_safe_redirect( add_query_arg( 'mykavo_monitor', 'error', $back ) );
			exit;
		}

		$result = MyKavo_API::request(
			'POST',
			'/pages',
			array(
				'pages' => array(
					array(
						'url'  => get_permalink( $post ),
						'name' => wp_strip_all_tags( get_the_title( $post ) ),
					),
				),
			)
		);
		MyKavo_Connection::flush_cache();

		if ( is_wp_error( $result ) ) {
			set_transient( 'mykavo_monitor_msg_' . get_current_user_id(), $result->get_error_message(), 60 );
			$status = 'error';
		} else {
			$status = ! empty( $result['added'] ) ? 'added' : 'already';
		}
		wp_safe_redirect( add_query_arg( 'mykavo_monitor', $status, $back ) );
		exit;
	}

	/**
	 * The result of "Monitor with MyKavo", shown on the list it came from.
	 *
	 * @return void
	 */
	public static function monitor_result_notice() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only flag set by our own redirect.
		$status = isset( $_GET['mykavo_monitor'] ) ? sanitize_key( wp_unslash( $_GET['mykavo_monitor'] ) ) : '';
		if ( '' === $status || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( 'added' === $status ) {
			$class = 'notice-success';
			$text  = __( 'MyKavo will monitor that page. Its baseline is recorded on the next scan.', 'mykavo' );
		} elseif ( 'already' === $status ) {
			$class = 'notice-info';
			$text  = __( 'MyKavo already monitors that page.', 'mykavo' );
		} else {
			$class = 'notice-error';
			$key   = 'mykavo_monitor_msg_' . get_current_user_id();
			$msg   = get_transient( $key );
			delete_transient( $key );
			$text = is_string( $msg ) && '' !== $msg ? $msg : __( 'MyKavo could not add that page. Try again from the MyKavo screen.', 'mykavo' );
		}
		printf( '<div class="notice %1$s is-dismissible"><p>%2$s</p></div>', esc_attr( $class ), esc_html( $text ) );
	}

	/* -------------------------------------------------------------- privacy -- */

	/**
	 * Suggested text for Settings > Privacy > Policy Guide.
	 *
	 * @return void
	 */
	public static function privacy_policy() {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		$content = '<p class="privacy-policy-tutorial">' . esc_html__( 'MyKavo collects nothing about your visitors. It adds no scripts, cookies or tracking to your public pages, so there is usually nothing to add to your privacy policy for it.', 'mykavo' ) . '</p>' .
			'<p>' . esc_html__( 'This site uses MyKavo (https://mykavo.app) to monitor its public pages for changes. MyKavo loads those pages from its own servers, the same way a visitor would, and does not receive any information about the people who visit this site.', 'mykavo' ) . '</p>';
		wp_add_privacy_policy_content( 'MyKavo', wp_kses_post( $content ) );
	}

	/* ---------------------------------------------------------- woocommerce -- */

	/**
	 * The store pages that cost money when they break, if WooCommerce is on.
	 *
	 * @return array|null { active: true, pages: [ { key, label, url } ] }
	 */
	public static function woocommerce_pages() {
		if ( ! class_exists( 'WooCommerce' ) || ! function_exists( 'wc_get_page_id' ) ) {
			return null;
		}
		$labels = array(
			'shop'      => __( 'Shop', 'mykavo' ),
			'cart'      => __( 'Cart', 'mykavo' ),
			'checkout'  => __( 'Checkout', 'mykavo' ),
			'myaccount' => __( 'My account', 'mykavo' ),
		);
		$pages  = array();
		foreach ( $labels as $key => $label ) {
			$id = (int) wc_get_page_id( $key );
			if ( $id > 0 && 'publish' === get_post_status( $id ) ) {
				$pages[] = array(
					'key'   => $key,
					'label' => $label,
					'url'   => (string) get_permalink( $id ),
				);
			}
		}
		return array(
			'active' => true,
			'pages'  => $pages,
		);
	}
}
