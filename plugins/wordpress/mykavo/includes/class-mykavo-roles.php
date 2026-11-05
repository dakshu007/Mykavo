<?php
/**
 * Who may see MyKavo, and who may act on it.
 *
 * @package MyKavo
 */

defined( 'ABSPATH' ) || exit;

/**
 * Two levels:
 *
 * - Manage (administrators, manage_options): everything.
 * - View (the "MyKavo viewer" role, or any user given the mykavo_view
 *   capability): the MyKavo screen, read-only. A viewer cannot approve
 *   changes, run scans, roll back, connect, disconnect or change settings.
 *   Made for agency clients who should see their site's status.
 */
final class MyKavo_Roles {

	const CAP  = 'mykavo_view';
	const ROLE = 'mykavo_viewer';

	/**
	 * Add the viewer role if it is missing. get_role() reads the roles
	 * WordPress already loaded, so calling this costs no query.
	 *
	 * @return void
	 */
	public static function install() {
		if ( ! get_role( self::ROLE ) ) {
			add_role(
				self::ROLE,
				__( 'MyKavo viewer', 'mykavo' ),
				array(
					'read'    => true,
					self::CAP => true,
				)
			);
		}
	}

	/**
	 * Remove the role and the capability everywhere (uninstall).
	 *
	 * @return void
	 */
	public static function remove() {
		remove_role( self::ROLE );
		foreach ( wp_roles()->role_objects as $role ) {
			if ( $role->has_cap( self::CAP ) ) {
				$role->remove_cap( self::CAP );
			}
		}
	}

	/**
	 * Whether the current user may see MyKavo.
	 *
	 * @return bool
	 */
	public static function can_view() {
		return current_user_can( 'manage_options' ) || current_user_can( self::CAP );
	}

	/**
	 * Whether the current user may act (approve, scan, roll back, settings).
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * The capability the admin menu needs: administrators keep
	 * manage_options; viewers get in with mykavo_view.
	 *
	 * @return string
	 */
	public static function menu_cap() {
		return current_user_can( 'manage_options' ) ? 'manage_options' : self::CAP;
	}
}
