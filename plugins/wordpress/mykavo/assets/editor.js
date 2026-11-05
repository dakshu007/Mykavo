/**
 * MyKavo for WordPress - the panel in the block editor.
 *
 * Plain JavaScript on the packages the block editor already loads (no build
 * step, no extra download). Shows whether this page is monitored and what
 * MyKavo watches on it, and warns before saving an edit that removes a
 * watched button or changes the page title or SEO description. Never calls
 * MyKavo: everything comes from window.mykavoEditor, printed by the plugin.
 */
( function () {
	'use strict';

	var wp = window.wp;
	var cfg = window.mykavoEditor;
	if ( ! wp || ! cfg || ! wp.plugins || ! wp.element || ! wp.data ) {
		return;
	}
	var el = wp.element.createElement;
	var useState = wp.element.useState;
	var useEffect = wp.element.useEffect;
	var useSelect = wp.data.useSelect;
	var __ = wp.i18n.__;
	var _n = wp.i18n._n;
	var sprintf = wp.i18n.sprintf;
	var Panel = ( wp.editor && wp.editor.PluginDocumentSettingPanel ) || ( wp.editPost && wp.editPost.PluginDocumentSettingPanel );
	if ( ! Panel ) {
		return;
	}
	var LOCK = 'mykavo-watch';

	function text( html ) {
		return String( html || '' ).replace( /<[^>]*>/g, ' ' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
	}

	/** Whether a watched element can be seen in some post content. */
	function present( element, content ) {
		var raw = String( content || '' );
		var sel = String( element.selector || '' );
		var id = /^#([A-Za-z][\w-]*)$/.exec( sel );
		if ( id ) {
			return raw.indexOf( 'id="' + id[ 1 ] + '"' ) !== -1;
		}
		if ( element.text ) {
			return text( raw ).indexOf( String( element.text ).toLowerCase() ) !== -1;
		}
		return null; // Cannot tell from the content alone.
	}

	function ago( iso ) {
		var then = new Date( iso ).getTime();
		if ( ! iso || isNaN( then ) ) {
			return '';
		}
		var mins = Math.round( ( Date.now() - then ) / 60000 );
		if ( mins < 60 ) {
			return sprintf( /* translators: %d: minutes. */ _n( '%d minute ago', '%d minutes ago', mins, 'mykavo' ), mins );
		}
		var hours = Math.round( mins / 60 );
		if ( hours < 48 ) {
			return sprintf( /* translators: %d: hours. */ _n( '%d hour ago', '%d hours ago', hours, 'mykavo' ), hours );
		}
		var days = Math.round( hours / 24 );
		return sprintf( /* translators: %d: days. */ _n( '%d day ago', '%d days ago', days, 'mykavo' ), days );
	}

	function MyKavoPanel() {
		var data = useSelect( function ( select ) {
			var editor = select( 'core/editor' );
			return {
				title: editor.getEditedPostAttribute( 'title' ),
				savedTitle: editor.getCurrentPostAttribute( 'title' ),
				content: editor.getEditedPostContent(),
				savedContent: editor.getCurrentPostAttribute( 'content' ),
				meta: editor.getEditedPostAttribute( 'meta' ) || {},
				savedMeta: editor.getCurrentPostAttribute( 'meta' ) || {},
			};
		}, [] );
		var ackState = useState( '' );
		var ack = ackState[ 0 ];
		var setAck = ackState[ 1 ];

		var warnings = [];
		if ( cfg.monitored ) {
			if ( data.title !== data.savedTitle ) {
				warnings.push( __( 'The page title changes. MyKavo will report it as an SEO change; approve it there after saving.', 'mykavo' ) );
			}
			( cfg.seoMetaKeys || [] ).forEach( function ( key ) {
				if ( data.meta[ key ] !== undefined && data.meta[ key ] !== data.savedMeta[ key ] ) {
					warnings.push( __( 'The SEO description changes. MyKavo will report it; approve it there after saving.', 'mykavo' ) );
				}
			} );
			( cfg.elements || [] ).forEach( function ( item ) {
				// Only elements that are in this post's own content: a button
				// in the theme's header is not affected by editing this page.
				if ( present( item, data.savedContent ) === true && present( item, data.content ) === false ) {
					warnings.push( sprintf( /* translators: %s: element name. */ __( '"%s" is watched by MyKavo and this edit removes it. MyKavo will send a critical alert.', 'mykavo' ), item.name || item.selector ) );
				}
			} );
		}
		var signature = warnings.join( '|' );

		useEffect( function () {
			var editor = wp.data.dispatch( 'core/editor' );
			if ( signature && ack !== signature ) {
				editor.lockPostSaving( LOCK );
			} else {
				editor.unlockPostSaving( LOCK );
			}
			return function () {
				editor.unlockPostSaving( LOCK );
			};
		}, [ signature, ack ] );

		var rows = [];
		rows.push( el( 'p', { key: 'status', style: { margin: '0 0 8px' } },
			el( 'strong', null, cfg.monitored ? __( 'Monitored by MyKavo', 'mykavo' ) : __( 'Not monitored', 'mykavo' ) ),
			cfg.monitored && cfg.lastScan ? el( 'span', { style: { display: 'block', color: '#646970' } }, sprintf( /* translators: %s: relative time. */ __( 'Site last checked %s', 'mykavo' ), ago( cfg.lastScan ) ) ) : null
		) );
		if ( ! cfg.monitored && cfg.canManage && cfg.monitorUrl ) {
			rows.push( el( 'p', { key: 'monitor' }, el( 'a', { className: 'components-button is-secondary', href: cfg.monitorUrl }, __( 'Monitor this page', 'mykavo' ) ) ) );
		} else if ( ! cfg.monitored && ! cfg.url ) {
			rows.push( el( 'p', { key: 'draft', style: { color: '#646970' } }, __( 'Publish the page to monitor it.', 'mykavo' ) ) );
		}
		if ( cfg.monitored ) {
			if ( cfg.elements && cfg.elements.length ) {
				rows.push( el( 'p', { key: 'el-head', style: { margin: '12px 0 4px', fontWeight: 600 } }, __( 'Watched on this page', 'mykavo' ) ) );
				rows.push( el( 'ul', { key: 'el-list', style: { margin: 0, paddingLeft: '18px', listStyle: 'disc' } }, cfg.elements.map( function ( item, i ) {
					return el( 'li', { key: i }, item.name || item.selector, item.text ? el( 'span', { style: { color: '#646970' } }, ' "' + item.text + '"' ) : null );
				} ) ) );
			} else if ( ! cfg.canWatch ) {
				rows.push( el( 'p', { key: 'upsell', style: { color: '#646970' } },
					__( 'Get an alert when a buy button or form on this page disappears.', 'mykavo' ), ' ',
					el( 'a', { href: cfg.pricingUrl, target: '_blank', rel: 'noopener noreferrer' }, __( 'Watch this button (paid)', 'mykavo' ) )
				) );
			} else {
				rows.push( el( 'p', { key: 'pick', style: { color: '#646970' } },
					__( 'Nothing watched on this page yet.', 'mykavo' ), ' ',
					el( 'a', { href: cfg.screenUrl }, __( 'Pick a button on the Pages tab', 'mykavo' ) )
				) );
			}
		}
		if ( warnings.length ) {
			rows.push( el( 'div', { key: 'warn', className: 'mykavo-editor-warn', style: { marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: '#FFE1D6', color: '#151515' } },
				el( 'strong', { style: { display: 'block', marginBottom: '4px' } }, __( 'Before you save', 'mykavo' ) ),
				el( 'ul', { style: { margin: '0 0 8px', paddingLeft: '18px', listStyle: 'disc' } }, warnings.map( function ( w, i ) {
					return el( 'li', { key: i }, w );
				} ) ),
				ack === signature
					? el( 'span', null, __( 'Saving is allowed.', 'mykavo' ) )
					: el( 'button', { type: 'button', className: 'components-button is-secondary', onClick: function () {
						setAck( signature );
					} }, __( 'I understand, allow saving', 'mykavo' ) )
			) );
		}
		rows.push( el( 'p', { key: 'open', style: { margin: '12px 0 0' } }, el( 'a', { href: cfg.screenUrl }, __( 'Open MyKavo', 'mykavo' ) ) ) );
		return el( Panel, { name: 'mykavo', title: __( 'MyKavo', 'mykavo' ), className: 'mykavo-panel' }, rows );
	}

	wp.plugins.registerPlugin( 'mykavo', { render: MyKavoPanel, icon: null } );
}() );
