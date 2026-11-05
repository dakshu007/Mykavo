<?php
/**
 * The MyKavo panel in the block editor.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * A "MyKavo" panel in the block editor's document sidebar, for
 * administrators and MyKavo viewers only: whether this page is monitored,
 * when MyKavo last checked the site, and the buttons and forms MyKavo watches
 * on it. Before saving, it warns when an edit removes a watched button's
 * text or element, or changes the page title or SEO description.
 *
 * Everything comes from what this site already knows (the page list and the
 * cached summary). Opening the editor never calls MyKavo.
 */
final class MyKavo_Editor {

	/**
	 * Action: enqueue_block_editor_assets.
	 *
	 * @return void
	 */
	public static function enqueue() {
		require_once MYKAVO_DIR . 'includes/class-mykavo-roles.php';
		if ( ! MyKavo_Roles::can_view() || ! get_option( 'mykavo_connection' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'post' !== $screen->base ) {
			return;
		}
		$post = get_post();
		if ( ! $post || ! is_post_type_viewable( $post->post_type ) ) {
			return;
		}
		wp_enqueue_script(
			'mykavo-editor',
			MYKAVO_URL . 'assets/editor.js',
			array( 'wp-plugins', 'wp-element', 'wp-components', 'wp-data', 'wp-i18n', 'wp-edit-post' ),
			MYKAVO_VERSION,
			true
		);
		wp_set_script_translations( 'mykavo-editor', 'mykavo' );
		wp_add_inline_script( 'mykavo-editor', 'window.mykavoEditor = ' . wp_json_encode( self::data( $post ) ) . ';', 'before' );
	}

	/**
	 * What the panel shows for one post.
	 *
	 * @param WP_Post $post Post being edited.
	 * @return array
	 */
	public static function data( $post ) {
		require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
		require_once MYKAVO_DIR . 'includes/class-mykavo-suggestions.php';
		$url       = 'publish' === $post->post_status ? (string) get_permalink( $post ) : '';
		$key       = '' !== $url ? MyKavo_Suggestions::key( $url ) : '';
		$known     = get_option( 'mykavo_known_pages', array() );
		$monitored = false;
		foreach ( is_array( $known ) ? $known : array() as $page ) {
			if ( '' !== $key && MyKavo_Suggestions::key( (string) $page ) === $key ) {
				$monitored = true;
				break;
			}
		}
		$elements = array();
		$all      = get_option( 'mykavo_known_elements', array() );
		foreach ( is_array( $all ) ? $all : array() as $page => $list ) {
			if ( '' !== $key && MyKavo_Suggestions::key( (string) $page ) === $key && is_array( $list ) ) {
				$elements = array_values( $list );
				break;
			}
		}
		$summary = get_transient( MyKavo_Connection::SUMMARY_KEY );
		return array(
			'url'         => $url,
			'monitored'   => $monitored,
			'lastScan'    => is_array( $summary ) && ! empty( $summary['last_scan'] ) ? $summary['last_scan'] : null,
			'open'        => is_array( $summary ) ? (int) $summary['open'] : null,
			'elements'    => $elements,
			'canManage'   => current_user_can( 'manage_options' ),
			'canWatch'    => MyKavo_API::has_feature( 'watchElements' ),
			'screenUrl'   => admin_url( 'admin.php?page=mykavo' ),
			'pricingUrl'  => untrailingslashit( MYKAVO_APP_URL ) . '/pricing',
			'monitorUrl'  => '' !== $url ? wp_nonce_url( admin_url( 'admin-post.php?action=mykavo_monitor&post=' . (int) $post->ID ), 'mykavo_monitor_' . (int) $post->ID ) : '',
			'seoMetaKeys' => array( '_yoast_wpseo_metadesc', 'rank_math_description', '_aioseo_description', '_seopress_titles_desc' ),
		);
	}
}
