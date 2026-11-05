<?php
/**
 * Multisite: every site's MyKavo status on one Network Admin screen.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * On a multisite network, Network Admin > MyKavo lists each site with its
 * MyKavo status, read from the summary each site already keeps (the one its
 * admin menu badge uses), with a link to that site's MyKavo screen. Nothing
 * is fetched from MyKavo to draw it, so it costs one small read per site.
 * Free: it only reads data stored on this network.
 */
final class MyKavo_Network {

	const SLUG     = 'mykavo-network';
	const PER_PAGE = 100;

	/**
	 * Action: network_admin_menu.
	 *
	 * @return void
	 */
	public static function menu() {
		add_menu_page(
			__( 'MyKavo', 'mykavo' ),
			__( 'MyKavo', 'mykavo' ),
			'manage_network_options',
			self::SLUG,
			array( __CLASS__, 'render' ),
			'dashicons-visibility'
		);
	}

	/**
	 * The status of each site.
	 *
	 * @return array
	 */
	public static function rows() {
		$rows = array();
		foreach ( get_sites(
			array(
				'number'   => self::PER_PAGE,
				'archived' => 0,
				'deleted'  => 0,
			)
		) as $site ) {
			switch_to_blog( (int) $site->blog_id );
			$connected = (bool) get_option( 'mykavo_connection' );
			$summary   = get_transient( 'mykavo_summary' );
			$rows[]    = array(
				'id'        => (int) $site->blog_id,
				'name'      => wp_strip_all_tags( (string) get_bloginfo( 'name' ) ),
				'url'       => home_url( '/' ),
				'screen'    => admin_url( 'admin.php?page=mykavo' ),
				'connected' => $connected,
				'summary'   => is_array( $summary ) ? $summary : null,
			);
			restore_current_blog();
		}
		return $rows;
	}

	/**
	 * The screen.
	 *
	 * @return void
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_network_options' ) ) {
			return;
		}
		$rows = self::rows();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'MyKavo across the network', 'mykavo' ); ?></h1>
			<p><?php esc_html_e( 'The status each site last showed on its own MyKavo screen. Connect a site from its own dashboard.', 'mykavo' ); ?></p>
			<table class="widefat striped">
				<thead><tr>
					<th><?php esc_html_e( 'Site', 'mykavo' ); ?></th>
					<th><?php esc_html_e( 'Status', 'mykavo' ); ?></th>
					<th><?php esc_html_e( 'Open changes', 'mykavo' ); ?></th>
					<th><?php esc_html_e( 'Last scan', 'mykavo' ); ?></th>
					<th></th>
				</tr></thead>
				<tbody>
				<?php foreach ( $rows as $row ) : ?>
					<?php
					$summary = $row['summary'];
					$urgent  = $summary ? (int) $summary['critical'] + (int) $summary['high'] : 0;
					if ( ! $row['connected'] ) {
						$status = __( 'Not connected', 'mykavo' );
						$color  = '#646970';
					} elseif ( ! $summary ) {
						$status = __( 'Connected - open its MyKavo screen to load the status', 'mykavo' );
						$color  = '#646970';
					} elseif ( 'down' === $summary['health'] ) {
						$status = __( 'Down', 'mykavo' );
						$color  = '#b32d2e';
					} elseif ( $urgent > 0 ) {
						/* translators: %d: number of important changes. */
						$status = sprintf( _n( '%d important change', '%d important changes', $urgent, 'mykavo' ), $urgent );
						$color  = '#b32d2e';
					} else {
						$status = __( 'All clear', 'mykavo' );
						$color  = '#00a32a';
					}
					?>
					<tr>
						<td><strong><?php echo esc_html( $row['name'] ); ?></strong><br><a href="<?php echo esc_url( $row['url'] ); ?>"><?php echo esc_html( $row['url'] ); ?></a></td>
						<td><span style="color:<?php echo esc_attr( $color ); ?>;font-weight:600"><?php echo esc_html( $status ); ?></span></td>
						<td><?php echo $summary ? esc_html( (string) (int) $summary['open'] ) : '&ndash;'; ?></td>
						<td><?php echo $summary && ! empty( $summary['last_scan'] ) ? esc_html( human_time_diff( (int) strtotime( (string) $summary['last_scan'] ) ) . ' ' . __( 'ago', 'mykavo' ) ) : '&ndash;'; ?></td>
						<td><a class="button" href="<?php echo esc_url( $row['screen'] ); ?>"><?php echo esc_html( $row['connected'] ? __( 'Open MyKavo', 'mykavo' ) : __( 'Connect', 'mykavo' ) ); ?></a></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<?php if ( count( $rows ) >= self::PER_PAGE ) : ?>
				<p class="description"><?php esc_html_e( 'Showing the first 100 sites.', 'mykavo' ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}
}
