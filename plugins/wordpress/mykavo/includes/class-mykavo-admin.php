<?php
/**
 * Admin integration: menu, screens, connect flow, dashboard widget.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Everything MyKavo does inside wp-admin. Assets load on MyKavo's own screen
 * (and a 2 KB script on the Dashboard when connected) - never anywhere else.
 */
final class MyKavo_Admin {

	const SLUG = 'mykavo';

	/**
	 * Hook suffix of the MyKavo screen.
	 *
	 * @var string
	 */
	private static $hook = '';

	/**
	 * Wire up admin hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_action( 'admin_post_mykavo_connect', array( __CLASS__, 'start_connect' ) );
		add_action( 'wp_dashboard_setup', array( __CLASS__, 'register_widget' ) );
		add_action( 'admin_notices', array( __CLASS__, 'activation_notice' ) );
		add_action( 'admin_notices', array( __CLASS__, 'critical_notice' ) );
		add_action( 'admin_post_mykavo_dismiss_critical', array( __CLASS__, 'dismiss_critical' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( MYKAVO_FILE ), array( __CLASS__, 'action_links' ) );
	}

	/**
	 * Top-level menu with an attention badge read from the local summary only.
	 *
	 * @return void
	 */
	public static function register_menu() {
		$label   = esc_html__( 'MyKavo', 'mykavo' );
		$summary = MyKavo_Connection::is_connected() ? get_transient( MyKavo_Connection::SUMMARY_KEY ) : false;
		if ( is_array( $summary ) ) {
			$urgent = (int) $summary['critical'] + (int) $summary['high'];
			if ( $urgent > 0 ) {
				$label .= sprintf(
					' <span class="awaiting-mod count-%1$d"><span class="pending-count" aria-hidden="true">%1$d</span><span class="screen-reader-text">%2$s</span></span>',
					$urgent,
					/* translators: %d: number of critical or high severity changes. */
					esc_html( sprintf( _n( '%d change needs attention', '%d changes need attention', $urgent, 'mykavo' ), $urgent ) )
				);
			}
		}

		self::$hook = (string) add_menu_page(
			__( 'MyKavo', 'mykavo' ),
			$label,
			MyKavo_Roles::menu_cap(),
			self::SLUG,
			array( __CLASS__, 'render_page' ),
			self::menu_icon()
		);
		add_action( 'load-' . self::$hook, array( __CLASS__, 'handle_return' ) );
	}

	/**
	 * The MyKavo mark as a data URI, which WordPress recolours to match the
	 * admin colour scheme.
	 *
	 * @return string
	 */
	private static function menu_icon() {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="black" d="M5.4 3.3h8.5c1.7 0 .7 1.15.7 1.15L3.8 15.45c-.55.55-.55 1.1 0 1.1l10.8 11c1 1.15-.7 1.15-.7 1.15H5.4c-2.2 0-2.2-2.2-2.2-2.2v-21c0-2.2 2.2-2.2 2.2-2.2z"/><path fill="black" d="M10.35 16 19.45 3.4 15.85 12l7.85-3.8-7.15 6.3 12.55 1.5-12.55 1.5 7.15 6.3-7.85-3.8 3.6 8.6z"/></svg>';
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- menu icons are passed as data URIs.
		return 'data:image/svg+xml;base64,' . base64_encode( $svg );
	}

	/**
	 * Load the app on the MyKavo screen, and the tiny widget script on the
	 * Dashboard. Nothing on any other screen.
	 *
	 * @param string $hook Current admin screen hook.
	 * @return void
	 */
	public static function enqueue( $hook ) {
		if ( self::$hook && $hook === self::$hook ) {
			wp_enqueue_style( 'mykavo-app', MYKAVO_URL . 'assets/app.css', array(), MYKAVO_VERSION );
			wp_enqueue_script( 'mykavo-app', MYKAVO_URL . 'assets/app.js', array( 'wp-api-fetch', 'wp-i18n' ), MYKAVO_VERSION, true );
			wp_set_script_translations( 'mykavo-app', 'mykavo' );
			wp_add_inline_script( 'mykavo-app', 'window.mykavoConfig = ' . wp_json_encode( self::app_config() ) . ';', 'before' );
			return;
		}

		if ( 'index.php' === $hook && MyKavo_Connection::is_connected() && MyKavo_Roles::can_view() ) {
			wp_enqueue_style( 'mykavo-widget', MYKAVO_URL . 'assets/widget.css', array(), MYKAVO_VERSION );
			wp_enqueue_script( 'mykavo-widget', MYKAVO_URL . 'assets/widget.js', array( 'wp-api-fetch', 'wp-i18n' ), MYKAVO_VERSION, true );
			wp_set_script_translations( 'mykavo-widget', 'mykavo' );
		}
	}

	/**
	 * What the app needs to boot. Never contains the token.
	 *
	 * @return array
	 */
	private static function app_config() {
		$connection = MyKavo_Connection::get();
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display-only flag set by our own redirect.
		$notice = isset( $_GET['mykavo_notice'] ) ? sanitize_key( wp_unslash( $_GET['mykavo_notice'] ) ) : '';

		return array(
			'connected'  => null !== $connection,
			'site'       => array(
				'name' => get_bloginfo( 'name' ),
				'url'  => home_url( '/' ),
			),
			'website'    => $connection ? array(
				'name' => $connection['website_name'],
				'url'  => $connection['website_url'],
			) : null,
			'workspace'  => $connection ? $connection['workspace'] : '',
			// Raw URL, not wp_nonce_url(): that one is HTML-escaped (&amp;) for
			// printing into markup, and the app escapes it again on output - the
			// nonce would arrive as "amp;_wpnonce" and every Connect would 403.
			'connectUrl' => add_query_arg(
				array(
					'action'   => 'mykavo_connect',
					'_wpnonce' => wp_create_nonce( 'mykavo_connect' ),
				),
				admin_url( 'admin-post.php' )
			),
			'appUrl'     => MYKAVO_APP_URL,
			'woo'        => MyKavo_Integrations::woocommerce_pages(),
			'pagesUrl'   => admin_url( 'edit.php?post_type=page' ),
			'notice'     => $notice,
			'version'    => MYKAVO_VERSION,
			'pricingUrl' => untrailingslashit( MYKAVO_APP_URL ) . '/pricing',
			'canUpdate'  => current_user_can( 'update_plugins' ) && wp_is_file_mod_allowed( 'mykavo_rollback' ),
			// 1.3.1: viewers see everything but cannot act.
			'canManage'  => MyKavo_Roles::can_manage(),
			'homeUrl'    => home_url( '/' ),
			'multisite'  => is_multisite(),
			'usersUrl'   => admin_url( 'user-new.php' ),
			// Asking for a WordPress.org review: when the site was connected, and
			// whether this person already answered (per user, never autoloaded).
			'connectedAt'  => $connection && ! empty( $connection['connected_at'] ) ? (int) $connection['connected_at'] : 0,
			'reviewPrompt' => self::review_prompt_state(),
		);
	}

	/**
	 * Whether this person may be asked for a review: 'ask', or 'no' once they
	 * reviewed, said no, or asked to be reminded later and that time has not come.
	 *
	 * @return string
	 */
	private static function review_prompt_state() {
		$answer = (string) get_user_meta( get_current_user_id(), 'mykavo_review_prompt', true );
		if ( 'done' === $answer || 'never' === $answer ) {
			return 'no';
		}
		if ( 0 === strpos( $answer, 'later:' ) && (int) substr( $answer, 6 ) > time() ) {
			return 'no';
		}
		return 'ask';
	}

	/**
	 * The screen itself: a mount point. The app draws a skeleton instantly
	 * and fills it from this site's REST routes.
	 *
	 * @return void
	 */
	public static function render_page() {
		if ( ! MyKavo_Roles::can_view() ) {
			return;
		}
		?>
		<div class="wrap mykavo-wrap">
			<h1 class="screen-reader-text"><?php esc_html_e( 'MyKavo', 'mykavo' ); ?></h1>
			<hr class="wp-header-end" />
			<div id="mykavo-app" class="mk">
				<div class="mk-boot" aria-hidden="true"><span></span><span></span><span></span></div>
			</div>
			<noscript><p><?php esc_html_e( 'MyKavo needs JavaScript enabled in your browser.', 'mykavo' ); ?></p></noscript>
		</div>
		<?php
	}

	/* ---------------------------------------------------------------- connect */

	/**
	 * Connect button: start a PKCE handshake and send the admin to mykavo.app
	 * to approve.
	 *
	 * @return void
	 */
	public static function start_connect() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to connect this site.', 'mykavo' ), 403 );
		}
		// A Connect button left open for a day carries an expired nonce.
		// Send the admin back to a fresh screen instead of WordPress's bare
		// "The link you followed has expired" page.
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'mykavo_connect' ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG . '&mykavo_notice=stale' ) );
			exit;
		}

		$handshake = MyKavo_Connection::begin_handshake();
		$url       = add_query_arg(
			array(
				'site'      => rawurlencode( home_url( '/' ) ),
				'return'    => rawurlencode( admin_url( 'admin.php?page=' . self::SLUG ) ),
				'state'     => $handshake['state'],
				'challenge' => $handshake['challenge'],
				'name'      => rawurlencode( wp_strip_all_tags( get_bloginfo( 'name' ) ) ),
				'pv'        => MYKAVO_VERSION,
				'wpv'       => rawurlencode( get_bloginfo( 'version' ) ),
			),
			untrailingslashit( MYKAVO_APP_URL ) . '/connect/wordpress'
		);

		// wp_redirect, not wp_safe_redirect: mykavo.app is deliberately external.
		wp_redirect( esc_url_raw( $url ) ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect
		exit;
	}

	/**
	 * Back from mykavo.app: finish the handshake before the screen renders,
	 * then redirect to a clean URL so a refresh never replays the code.
	 *
	 * @return void
	 */
	public static function handle_return() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- the handshake `state` is the CSRF check here, verified below.
		if ( ! isset( $_GET['mykavo_state'] ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$state = sanitize_text_field( wp_unslash( $_GET['mykavo_state'] ) );
		$code  = isset( $_GET['mykavo_code'] ) ? sanitize_text_field( wp_unslash( $_GET['mykavo_code'] ) ) : '';
		$error = isset( $_GET['mykavo_error'] ) ? sanitize_key( wp_unslash( $_GET['mykavo_error'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		$verifier = MyKavo_Connection::finish_handshake( $state );

		$notice = 'failed';
		if ( null === $verifier ) {
			$notice = 'expired';
		} elseif ( '' !== $error ) {
			$notice = 'cancelled';
		} elseif ( '' !== $code ) {
			$result = MyKavo_API::exchange( $code, $verifier );
			if ( ! is_wp_error( $result ) && ! empty( $result['token'] ) && is_string( $result['token'] ) ) {
				MyKavo_Connection::save( $result );
				$notice = 'connected';
			}
		}

		wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG . '&mykavo_notice=' . $notice ) );
		exit;
	}

	/* -------------------------------------------------------------- dashboard */

	/**
	 * A small status card on the WordPress Dashboard, drawn from the locally
	 * cached summary - opening the Dashboard never waits on MyKavo.
	 *
	 * @return void
	 */
	public static function register_widget() {
		if ( ! MyKavo_Connection::is_connected() || ! MyKavo_Roles::can_view() ) {
			return;
		}
		wp_add_dashboard_widget( 'mykavo_status', esc_html__( 'MyKavo monitoring', 'mykavo' ), array( __CLASS__, 'render_widget' ) );
	}

	/**
	 * Widget body; widget.js refreshes it in the background when stale.
	 *
	 * @return void
	 */
	public static function render_widget() {
		$summary = get_transient( MyKavo_Connection::SUMMARY_KEY );
		$stale   = ! is_array( $summary ) || ( time() - (int) $summary['checked_at'] ) > 10 * MINUTE_IN_SECONDS;
		?>
		<div class="mkw" data-stale="<?php echo $stale ? '1' : '0'; ?>" data-page="<?php echo esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ); ?>">
			<?php self::render_widget_body( is_array( $summary ) ? $summary : null ); ?>
		</div>
		<?php
	}

	/**
	 * Widget contents from a summary.
	 *
	 * @param array|null $summary Cached summary.
	 * @return void
	 */
	private static function render_widget_body( $summary ) {
		$page = admin_url( 'admin.php?page=' . self::SLUG );
		if ( null === $summary ) {
			?>
			<p class="mkw-muted"><?php esc_html_e( 'Checking your site...', 'mykavo' ); ?></p>
			<?php
			return;
		}
		$urgent = (int) $summary['critical'] + (int) $summary['high'];
		$open   = (int) $summary['open'];
		$tone   = $urgent > 0 ? 'bad' : ( $open > 0 ? 'warn' : 'good' );
		?>
		<div class="mkw-status mkw-<?php echo esc_attr( $tone ); ?>">
			<span class="mkw-dot" aria-hidden="true"></span>
			<strong>
				<?php
				if ( $urgent > 0 ) {
					/* translators: %d: number of critical or high severity changes. */
					echo esc_html( sprintf( _n( '%d important change needs attention', '%d important changes need attention', $urgent, 'mykavo' ), $urgent ) );
				} elseif ( $open > 0 ) {
					/* translators: %d: number of open changes. */
					echo esc_html( sprintf( _n( '%d change to review', '%d changes to review', $open, 'mykavo' ), $open ) );
				} else {
					esc_html_e( 'All clear - nothing needs attention', 'mykavo' );
				}
				?>
			</strong>
		</div>
		<?php
		$audit_url = ! empty( $summary['audit_url'] ) ? (string) $summary['audit_url'] : untrailingslashit( MYKAVO_APP_URL ) . '/dashboard/site-audit';
		if ( isset( $summary['audit'] ) && null !== $summary['audit'] ) {
			/* translators: %d: site audit health score out of 100. */
			echo '<p class="mkw-muted">' . esc_html( sprintf( __( 'Site audit score: %d/100', 'mykavo' ), (int) $summary['audit'] ) ) . '</p>';
		}
		?>
		<p>
			<a class="button button-primary" href="<?php echo esc_url( $page ); ?>"><?php esc_html_e( 'Open MyKavo', 'mykavo' ); ?></a>
			<a class="button" href="<?php echo esc_url( $audit_url ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Site audit', 'mykavo' ); ?></a>
		</p>
		<?php
	}

	/* ---------------------------------------------------------------- extras */

	/**
	 * One-time, dismissible hint after activation - on the Plugins screen
	 * only, and never once the site is connected.
	 *
	 * @return void
	 */
	public static function activation_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'plugins' !== $screen->id || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! get_transient( 'mykavo_just_activated' ) || MyKavo_Connection::is_connected() ) {
			return;
		}
		delete_transient( 'mykavo_just_activated' );
		printf(
			'<div class="notice notice-success is-dismissible"><p><strong>%1$s</strong> %2$s <a href="%3$s">%4$s</a></p></div>',
			esc_html__( 'MyKavo is installed.', 'mykavo' ),
			esc_html__( 'Connect your site to see what changes on it, and whether it matters.', 'mykavo' ),
			esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ),
			esc_html__( 'Connect now', 'mykavo' )
		);
	}

	/**
	 * Critical changes, on every wp-admin screen (except MyKavo's own): read
	 * from the cached summary only, never a remote call. Dismissed per user
	 * until the number of critical changes grows.
	 *
	 * @return void
	 */
	public static function critical_notice() {
		if ( ! MyKavo_Roles::can_view() || ! MyKavo_Connection::is_connected() ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && false !== strpos( (string) $screen->id, self::SLUG ) ) {
			return;
		}
		$summary  = get_transient( MyKavo_Connection::SUMMARY_KEY );
		$critical = is_array( $summary ) ? (int) $summary['critical'] : 0;
		if ( $critical < 1 ) {
			return;
		}
		$dismissed = (int) get_user_meta( get_current_user_id(), 'mykavo_dismissed_critical', true );
		if ( $dismissed >= $critical ) {
			return;
		}
		$dismiss = wp_nonce_url( admin_url( 'admin-post.php?action=mykavo_dismiss_critical&count=' . $critical ), 'mykavo_dismiss_critical' );
		printf(
			'<div class="notice notice-error"><p><strong>%1$s</strong> %2$s <a class="button button-small button-primary" href="%3$s">%4$s</a> <a class="button button-small" href="%5$s">%6$s</a></p></div>',
			esc_html__( 'MyKavo:', 'mykavo' ),
			/* translators: %d: number of critical changes. */
			esc_html( sprintf( _n( '%d critical change on this site needs attention.', '%d critical changes on this site need attention.', $critical, 'mykavo' ), $critical ) ),
			esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ),
			esc_html__( 'Review now', 'mykavo' ),
			esc_url( $dismiss ),
			esc_html__( 'Dismiss', 'mykavo' )
		);
	}

	/**
	 * admin-post: hide the critical notice until there are more critical changes.
	 *
	 * @return void
	 */
	public static function dismiss_critical() {
		if ( ! MyKavo_Roles::can_view() ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'mykavo' ), 403 );
		}
		check_admin_referer( 'mykavo_dismiss_critical' );
		$count = isset( $_GET['count'] ) ? absint( $_GET['count'] ) : 0;
		update_user_meta( get_current_user_id(), 'mykavo_dismissed_critical', $count );
		wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url() );
		exit;
	}

	/**
	 * "Open" / "Connect" link on the Plugins screen.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public static function action_links( $links ) {
		$label = MyKavo_Connection::is_connected() ? __( 'Open', 'mykavo' ) : __( 'Connect', 'mykavo' );
		array_unshift(
			$links,
			sprintf( '<a href="%s">%s</a>', esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ), esc_html( $label ) )
		);
		return $links;
	}
}
