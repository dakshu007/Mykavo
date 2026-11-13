<?php
/**
 * Test helper for drafts from MyKavo's AI Blog Writer: fake a connection,
 * collect queued drafts, list what WordPress made, publish one. Mounted only
 * in the local Playground.
 */
require '/wordpress/wp-load.php';
require_once MYKAVO_DIR . 'includes/class-mykavo-connection.php';
require_once MYKAVO_DIR . 'includes/class-mykavo-api.php';
require_once MYKAVO_DIR . 'includes/class-mykavo-drafts.php';
header( 'Content-Type: application/json' );
$do = isset( $_GET['do'] ) ? sanitize_key( $_GET['do'] ) : 'list';
if ( 'connect' === $do ) {
	$token = isset( $_GET['token'] ) ? sanitize_text_field( wp_unslash( $_GET['token'] ) ) : 'mkv_wp_probe';
	update_option( 'mykavo_connection', array( 'token' => $token, 'website_id' => 'web1' ), false );
	echo wp_json_encode( array( 'connected' => null !== MyKavo_Connection::get() ) );
} elseif ( 'collect' === $do ) {
	echo wp_json_encode( array( 'saved' => MyKavo_Drafts::collect() ) );
} elseif ( 'publish' === $do ) {
	$id = isset( $_GET['id'] ) ? absint( $_GET['id'] ) : 0;
	wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) );
	echo wp_json_encode( array( 'url' => get_permalink( $id ) ) );
} else {
	$posts = get_posts( array( 'post_status' => array( 'draft', 'publish' ), 'numberposts' => 10, 'meta_key' => MyKavo_Drafts::META_ID ) );
	$out   = array();
	foreach ( $posts as $p ) {
		$out[] = array(
			'id'      => $p->ID,
			'status'  => $p->post_status,
			'title'   => $p->post_title,
			'slug'    => $p->post_name,
			'excerpt' => $p->post_excerpt,
			'author'  => (int) $p->post_author,
			'chars'   => strlen( $p->post_content ),
			'hasFaq'  => false !== strpos( $p->post_content, 'Frequently asked questions' ),
			'draftId' => get_post_meta( $p->ID, MyKavo_Drafts::META_ID, true ),
			'jsonld'  => strlen( (string) get_post_meta( $p->ID, MyKavo_Drafts::META_JSONLD, true ) ),
		);
	}
	echo wp_json_encode( array( 'posts' => $out, 'notice' => get_option( MyKavo_Drafts::NOTICE_OPTION ) ) );
}
