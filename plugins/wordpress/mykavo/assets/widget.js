/**
 * MyKavo Dashboard widget: if the cached summary is stale, refresh it in the
 * background AFTER the Dashboard has rendered - opening the Dashboard never
 * waits on MyKavo.
 */
( function () {
	'use strict';
	var box = document.querySelector( '.mkw[data-stale="1"]' );
	if ( ! box || ! window.wp || ! window.wp.apiFetch ) {
		return;
	}
	var __ = window.wp.i18n.__;
	var _n = window.wp.i18n._n;
	var sprintf = window.wp.i18n.sprintf;

	function esc( value ) {
		var div = document.createElement( 'div' );
		div.textContent = String( value );
		return div.innerHTML;
	}

	window.wp.apiFetch( { path: '/mykavo/v1/overview' } ).then( function ( o ) {
		var by = ( o && o.stats && o.stats.bySeverity ) || {};
		var urgent = ( by.CRITICAL || 0 ) + ( by.HIGH || 0 );
		var open = ( o && o.stats && o.stats.openChanges ) || 0;
		var tone = urgent > 0 ? 'bad' : open > 0 ? 'warn' : 'good';
		var text = urgent > 0
			? sprintf( _n( '%d important change needs attention', '%d important changes need attention', urgent, 'mykavo' ), urgent )
			: open > 0
				? sprintf( _n( '%d change to review', '%d changes to review', open, 'mykavo' ), open )
				: __( 'All clear - nothing needs attention', 'mykavo' );
		box.innerHTML =
			'<div class="mkw-status mkw-' + tone + '"><span class="mkw-dot" aria-hidden="true"></span><strong>' + esc( text ) + '</strong></div>' +
			'<p><a class="button button-primary" href="' + esc( box.getAttribute( 'data-page' ) || '' ) + '">' + esc( __( 'Open MyKavo', 'mykavo' ) ) + '</a></p>';
	} ).catch( function () {
		// Leave the cached state in place; the MyKavo screen explains errors.
	} );
}() );
