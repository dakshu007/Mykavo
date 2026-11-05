/**
 * MyKavo for Shopify - the embedded admin screen.
 *
 * GENERATED from the WordPress plugin's assets/app.js by
 * apps/web/scripts/shopify-app.mjs - edit that script or the plugin, never
 * this file. bootstrap.js supplies wp.i18n and wp.apiFetch stand-ins that
 * talk to mykavo.app with the App Bridge session token.
 */
( function () {
	'use strict';

	var i18n = window.wp.i18n;
	var __ = i18n.__;
	var _n = i18n._n;
	var sprintf = i18n.sprintf;
	var apiFetch = window.wp.apiFetch;
	var cfg = window.mykavoConfig || {};
	var root = document.getElementById( 'mykavo-app' );
	if ( ! root ) {
		return;
	}

	var SEVERITIES = [ 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO' ];
	var POLL_MS = 8000;

	var state = {
		connected: !! cfg.connected,
		tab: 'overview',
		overview: null,
		overviewError: null,
		changes: null,
		changesStatus: 'open',
		changesError: null,
		severity: '',
		scans: null,
		scansError: null,
		pages: null,
		pagesError: null,
		updates: null,
		updatesError: null,
		bots: null,
		botsError: null,
		features: null,
		robots: null,
		robotsError: null,
		aiHistory: null,
		aiHistoryError: null,
		health: null,
		healthError: null,
		guard: null,
		win: null,
		winError: null,
		winEdit: null,
		changesScan: null,
		addUrl: '',
		banner: bannerFromNotice( cfg.notice ),
		menuOpen: false,
		busy: '',
		drawer: null,
		// 1.3.0.
		alerts: null,
		safe: null,
		safeRun: null,
		safeBaseline: true,
		snaps: null,
		suggestions: null,
		sugPick: {},
		llms: null,
		redirects: null,
		redirectDraft: {},
		redirectSuggest: null,
		forms: null,
		reports: null,
		reportsError: null,
		brandDraft: null,
	};
	var pollTimer = null;
	var pollCount = 0;
	var lastFocus = null;

	/* ------------------------------------------------------------ helpers -- */

	function esc( value ) {
		return String( value === null || value === undefined ? '' : value )
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}

	/** Only http(s) URLs ever reach an href or src. */
	function safeUrl( value ) {
		try {
			var url = new URL( String( value ) );
			return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
		} catch ( e ) {
			return '';
		}
	}

	function hostOf( value ) {
		try {
			return new URL( String( value ) ).host;
		} catch ( e ) {
			return '';
		}
	}

	function pathOf( value ) {
		try {
			var url = new URL( String( value ) );
			return url.pathname + url.search;
		} catch ( e ) {
			return String( value || '' );
		}
	}

	var locale = document.documentElement.lang || 'en';
	var relFmt = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat( locale, { numeric: 'auto' } ) : null;

	function rel( iso ) {
		if ( ! iso ) {
			return '';
		}
		var then = new Date( iso ).getTime();
		if ( isNaN( then ) ) {
			return '';
		}
		var diff = ( then - Date.now() ) / 1000;
		var abs = Math.abs( diff );
		var units = [
			[ 60, 'second', 1 ],
			[ 3600, 'minute', 60 ],
			[ 86400, 'hour', 3600 ],
			[ 604800, 'day', 86400 ],
			[ 2629800, 'week', 604800 ],
			[ 31557600, 'month', 2629800 ],
			[ Infinity, 'year', 31557600 ],
		];
		for ( var i = 0; i < units.length; i++ ) {
			if ( abs < units[ i ][ 0 ] ) {
				var n = Math.round( diff / units[ i ][ 2 ] );
				return relFmt ? relFmt.format( n, units[ i ][ 1 ] ) : new Date( iso ).toLocaleString();
			}
		}
		return '';
	}

	function when( iso ) {
		if ( ! iso ) {
			return '';
		}
		var d = new Date( iso );
		return isNaN( d.getTime() ) ? '' : d.toLocaleString( locale, { dateStyle: 'medium', timeStyle: 'short' } );
	}

	function severityLabel( sev ) {
		return {
			CRITICAL: __( 'Critical', 'mykavo' ),
			HIGH: __( 'High', 'mykavo' ),
			MEDIUM: __( 'Medium', 'mykavo' ),
			LOW: __( 'Low', 'mykavo' ),
			INFO: __( 'Info', 'mykavo' ),
		}[ sev ] || sev;
	}

	function categoryLabel( cat ) {
		return {
			AVAILABILITY: __( 'Availability', 'mykavo' ),
			VISUAL: __( 'Visual', 'mykavo' ),
			SEO: __( 'SEO', 'mykavo' ),
			CONTENT: __( 'Content', 'mykavo' ),
			LINKS: __( 'Links', 'mykavo' ),
			SCRIPT: __( 'Scripts', 'mykavo' ),
			PERFORMANCE: __( 'Performance', 'mykavo' ),
			CONVERSION: __( 'Conversion', 'mykavo' ),
		}[ cat ] || cat;
	}

	function statusLabel( status ) {
		return {
			NEW: __( 'New', 'mykavo' ),
			REVIEWED: __( 'Reviewed', 'mykavo' ),
			APPROVED: __( 'Approved', 'mykavo' ),
			RESOLVED: __( 'Resolved', 'mykavo' ),
			IGNORED: __( 'Ignored', 'mykavo' ),
			QUEUED: __( 'Queued', 'mykavo' ),
			RUNNING: __( 'Running', 'mykavo' ),
			COMPLETED: __( 'Completed', 'mykavo' ),
			PARTIAL: __( 'Partial', 'mykavo' ),
			FAILED: __( 'Failed', 'mykavo' ),
		}[ status ] || status;
	}

	function triggerLabel( trigger ) {
		return {
			BASELINE: __( 'Baseline', 'mykavo' ),
			SCHEDULED: __( 'Scheduled', 'mykavo' ),
			MANUAL: __( 'Manual', 'mykavo' ),
			DEPLOY: __( 'Theme check', 'mykavo' ),
		}[ trigger ] || trigger;
	}

	function sevPill( sev ) {
		return sev ? '<span class="mk-sev mk-sev-' + esc( sev ) + '">' + esc( severityLabel( sev ) ) + '</span>' : '';
	}

	var ICONS = {
		mark: '<svg viewBox="-150 -150 1900 1900" fill="currentColor" aria-hidden="true"><path d="M118 1598C58 1588 12 1543 2 1484C0 1473 0 1465 0 1158C0 884 0 844 2 844C2 844 4 844 5 845C6 846 21 850 38 855C56 860 74 866 79 867C84 869 101 874 117 878C133 883 158 891 174 895C206 905 215 908 228 915C251 926 271 942 288 962C291 966 316 999 342 1036C369 1072 403 1120 418 1142C434 1163 460 1198 476 1220C491 1242 507 1264 510 1269C518 1279 632 1437 654 1468C663 1481 672 1493 674 1496C676 1498 684 1509 692 1520C699 1531 715 1552 727 1568C738 1584 748 1598 748 1599C750 1601 129 1600 118 1598ZM1008 1598C1001 1594 1000 1593 949 1522C912 1469 716 1195 589 1016C500 893 462 839 459 832C456 827 454 820 453 817C451 808 451 787 453 779C457 766 456 768 555 629C584 589 623 534 710 412C769 330 915 126 932 102C939 92 954 72 964 56C984 30 998 11 1003 5C1007 1 1010 0 1016 0C1021 0 1022 1 1026 4C1032 8 1038 16 1040 22C1042 31 1042 38 1037 50C1031 64 1016 94 1002 120C997 130 962 198 925 269C888 340 854 405 850 414C836 441 815 480 805 500C799 512 791 528 786 537C774 560 768 572 768 573C769 573 799 556 837 534C874 513 919 487 937 477C955 467 1025 427 1093 388C1241 304 1240 304 1246 303C1252 302 1257 304 1263 310C1270 317 1272 324 1272 337C1272 346 1272 348 1270 353C1264 364 1260 368 1220 400C1210 409 1188 426 1172 439C1134 471 1038 550 936 634C891 672 852 703 851 704L849 707L853 707C856 708 875 709 896 711C917 713 946 715 960 716C973 717 1032 722 1090 726C1220 737 1387 750 1420 753C1434 754 1450 755 1457 756C1464 757 1490 759 1514 760C1585 766 1584 766 1591 774C1597 780 1599 788 1600 800C1600 814 1597 822 1590 829C1583 836 1586 836 1506 842C1477 844 1440 847 1424 848C1407 850 1374 853 1350 854C1325 856 1297 859 1288 860C1278 860 1258 862 1244 863C1231 864 1186 868 1144 871C1102 874 1063 878 1056 878C1008 882 975 884 940 888C886 892 864 894 856 894C853 894 850 894 850 895C849 896 858 903 916 952C929 961 962 989 990 1012C1056 1066 1236 1215 1250 1226C1267 1240 1272 1248 1273 1262C1274 1277 1269 1289 1260 1296C1256 1298 1255 1298 1249 1298C1242 1298 1241 1298 1232 1293C1228 1291 1144 1243 1048 1188C791 1041 768 1028 767 1028C767 1028 770 1035 775 1044C780 1052 786 1066 790 1073C794 1080 800 1092 804 1098C807 1105 813 1117 817 1124C821 1131 833 1155 844 1176C855 1198 867 1221 870 1228C874 1234 886 1258 898 1280C909 1302 921 1324 924 1330C930 1342 940 1361 949 1379C962 1403 983 1444 990 1458C994 1465 1000 1477 1004 1486C1009 1494 1015 1506 1019 1513C1038 1547 1040 1554 1040 1567C1040 1580 1035 1590 1027 1596C1021 1600 1013 1601 1008 1598ZM0 442C0 135 0 127 2 116C7 87 20 62 41 41C58 24 76 13 98 6C119 0 96 0 439 0L749 0L721 40C659 125 625 173 591 220C572 246 524 312 486 365C448 418 389 500 355 546C321 593 291 634 288 638C266 663 240 682 210 693C206 695 171 706 132 717C93 729 48 742 32 747C15 752 2 756 1 756C0 756 0 651 0 442Z"/></svg>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
		eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
		refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
		external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
		chevron: '<path d="m9 18 6-6-6-6"/>',
		arrow: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
		right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
		x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
		activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
		gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
		lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
		file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
		layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
		bell: '<path d="M10.27 21a2 2 0 0 0 3.46 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>',
		zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
		image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
		link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
		unplug: '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>',
		loader: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
		clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
		shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
		plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
		brush: '<path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/>',
		bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
		wp: '<circle cx="12" cy="12" r="10"/><path d="M3.5 8.5 8 20l3-8.5"/><path d="M9 8.5h5"/><path d="M11.5 8.5 16 20l4.5-11.5"/>',
		undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
		copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
		puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
	};

	function icon( name, cls ) {
		if ( name === 'mark' ) {
			return ICONS.mark;
		}
		return (
			'<svg class="' + ( cls || '' ) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			( ICONS[ name ] || '' ) +
			'</svg>'
		);
	}

	function errorMessage( err ) {
		if ( err && typeof err.message === 'string' && err.message ) {
			return err.message;
		}
		return __( 'Something went wrong. Try again in a moment.', 'mykavo' );
	}

	function isDisconnected( err ) {
		return !! err && err.code === 'mykavo_not_connected';
	}

	function bannerFromNotice( notice ) {
		switch ( notice ) {
			case 'connected':
				return { tone: 'good', text: __( 'Connected. MyKavo will now show this site\'s monitoring right here in WordPress.', 'mykavo' ) };
			case 'cancelled':
				return { tone: 'neutral', text: __( 'Connection cancelled. Nothing was changed.', 'mykavo' ) };
			case 'expired':
				return { tone: 'bad', text: __( 'That connect link expired. Press Connect to try again.', 'mykavo' ) };
			case 'stale':
				return { tone: 'neutral', text: __( 'That Connect button had been open a long time and expired. Press Connect again - it only takes a moment.', 'mykavo' ) };
			case 'failed':
				return { tone: 'bad', text: __( 'Could not finish connecting to MyKavo. Check that this server can make outbound HTTPS requests, then try again.', 'mykavo' ) };
			default:
				return null;
		}
	}

	function toast( text ) {
		var old = document.querySelector( '.mk-toast' );
		if ( old ) {
			old.remove();
		}
		var el = document.createElement( 'div' );
		el.className = 'mk-toast';
		el.setAttribute( 'role', 'status' );
		el.innerHTML = icon( 'check' ) + '<span>' + esc( text ) + '</span>';
		document.body.appendChild( el );
		window.setTimeout( function () {
			el.remove();
		}, 3600 );
	}

	/* ---------------------------------------------------------------- data -- */

	function api( path, options ) {
		return apiFetch( Object.assign( { path: '/mykavo/v1' + path }, options || {} ) );
	}

	function handleDisconnect( err ) {
		if ( isDisconnected( err ) ) {
			state.connected = false;
			state.overview = null;
			state.banner = { tone: 'bad', text: err.message };
			stopPolling();
			render();
			return true;
		}
		return false;
	}

	/**
	 * Keep the admin-menu badge in step with what is on screen. WordPress
	 * draws the menu before the first overview arrives, so without this the
	 * badge would lag one page load behind.
	 */
	function syncMenuBadge( data ) {
		var name = document.querySelector( '#toplevel_page_mykavo .wp-menu-name' );
		if ( ! name || ! data || ! data.stats ) {
			return;
		}
		var urgent = data.stats.bySeverity.CRITICAL + data.stats.bySeverity.HIGH;
		var old = name.querySelector( '.awaiting-mod' );
		if ( old ) {
			old.remove();
		}
		if ( urgent > 0 ) {
			var badge = document.createElement( 'span' );
			badge.className = 'awaiting-mod count-' + urgent;
			badge.innerHTML = '<span class="pending-count" aria-hidden="true">' + esc( urgent ) + '</span>';
			name.appendChild( document.createTextNode( ' ' ) );
			name.appendChild( badge );
		}
	}

	function loadOverview( fresh ) {
		return api( '/overview' + ( fresh ? '?fresh=1' : '' ) )
			.then( function ( data ) {
				state.overview = data;
				state.overviewError = null;
				syncMenuBadge( data );
				render();
				schedulePoll();
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.overviewError = errorMessage( err );
					render();
				}
			} );
	}

	function loadChanges() {
		state.changes = null;
		state.changesError = null;
		render();
		var query = state.changesScan
			? '/changes?status=all&scan=' + encodeURIComponent( state.changesScan.id )
			: '/changes?status=' + state.changesStatus;
		return api( query )
			.then( function ( data ) {
				state.changes = data;
				render();
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.changesError = errorMessage( err );
					render();
				}
			} );
	}

	function loadScans( fresh ) {
		return api( '/scans' + ( fresh ? '?fresh=1' : '' ) )
			.then( function ( data ) {
				state.scans = data;
				render();
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.scansError = errorMessage( err );
					render();
				}
			} );
	}

	function loadPages() {
		return api( '/pages' )
			.then( function ( data ) {
				state.pages = data;
				render();
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.pagesError = errorMessage( err );
					render();
				}
			} );
	}

	function loadUpdates() {
		return api( '/updates' )
			.then( function ( data ) {
				state.updates = data;
				state.updatesError = null;
				render();
			} )
			.catch( function ( err ) {
				state.updatesError = errorMessage( err );
				render();
			} );
	}

	function setUpdateChecks( enabled ) {
		api( '/updates', { method: 'POST', data: { enabled: enabled } } ).then( function ( data ) {
			state.updates = data;
			toast( enabled ? __( 'Theme checks are on.', 'mykavo' ) : __( 'Theme checks are off.', 'mykavo' ) );
			render();
		} );
	}

	function loadBots() {
		return api( '/bots' )
			.then( function ( data ) {
				state.bots = data;
				state.botsError = null;
				render();
			} )
			.catch( function ( err ) {
				state.botsError = errorMessage( err );
				render();
			} );
	}

	function setBotCounting( enabled ) {
		api( '/bots', { method: 'POST', data: { enabled: enabled } } ).then( function ( data ) {
			state.bots = data;
			toast( enabled ? __( 'Counting AI crawler visits.', 'mykavo' ) : __( 'AI crawler counting is off.', 'mykavo' ) );
			render();
		} );
	}

	/* ------------------------------------------------- plan features -- */

	/** Whether this site's MyKavo plan includes a feature. Unknown is no. */
	function feat() {
		return false;
	}

	function errorReason( err ) {
		return err && err.data && err.data.reason ? String( err.data.reason ) : '';
	}

	function loadFeatures( fresh ) {
		return api( '/features' + ( fresh ? '?fresh=1' : '' ) )
			.then( function ( data ) {
				state.features = data && data.features ? data.features : {};
			} )
			.catch( function () {
				// The free version of every screen still works.
				state.features = {};
			} )
			.then( function () {
				render();
				loadTab();
			} );
	}

	function loadRobots() {
		return api( '/robots' )
			.then( function ( data ) {
				state.robots = data;
				state.robotsError = null;
				render();
			} )
			.catch( function ( err ) {
				state.robotsError = errorMessage( err );
				render();
			} );
	}

	function setRobots( enabled ) {
		state.busy = 'robots';
		render();
		api( '/robots', { method: 'POST', data: { enabled: enabled } } )
			.then( function ( data ) {
				state.robots = data;
				toast( enabled
					? __( 'robots.txt now asks AI training crawlers to stay away.', 'mykavo' )
					: __( 'The AI crawler rules were removed from robots.txt.', 'mykavo' ) );
			} )
			.catch( function ( err ) {
				state.banner = { tone: 'bad', text: errorMessage( err ) };
			} )
			.then( function () {
				state.busy = '';
				render();
			} );
	}

	function loadAiHistory() {
		state.aiHistoryError = null;
		return api( '/ai-history' )
			.then( function ( data ) {
				state.aiHistory = data;
				render();
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.aiHistoryError = errorMessage( err );
					render();
				}
			} );
	}

	function loadHealth( fresh ) {
		state.healthError = null;
		if ( fresh ) {
			state.busy = 'health';
			render();
		}
		return api( '/plugin-health' + ( fresh ? '?fresh=1' : '' ) )
			.then( function ( data ) {
				state.health = data;
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.healthError = errorMessage( err );
				}
			} )
			.then( function () {
				state.busy = state.busy === 'health' ? '' : state.busy;
				render();
			} );
	}

	function loadWindow() {
		state.winError = null;
		return api( '/update-window' )
			.then( function ( data ) {
				state.win = data;
				render();
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.winError = errorMessage( err );
					render();
				}
			} );
	}

	function saveWindow( win ) {
		state.busy = 'window';
		render();
		api( '/update-window', { method: 'POST', data: { window: win } } )
			.then( function ( data ) {
				state.win = data;
				state.winEdit = null;
				toast( data.allowed ? __( 'Update window saved.', 'mykavo' ) : __( 'Update windows are not included in this plan.', 'mykavo' ) );
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.banner = { tone: 'bad', text: errorMessage( err ) };
				}
			} )
			.then( function () {
				state.busy = '';
				render();
			} );
	}

	function setAutoRollback( enabled ) {
		api( '/updates', { method: 'POST', data: { autoRollback: enabled } } ).then( function ( data ) {
			state.updates = data;
			toast( enabled ? __( 'Automatic rollback is on.', 'mykavo' ) : __( 'Automatic rollback is off.', 'mykavo' ) );
			render();
		} );
	}

	function rollback() {}

	function guardCheckout() {
		state.busy = 'guard';
		render();
		api( '/checkout-guard', { method: 'POST' } )
			.then( function ( data ) {
				state.guard = data;
				if ( data && data.allowed ) {
					toast( __( 'Checkout guard is on. MyKavo alerts you when a store button goes missing.', 'mykavo' ) );
					state.pages = null;
					loadPages();
					loadOverview( true );
				}
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					if ( errorReason( err ) === 'PLAN' ) {
						state.guard = { allowed: false };
					} else {
						state.banner = { tone: 'bad', text: errorMessage( err ) };
					}
				}
			} )
			.then( function () {
				state.busy = '';
				render();
			} );
	}

	/** While a scan runs, refresh quietly - only while the tab is visible. */
	function schedulePoll() {
		stopPolling();
		var running = state.overview && state.overview.scanInProgress;
		if ( ! running || pollCount > 90 ) {
			return;
		}
		pollTimer = window.setTimeout( function () {
			if ( document.hidden ) {
				schedulePoll();
				return;
			}
			pollCount++;
			var wasRunning = !! ( state.overview && state.overview.scanInProgress );
			loadOverview( true ).then( function () {
				if ( wasRunning && state.overview && ! state.overview.scanInProgress ) {
					state.changes = null;
					state.scans = null;
					state.pages = null;
					toast( __( 'Scan finished.', 'mykavo' ) );
					loadUpdates();
					if ( state.tab === 'scans' || state.tab === 'updates' ) {
						// Exactly one, uncached: a cached copy could still say "running".
						loadScans( true );
					} else {
						loadTab();
					}
				}
			} );
		}, POLL_MS );
	}

	function stopPolling() {
		if ( pollTimer ) {
			window.clearTimeout( pollTimer );
			pollTimer = null;
		}
	}

	function loadTab() {
		if ( state.tab === 'overview' ) {
			// The store card on the overview lists monitored pages.
			if ( cfg.woo && cfg.woo.pages && cfg.woo.pages.length && ! state.pages ) {
				loadPages();
			}
		} else if ( state.tab === 'changes' && ! state.changes ) {
			loadChanges();
		} else if ( state.tab === 'scans' && ! state.scans ) {
			loadScans();
		} else if ( state.tab === 'pages' && ! state.pages ) {
			loadPages();
		} else if ( state.tab === 'bots' ) {
			loadBots();
			if ( ! state.robots ) {
				loadRobots();
			}
			if ( feat( 'aiInsights' ) && ! state.aiHistory && ! state.aiHistoryError ) {
				loadAiHistory();
			}
		} else if ( state.tab === 'updates' ) {
			if ( ! state.updates ) {
				loadUpdates();
			}
			if ( ! state.scans ) {
				loadScans();
			}
			if ( feat( 'pluginHealth' ) && ! state.health && ! state.healthError ) {
				loadHealth( false );
			}
			if ( feat( 'updateWindows' ) && ! state.win && ! state.winError ) {
				loadWindow();
			}
		}
		loadExtras();
	}

	/* ------------------------------------------------------------- actions -- */

	function runScan() {
		state.busy = 'scan';
		render();
		api( '/scans', { method: 'POST' } )
			.then( function () {
				toast( __( 'Scan started. Results appear here as pages finish.', 'mykavo' ) );
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.banner = { tone: 'bad', text: errorMessage( err ) };
				}
			} )
			.then( function () {
				state.busy = '';
				pollCount = 0;
				return loadOverview( true );
			} );
	}

	function openChange( id ) {
		lastFocus = document.activeElement;
		state.drawer = { id: id, data: null, error: null, mode: 'compare', busy: '' };
		renderDrawer();
		api( '/changes/' + encodeURIComponent( id ) )
			.then( function ( data ) {
				if ( state.drawer && state.drawer.id === id ) {
					state.drawer.data = data.change;
					var images = data.change.images || {};
					state.drawer.mode = images.before && images.after ? 'compare' : images.after ? 'after' : images.diff ? 'diff' : 'compare';
					renderDrawer();
				}
			} )
			.catch( function ( err ) {
				if ( handleDisconnect( err ) ) {
					closeDrawer();
					return;
				}
				if ( state.drawer && state.drawer.id === id ) {
					state.drawer.error = errorMessage( err );
					renderDrawer();
				}
			} );
	}

	function closeDrawer() {
		state.drawer = null;
		renderDrawer();
		if ( lastFocus && document.body.contains( lastFocus ) ) {
			lastFocus.focus();
		}
	}

	var ACTION_TOASTS = {
		review: __( 'Marked as reviewed.', 'mykavo' ),
		approve: __( 'Change approved.', 'mykavo' ),
		ignore: __( 'Change ignored.', 'mykavo' ),
		resolve: __( 'Marked as resolved.', 'mykavo' ),
		reopen: __( 'Change reopened.', 'mykavo' ),
		baseline: __( 'New baseline saved. Future scans compare against the page as it is now.', 'mykavo' ),
	};

	function changeAction( action ) {
		var drawer = state.drawer;
		if ( ! drawer || ! drawer.data || drawer.busy ) {
			return;
		}
		drawer.busy = action;
		renderDrawer();
		var id = encodeURIComponent( drawer.id );
		var request = action === 'baseline'
			? api( '/changes/' + id + '/baseline', { method: 'POST' } )
			: api( '/changes/' + id + '/action', { method: 'POST', data: { action: action } } );
		request
			.then( function () {
				toast( ACTION_TOASTS[ action ] );
				closeDrawer();
				state.changes = null;
				state.pages = null;
				loadOverview( true );
				loadTab();
			} )
			.catch( function ( err ) {
				if ( handleDisconnect( err ) ) {
					closeDrawer();
					return;
				}
				if ( state.drawer ) {
					state.drawer.busy = '';
					state.drawer.error = errorMessage( err );
					renderDrawer();
				}
			} );
	}

	function disconnect() {
		if ( ! state.confirmDisconnect ) {
			state.confirmDisconnect = true;
			toast( __( 'Press Disconnect again to confirm. Monitoring keeps running in MyKavo.', 'mykavo' ) );
			render();
			return;
		}
		state.confirmDisconnect = false;
		state.menuOpen = false;
		api( '/disconnect', { method: 'POST' } ).then( function () {
			state.connected = false;
			state.overview = null;
			state.changes = null;
			state.scans = null;
			state.pages = null;
			state.features = null;
			state.aiHistory = null;
			state.health = null;
			state.win = null;
			state.guard = null;
			stopPolling();
			window.location.reload();
		} );
	}

	/* ------------------------------------------------------------ rendering -- */

	function banner() {
		if ( ! state.banner ) {
			return '';
		}
		var tone = state.banner.tone === 'good' ? ' mk-banner-good' : state.banner.tone === 'bad' ? ' mk-banner-bad' : '';
		return (
			'<div class="mk-banner' + tone + '" role="status">' +
			icon( state.banner.tone === 'good' ? 'check' : 'alert' ) +
			'<span>' + esc( state.banner.text ) + '</span>' +
			'<button type="button" class="mk-btn mk-btn-quiet mk-btn-sm" data-act="dismiss-banner" aria-label="' + esc( __( 'Dismiss', 'mykavo' ) ) + '">' + icon( 'x' ) + '</button>' +
			'</div>'
		);
	}

	function brand() {
		return '<span class="mk-brand">' + icon( 'mark' ) + '<span>MyKavo</span></span>';
	}

	function welcome() {
		var site = cfg.site || {};
		var rows = [
			[ 'CRITICAL', __( 'Page changed from index to noindex', 'mykavo' ), '/pricing' ],
			[ 'HIGH', __( '"Add to cart" button is missing', 'mykavo' ), '/shop' ],
			[ 'MEDIUM', __( 'Title tag changed', 'mykavo' ), '/' ],
			[ 'LOW', __( 'Hero image changed', 'mykavo' ), '/about' ],
		];
		return (
			'<div class="mk-top">' + brand() + '</div>' +
			banner() +
			'<section class="mk-card mk-welcome">' +
			'<div class="mk-welcome-copy">' +
			'<p class="mk-eyebrow">' + esc( __( 'Website change monitoring', 'mykavo' ) ) + '</p>' +
			'<h2>' + esc( __( 'Know what changed.', 'mykavo' ) ) + '<br><span class="mk-mark"><span>' + esc( __( 'Fix what matters.', 'mykavo' ) ) + '</span></span></h2>' +
			'<p class="mk-welcome-lead">' +
			esc( sprintf(
				/* translators: %s: site name. */
				__( 'MyKavo scans the pages that matter on %s and tells you when something important changes or breaks - with before-and-after screenshots, right here in Shopify.', 'mykavo' ),
				site.name || __( 'your store', 'mykavo' )
			) ) +
			'</p>' +
			'<ul class="mk-benefits">' +
			benefit( 'shield', __( 'Change your theme without fear', 'mykavo' ), __( 'When your live theme is published or edited, MyKavo checks your store - and names the change if something broke.', 'mykavo' ) ) +
			benefit( 'image', __( 'See exactly what changed', 'mykavo' ), __( 'Before-and-after screenshots and values for every change.', 'mykavo' ) ) +
			benefit( 'alert', __( 'Only what matters', 'mykavo' ), __( 'Changes ranked Critical to Info. Ads and noise are filtered out.', 'mykavo' ) ) +
			benefit( 'check', __( 'Approve in one click', 'mykavo' ), __( 'Accept intentional changes as the new baseline, ignore the rest.', 'mykavo' ) ) +
			'</ul>' +
			'<div class="mk-welcome-cta">' +
			( READONLY
				? '<p class="mk-fine">' + esc( __( 'This site is not connected yet. Ask an administrator to connect it.', 'mykavo' ) ) + '</p>'
				: '<a class="mk-btn mk-btn-primary mk-connect" href="' + esc( cfg.connectUrl ) + '" target="_blank" rel="noopener">' + icon( 'link' ) + esc( __( 'Connect to MyKavo', 'mykavo' ) ) + '</a>' ) +
			'<span class="mk-fine">' + esc( __( 'Setup takes about a minute.', 'mykavo' ) ) + '</span>' +
			'</div>' +
			'<p class="mk-speed">' + icon( 'zap' ) + esc( __( 'Adds nothing to your storefront. Zero impact on store speed.', 'mykavo' ) ) + '</p>' +
			'</div>' +
			'<div class="mk-welcome-art" aria-hidden="true"><div class="mk-preview">' +
			'<div class="mk-preview-head"><span>' + esc( __( 'Needs attention', 'mykavo' ) ) + '</span><span>' + esc( __( 'Example', 'mykavo' ) ) + '</span></div>' +
			rows.map( function ( r ) {
				return '<div class="mk-preview-row">' + sevPill( r[ 0 ] ) + '<span>' + esc( r[ 1 ] ) + '</span><em>' + esc( r[ 2 ] ) + '</em></div>';
			} ).join( '' ) +
			'</div></div>' +
			'</section>' +
			footer()
		);
	}

	function benefit( ic, title, text ) {
		return '<li><span class="mk-benefit-icon">' + icon( ic ) + '</span><span><b>' + esc( title ) + '</b>' + esc( text ) + '</span></li>';
	}

	function footer() {
		return (
			'<p class="mk-foot"><span>' +
			esc( __( 'MyKavo for Shopify', 'mykavo' ) ) +
			'</span><span>' + esc( __( 'Runs only in your Shopify admin. Nothing is added to your storefront.', 'mykavo' ) ) + '</span></p>'
		);
	}

		function header() {
		var o = state.overview;
		var dashboard = o && o.links ? safeUrl( o.links.website ) : '';
		return (
			'<div class="mk-top">' +
			brand() +
			planChip() +
			tabs() +
			'<div class="mk-top-actions">' +
			( dashboard ? '<a class="mk-iconbtn" href="' + esc( dashboard ) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc( __( 'Open in MyKavo', 'mykavo' ) ) + '" title="' + esc( __( 'Open in MyKavo', 'mykavo' ) ) + '">' + icon( 'arrow' ) + '</a>' : '' ) +
			'<div class="mk-menu">' +
			'<button type="button" class="mk-iconbtn" data-act="menu" aria-haspopup="true" aria-expanded="' + ( state.menuOpen ? 'true' : 'false' ) + '" aria-label="' + esc( __( 'More', 'mykavo' ) ) + '">' + icon( 'more' ) + '</button>' +
			( state.menuOpen ? menu() : '' ) +
			'</div>' +
			scanButton() +
			'</div></div>'
		);
	}

	/** Run scan, in the top bar on every tab. */
	function scanButton() {
		if ( READONLY ) {
			return '<span class="mk-chip mk-chip-calm" title="' + esc( __( 'Your account can view MyKavo but not change anything.', 'mykavo' ) ) + '">' + icon( 'eye' ) + esc( __( 'View only', 'mykavo' ) ) + '</span>';
		}
		var o = state.overview;
		var cap = ( o && o.capabilities ) || {};
		var running = Boolean( o && o.scanInProgress );
		var busy = state.busy === 'scan' || running;
		var disabled = ! o || busy || ! cap.canRunManualScan;
		return (
			'<button type="button" class="mk-btn mk-btn-dark mk-btn-scan" data-act="scan"' + ( disabled ? ' disabled' : '' ) +
			( ! running && cap.manualScanBlockedReason ? ' title="' + esc( cap.manualScanBlockedReason ) + '"' : '' ) + '>' +
			icon( busy ? 'loader' : 'refresh', busy ? 'mk-spin' : '' ) +
			esc( running ? __( 'Scanning', 'mykavo' ) : __( 'Run scan', 'mykavo' ) ) + '</button>'
		);
	}

	var PAGE_TITLES = {
		overview: __( 'Site overview', 'mykavo' ),
		changes: __( 'Changes', 'mykavo' ),
		updates: __( 'Theme checks', 'mykavo' ),
		bots: __( 'AI crawlers', 'mykavo' ),
		scans: __( 'Scans', 'mykavo' ),
		pages: __( 'Pages', 'mykavo' ),
		plan: __( 'Your plan', 'mykavo' ),
		reports: __( 'Client reports', 'mykavo' ),
	};

	/** The page title and one status line: which site, how it is, when it was checked. */
	function pageHead() {
		var o = state.overview;
		var site = o ? o.website : cfg.website || {};
		var dot = 'mk-dot';
		if ( o ) {
			dot += o.health && o.health.status === 'down' ? ' mk-dot-bad' : o.stats.bySeverity.CRITICAL + o.stats.bySeverity.HIGH > 0 ? ' mk-dot-warn' : ' mk-dot-good';
		}
		var meta = [];
		if ( o && o.website.lastScanAt ) {
			meta.push( sprintf( /* translators: %s: relative time. */ __( 'checked %s', 'mykavo' ), rel( o.website.lastScanAt ) ) );
		}
		if ( o && o.website.nextScanAt && o.website.status !== 'PAUSED' ) {
			meta.push( sprintf( /* translators: %s: relative time. */ __( 'next check %s', 'mykavo' ), rel( o.website.nextScanAt ) ) );
		}
		if ( o && o.website.status === 'PAUSED' ) {
			meta.push( __( 'monitoring paused', 'mykavo' ) );
		}
		return (
			'<div class="mk-head">' +
			'<h2 class="mk-page-title">' + esc( PAGE_TITLES[ state.tab ] || PAGE_TITLES.overview ) + '</h2>' +
			'<p class="mk-page-meta"><span class="' + dot + '"></span><b>' + esc( site.name || hostOf( site.url ) ) + '</b>' +
			( site.url ? '<span>' + esc( hostOf( site.url ) ) + '</span>' : '' ) +
			( meta.length ? '<span>' + esc( meta.join( ' · ' ) ) + '</span>' : '' ) +
			'</p></div>'
		);
	}

	function menu() {
		var links = ( state.overview && state.overview.links ) || {};
		var item = function ( href, ic, label ) {
			var url = safeUrl( href );
			return url ? '<a href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' + icon( ic ) + esc( label ) + '</a>' : '';
		};
		return (
			'<div class="mk-menu-list" role="menu">' +
			item( links.notifications, 'bell', __( 'Alert settings', 'mykavo' ) ) +
			item( links.pages, 'layers', __( 'Choose monitored pages', 'mykavo' ) ) +
			item( links.billing, 'zap', __( 'Plan and billing', 'mykavo' ) ) +
			'<button type="button" class="is-danger" data-act="disconnect">' + icon( 'unplug' ) + esc( state.confirmDisconnect ? __( 'Press again to disconnect', 'mykavo' ) : __( 'Disconnect this store', 'mykavo' ) ) + '</button>' +
			'</div>'
		);
	}

	function tabs() {
		var open = state.overview ? state.overview.stats.openChanges : 0;
		var list = [
			[ 'overview', __( 'Overview', 'mykavo' ), '' ],
			[ 'changes', __( 'Changes', 'mykavo' ), open > 0 ? '<span class="mk-count">' + esc( open > 99 ? '99+' : open ) + '</span>' : '' ],
			[ 'updates', __( 'Theme checks', 'mykavo' ), '' ],
			[ 'scans', __( 'Scans', 'mykavo' ), '' ],
			[ 'pages', __( 'Pages', 'mykavo' ), '' ],
		];
		return (
			'<div class="mk-tabs" role="tablist" aria-label="' + esc( __( 'MyKavo sections', 'mykavo' ) ) + '">' +
			list.map( function ( t ) {
				var selected = state.tab === t[ 0 ];
				return '<button type="button" role="tab" class="mk-tab" data-act="tab" data-tab="' + t[ 0 ] + '" data-key="tab-' + t[ 0 ] + '" aria-selected="' + selected + '" tabindex="' + ( selected ? '0' : '-1' ) + '"><span>' + esc( t[ 1 ] ) + '</span>' + t[ 2 ] + '</button>';
			} ).join( '' ) +
			'</div>'
		);
	}

	function loadingBlock( height ) {
		return '<div class="mk-skel" style="height:' + ( height || 160 ) + 'px"></div>';
	}

	function errorBlock( message, act ) {
		return (
			'<div class="mk-card mk-card-pad"><div class="mk-empty">' +
			'<strong>' + esc( __( 'Could not load this', 'mykavo' ) ) + '</strong><span>' + esc( message ) + '</span>' +
			'<button type="button" class="mk-btn mk-btn-sm" data-act="' + esc( act ) + '">' + icon( 'refresh' ) + esc( __( 'Try again', 'mykavo' ) ) + '</button>' +
			'</div></div>'
		);
	}

	function hero( o ) {
		var by = o.stats.bySeverity;
		var urgent = by.CRITICAL + by.HIGH;
		var tone;
		var ic;
		var eyebrow = __( 'Status', 'mykavo' );
		var title;
		var sub;
		var extra = '';
		var scan = o.scanInProgress;

		if ( scan ) {
			tone = 'busy';
			ic = 'loader';
			title = __( 'Scanning your pages', 'mykavo' );
			var total = scan.pagesRequested || 0;
			sub = total
				? sprintf( /* translators: 1: pages done, 2: total pages. */ __( '%1$d of %2$d pages checked', 'mykavo' ), scan.pagesScanned || 0, total )
				: __( 'Waiting for a scanner to pick this up...', 'mykavo' );
			var pct = total ? Math.min( 100, Math.round( ( ( scan.pagesScanned || 0 ) / total ) * 100 ) ) : 0;
			extra = '<div class="mk-progress' + ( total ? '' : ' mk-progress-indeterminate' ) + '"><span style="width:' + pct + '%"></span></div>';
		} else if ( o.health && o.health.status === 'down' ) {
			tone = 'bad';
			ic = 'alert';
			title = __( 'Your site is not responding', 'mykavo' );
			sub = o.health.httpStatus
				? sprintf( /* translators: %d: HTTP status code. */ __( 'The last check returned HTTP %d.', 'mykavo' ), o.health.httpStatus )
				: __( 'The last uptime check could not reach it.', 'mykavo' );
		} else if ( o.stats.baselinedPages === 0 ) {
			tone = 'quiet';
			ic = 'clock';
			title = __( 'Building your first baseline', 'mykavo' );
			sub = o.stats.monitoredPages === 0
				? __( 'Choose which pages to monitor in MyKavo to get started.', 'mykavo' )
				: __( 'The first scan records how your pages look today. Changes are measured against it.', 'mykavo' );
		} else if ( urgent > 0 ) {
			tone = 'bad';
			ic = 'alert';
			title = sprintf( _n( '%d important change needs attention', '%d important changes need attention', urgent, 'mykavo' ), urgent );
			sub = o.topChanges && o.topChanges[ 0 ] ? o.topChanges[ 0 ].title : '';
		} else if ( o.stats.openChanges > 0 ) {
			tone = 'warn';
			ic = 'eye';
			title = sprintf( _n( '%d change to review', '%d changes to review', o.stats.openChanges, 'mykavo' ), o.stats.openChanges );
			sub = __( 'Nothing urgent. Review them when you have a minute.', 'mykavo' );
		} else {
			tone = 'good';
			ic = 'check';
			title = __( 'All clear', 'mykavo' );
			sub = __( 'Nothing important changed since your last approved baseline.', 'mykavo' );
		}

		var first = ! scan && urgent > 0 && o.topChanges && o.topChanges[ 0 ];
		var reviewBtn = first
			? '<button type="button" class="mk-btn mk-btn-primary" data-act="open-change" data-id="' + esc( first.id ) + '">' + esc( __( 'Review now', 'mykavo' ) ) + icon( 'chevron' ) + '</button>'
			: '';

		return (
			'<section class="mk-card mk-hero mk-tone-' + tone + '" aria-live="polite">' +
			'<div class="mk-hero-top">' +
			'<div class="mk-hero-main"><span class="mk-hero-icon">' + icon( ic, ic === 'loader' ? 'mk-spin' : '' ) + '</span>' +
			'<div style="min-width:0;flex:1"><p class="mk-eyebrow"><span class="mk-pulse" aria-hidden="true"></span>' + esc( eyebrow ) + '</p><h2>' + esc( title ) + '</h2>' +
			( sub ? '<p class="mk-hero-sub">' + esc( sub ) + '</p>' : '' ) + extra + '</div></div>' +
			( reviewBtn ? '<div class="mk-hero-side"><div class="mk-hero-actions">' + reviewBtn + '</div></div>' : '' ) +
			'</div>' +
			'</section>'
		);
	}



	function changeRow( c ) {
		return (
			'<li><button type="button" class="mk-row" data-act="open-change" data-id="' + esc( c.id ) + '" data-key="change-' + esc( c.id ) + '">' +
			sevPill( c.severity ) +
			'<span class="mk-row-main"><span class="mk-row-title">' + esc( c.title ) + '</span>' +
			'<span class="mk-row-meta">' +
			( c.pagePath ? '<code>' + esc( c.pagePath ) + '</code>' : '<span>' + esc( __( 'Site-wide', 'mykavo' ) ) + '</span>' ) +
			'<span>' + esc( categoryLabel( c.category ) ) + '</span>' +
			( c.status !== 'NEW' ? '<span class="mk-status">' + esc( statusLabel( c.status ) ) + '</span>' : '' ) +
			( c.afterUpdate ? '<span class="mk-tag" title="' + esc( c.afterUpdate ) + '">' + icon( 'shield' ) + esc( __( 'After a theme change', 'mykavo' ) ) + '</span>' : '' ) +
			'</span></span>' +
			'<span class="mk-row-side">' + esc( rel( c.detectedAt ) ) + '</span>' +
			icon( 'chevron', 'mk-row-chevron' ) +
			'</button></li>'
		);
	}

		function overviewView() {
		if ( state.overviewError && ! state.overview ) {
			return errorBlock( state.overviewError, 'retry-overview' );
		}
		var o = state.overview;
		if ( ! o ) {
			return '<div class="mk-grid">' + '<div class="mk-ov-row">' + loadingBlock( 380 ) + loadingBlock( 380 ) + loadingBlock( 380 ) + '</div>' + loadingBlock( 120 ) + '</div>';
		}
		var top = o.topChanges || [];
		var special = o.scanInProgress || ( o.health && o.health.status === 'down' ) || o.stats.baselinedPages === 0;

		var attention =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Needs your attention', 'mykavo' ) ) + '</h3>' +
			( o.stats.openChanges > 0 ? '<button type="button" class="mk-btn mk-btn-soft mk-btn-sm" data-act="tab" data-tab="changes">' + esc( sprintf( /* translators: %d: number of open changes. */ __( 'See all %d', 'mykavo' ), o.stats.openChanges ) ) + '</button>' : '' ) +
			'</div>' +
			( top.length
				? '<ul class="mk-list">' + top.map( changeRow ).join( '' ) + '</ul>'
				: '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'check' ) + '</span><strong>' + esc( __( 'Nothing needs attention', 'mykavo' ) ) + '</strong><span>' + esc( __( 'When a scan finds an important change, it shows up here first.', 'mykavo' ) ) + '</span></div>' ) +
			'</section>';

		var scans = o.recentScans || [];
		var recent =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Recent scans', 'mykavo' ) ) + '</h3>' +
			'<button type="button" class="mk-iconbtn" data-act="tab" data-tab="scans" aria-label="' + esc( __( 'Scan history', 'mykavo' ) ) + '">' + icon( 'arrow' ) + '</button></div>' +
			( scans.length
				? '<ul class="mk-list">' + scans.map( function ( s ) {
					return (
						'<li><div class="mk-row" style="cursor:default">' +
						'<span class="mk-row-main"><span class="mk-row-title">' + esc( triggerLabel( s.triggerType ) ) + ' · ' + esc( statusLabel( s.status ) ) + '</span>' +
						'<span class="mk-row-meta"><span>' + esc( rel( s.completedAt || s.createdAt ) ) + '</span><span>' +
						esc( sprintf( _n( '%d change', '%d changes', s.changesDetected, 'mykavo' ), s.changesDetected ) ) + '</span></span></span>' +
						sevPill( s.highestSeverity ) + '</div></li>'
					);
				} ).join( '' ) + '</ul>'
				: '<div class="mk-empty"><span>' + esc( __( 'No scans yet.', 'mykavo' ) ) + '</span></div>' ) +
			'</section>';


		return (
			'<div class="mk-grid">' +
			alertsBanner() +
			( special ? hero( o ) : '' ) +
			( cfg.notice === 'connected' || o.stats.monitoredPages < 3 ? suggestionsCard( true ) : '' ) +
			'<div class="mk-ov-row">' + openCard( o ) + vitalsCard( o ) + highlightCard( o ) + '</div>' +
			'<div class="mk-tiles' + ( state.bots ? '' : ' mk-tiles-3' ) + '">' + pagesTile( o ) + uptimeTile( o ) + updatesTile() + botsTile() + '</div>' +
			'<div class="mk-grid mk-grid-main"><div class="mk-grid">' + attention + '</div><div class="mk-grid">' + auditCard( o ) + storeCard() + recent + workspaceCard( o ) + '</div></div>' +
			'</div>'
		);
	}

	function stat( ic, label, value, unit, foot ) {
		return (
			'<div class="mk-stat"><p class="mk-stat-label">' + icon( ic ) + esc( label ) + '</p>' +
			'<p class="mk-stat-value">' + esc( value ) + ( unit ? '<small>' + esc( unit ) + '</small>' : '' ) + '</p>' +
			( foot ? '<p class="mk-stat-foot">' + esc( foot ) + '</p>' : '' ) + '</div>'
		);
	}

	/** "99.1" with the decimals greyed, and a small unit. */
	function bigNum( value, unit ) {
		var s = String( value );
		var dot = s.indexOf( '.' );
		var html = dot === -1 ? esc( s ) : esc( s.slice( 0, dot ) ) + '<span class="mk-dec">' + esc( s.slice( dot ) ) + '</span>';
		return html + ( unit ? '<span class="mk-unit">' + esc( unit ) + '</span>' : '' );
	}

	/** Open changes by severity: the count, the mix, and a row per level. */
	function openCard( o ) {
		var by = o.stats.bySeverity;
		var total = o.stats.openChanges;
		var urgent = by.CRITICAL + by.HIGH;
		var badge = urgent
			? sprintf( /* translators: %d: number of critical and high changes. */ _n( '%d important', '%d important', urgent, 'mykavo' ), urgent )
			: total ? __( 'Nothing urgent', 'mykavo' ) : __( 'All clear', 'mykavo' );
		var present = SEVERITIES.filter( function ( s ) {
			return by[ s ] > 0;
		} );
		var mix = total
			? '<div class="mk-mix" role="img" aria-label="' + esc( present.map( function ( s ) {
				return by[ s ] + ' ' + severityLabel( s );
			} ).join( ', ' ) ) + '">' + present.map( function ( s ) {
				return '<span class="mk-mix-' + s + '" style="flex-grow:' + by[ s ] + '"></span>';
			} ).join( '' ) + '</div>'
			: '<div class="mk-mix mk-mix-empty" aria-hidden="true"></div>';
		var rows = SEVERITIES.map( function ( s ) {
			var n = by[ s ] || 0;
			var tone = ! n ? 'clear' : s === 'CRITICAL' || s === 'HIGH' ? 'hot' : s === 'MEDIUM' ? 'warm' : 'calm';
			var text = { clear: __( 'Clear', 'mykavo' ), hot: __( 'Needs you', 'mykavo' ), warm: __( 'Review', 'mykavo' ), calm: __( 'When you can', 'mykavo' ) }[ tone ];
			return (
				'<li><button type="button" class="mk-sevrow" data-act="severity-jump" data-sev="' + s + '"' + ( n ? '' : ' disabled' ) + '>' +
				'<span class="mk-sevdot mk-sevdot-' + s + '"></span>' +
				'<span class="mk-sevrow-label">' + esc( severityLabel( s ) ) + '</span>' +
				'<span class="mk-sevrow-num">' + esc( n ) + '</span>' +
				'<span class="mk-chip mk-chip-' + tone + '">' + esc( text ) + '</span>' +
				'</button></li>'
			);
		} ).join( '' );
		return (
			'<section class="mk-card mk-open">' +
			'<div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Open changes', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Waiting for your review', 'mykavo' ) ) + '</p></div>' +
			'<button type="button" class="mk-iconbtn" data-act="tab" data-tab="changes" aria-label="' + esc( __( 'All changes', 'mykavo' ) ) + '">' + icon( 'arrow' ) + '</button></div>' +
			'<div class="mk-open-count"><span class="mk-big">' + esc( total ) + '</span><span class="mk-badge">' + esc( badge ) + '</span></div>' +
			mix +
			'<ul class="mk-sevrows">' + rows + '</ul>' +
			'</section>'
		);
	}

	/** Uptime, response time and SSL, plus response time over 7 days with updates marked. */
	function vitalsCard( o ) {
		var h = o.health || {};
		var ms = typeof h.avgResponseMs24h === 'number' ? h.avgResponseMs24h : null;
		var speed = ms === null ? '' : ms >= 1800 ? 'slow' : ms >= 900 ? 'ok' : 'fast';
		var speedText = { slow: __( 'slow', 'mykavo' ), ok: __( 'okay', 'mykavo' ), fast: __( 'fast', 'mykavo' ) }[ speed ] || '';
		var cell = function ( value, label ) {
			return '<div class="mk-vital"><p class="mk-vital-num">' + value + '</p><p class="mk-vital-label">' + label + '</p></div>';
		};
		return (
			'<section class="mk-card mk-vitals">' +
			'<div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Site vitals', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Checked by MyKavo every 5 minutes', 'mykavo' ) ) + '</p></div></div>' +
			'<div class="mk-vital-row">' +
			cell( typeof h.uptime24h === 'number' ? bigNum( ( Math.round( h.uptime24h * 10 ) / 10 ).toString(), '%' ) : '-', esc( __( 'Uptime, 24 hours', 'mykavo' ) ) ) +
			cell( ms === null ? '-' : bigNum( ( ms / 1000 ).toFixed( 2 ), 's' ), esc( __( 'Response time', 'mykavo' ) ) + ( speed ? ' · <b class="mk-speed-' + speed + '">' + esc( speedText ) + '</b>' : '' ) ) +
			cell( typeof h.sslDaysLeft === 'number' ? bigNum( h.sslDaysLeft, ' ' + __( 'days', 'mykavo' ) ) : '-', esc( __( 'SSL certificate left', 'mykavo' ) ) ) +
			'</div>' +
			vitalsChart( o.vitals ) +
			'</section>'
		);
	}

		/**
	 * Response time over 7 days. Only the line and its fill are SVG (stretched
	 * to the card); axis labels, update markers and the latest update's name
	 * are HTML, so text stays the same readable size at every width.
	 */
	function vitalsChart( v ) {
		var pts = ( ( v && v.responseSeries ) || [] ).filter( function ( p ) {
			return typeof p.ms === 'number';
		} );
		if ( pts.length < 3 ) {
			return '<p class="mk-chart-empty">' + esc( __( 'The response time chart fills in as MyKavo checks your site.', 'mykavo' ) ) + '</p>';
		}
		var t1 = Date.now();
		var t0 = t1 - 7 * 86400000;
		var peak = Math.max.apply( null, pts.map( function ( p ) {
			return p.ms;
		} ) );
		var top = Math.max( 1000, Math.ceil( peak / 500 ) * 500 );
		var px = function ( t ) {
			return Math.min( 100, Math.max( 0, ( ( t - t0 ) / ( t1 - t0 ) ) * 100 ) );
		};
		var py = function ( m ) {
			return 6 + ( 1 - m / top ) * 90;
		};
		var xy = pts.map( function ( p ) {
			return [ px( Date.parse( p.t ) ) * 10, py( p.ms ) * 3 ];
		} );
		var d = 'M' + xy[ 0 ][ 0 ].toFixed( 1 ) + ' ' + xy[ 0 ][ 1 ].toFixed( 1 );
		for ( var i = 1; i < xy.length; i++ ) {
			var mx = ( xy[ i - 1 ][ 0 ] + xy[ i ][ 0 ] ) / 2;
			var my = ( xy[ i - 1 ][ 1 ] + xy[ i ][ 1 ] ) / 2;
			d += ' Q' + xy[ i - 1 ][ 0 ].toFixed( 1 ) + ' ' + xy[ i - 1 ][ 1 ].toFixed( 1 ) + ' ' + mx.toFixed( 1 ) + ' ' + my.toFixed( 1 );
		}
		var last = xy[ xy.length - 1 ];
		d += ' L' + last[ 0 ].toFixed( 1 ) + ' ' + last[ 1 ].toFixed( 1 );
		var area = d + ' L' + last[ 0 ].toFixed( 1 ) + ' 300 L' + xy[ 0 ][ 0 ].toFixed( 1 ) + ' 300 Z';
		var secs = function ( m ) {
			return ( m / 1000 ).toFixed( m % 1000 ? 1 : 0 ) + ' s';
		};
		var grid = [ top, top / 2 ].map( function ( g ) {
			return '<line x1="0" x2="1000" y1="' + ( py( g ) * 3 ).toFixed( 1 ) + '" y2="' + ( py( g ) * 3 ).toFixed( 1 ) + '" class="mk-chart-grid"/>';
		} ).join( '' );
		var axis = [ top, top / 2 ].map( function ( g ) {
			return '<span class="mk-chart-y" style="top:' + py( g ).toFixed( 1 ) + '%">' + esc( secs( g ) ) + '</span>';
		} ).join( '' );
		var days = '';
		for ( var k = 0; k < 7; k++ ) {
			days += '<span>' + esc( new Date( t0 + ( k + 0.5 ) * 86400000 ).toLocaleDateString( locale, { weekday: 'short' } ) ) + '</span>';
		}
		var updates = ( ( v && v.updates ) || [] ).filter( function ( u ) {
			var t = Date.parse( u.at );
			return t >= t0 && t <= t1;
		} );
		var marks = updates.map( function ( u ) {
			return '<span class="mk-chart-mark" style="left:' + px( Date.parse( u.at ) ).toFixed( 2 ) + '%" title="' + esc( u.note ) + '"></span>';
		} ).join( '' );
		var newest = updates[ updates.length - 1 ];
		var tag = '';
		if ( newest ) {
			var at = px( Date.parse( newest.at ) );
			tag = '<span class="mk-chart-tag' + ( at > 60 ? ' mk-chart-tag-end' : '' ) + '" style="left:' + at.toFixed( 2 ) + '%">' + esc( newest.note ) + '</span>';
		}
		return (
			'<figure class="mk-chart">' +
			'<figcaption><span>' + esc( __( 'Response time, last 7 days', 'mykavo' ) ) + '</span>' +
			( updates.length ? '<span class="mk-chart-key"><span class="mk-chart-key-dot"></span>' + esc( __( 'Theme changes', 'mykavo' ) ) + '</span>' : '' ) + '</figcaption>' +
			'<div class="mk-chart-plot" role="img" aria-label="' + esc( sprintf( /* translators: 1: first response time, 2: latest response time. */ __( 'Response time over 7 days, from %1$s to %2$s', 'mykavo' ), secs( pts[ 0 ].ms ), secs( pts[ pts.length - 1 ].ms ) ) ) + '">' +
			axis +
			'<div class="mk-chart-inner">' +
			'<svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + grid +
			'<path d="' + area + '" class="mk-chart-area"/><path d="' + d + '" class="mk-chart-line"/></svg>' +
			marks + tag +
			'</div></div>' +
			'<div class="mk-chart-days">' + days + '</div>' +
			'</figure>'
		);
	}

	/** The one thing that matters most right now, in the yellow card. */
	function highlightCard( o ) {
		var log = ( state.updates && state.updates.log ) || [];
		var latest = log[ 0 ];
		var v = latest ? verdict( latest, scansById() ) : null;
		var by = o.stats.bySeverity;
		var urgent = by.CRITICAL + by.HIGH;
		var top = ( o.topChanges || [] )[ 0 ];
		var eyebrow;
		var ago = '';
		var title;
		var sub;
		var go = '';
		var goLabel = __( 'Review', 'mykavo' );
		if ( latest && v && ( v.tone === 'bad' || v.tone === 'warn' || v.tone === 'busy' ) ) {
			eyebrow = PAGE_TITLES.updates;
			ago = rel( new Date( latest.at * 1000 ).toISOString() );
			title = v.text;
			sub = updateTitle( latest );
			go = v.scanId ? 'data-act="update-changes" data-scan="' + esc( v.scanId ) + '" data-note="' + esc( updateTitle( latest ) ) + '"' : '';
		} else if ( urgent > 0 && top ) {
			eyebrow = __( 'Needs attention', 'mykavo' );
			ago = rel( top.detectedAt );
			title = sprintf( /* translators: %d: number of changes. */ _n( '%d important change to review', '%d important changes to review', urgent, 'mykavo' ), urgent );
			sub = top.title;
			go = 'data-act="open-change" data-id="' + esc( top.id ) + '"';
		} else if ( latest && v ) {
			eyebrow = PAGE_TITLES.updates;
			ago = rel( new Date( latest.at * 1000 ).toISOString() );
			title = v.text;
			sub = updateTitle( latest );
		} else {
			eyebrow = __( 'Right now', 'mykavo' );
			title = __( 'All clear', 'mykavo' );
			sub = __( 'Nothing important changed since your last approved baseline.', 'mykavo' );
		}
		return (
			'<section class="mk-card mk-highlight">' +
			'<div class="mk-highlight-top"><span class="mk-highlight-eyebrow">' + esc( eyebrow ) + '</span>' +
			( ago ? '<span class="mk-highlight-when">' + esc( ago ) + '</span>' : '' ) + '</div>' +
			'<h3 class="mk-highlight-title">' + esc( title ) + '</h3>' +
			'<p class="mk-highlight-sub">' + esc( sub ) + '</p>' +
			'<div class="mk-highlight-foot">' +
			'<button type="button" class="mk-link" data-act="tab" data-tab="updates">' + esc( __( 'Theme changes', 'mykavo' ) ) + '</button>' +
			( go ? '<button type="button" class="mk-gobtn" ' + go + ' aria-label="' + esc( goLabel ) + '">' + icon( 'right' ) + '</button>' : '' ) +
			'</div></section>'
		);
	}

	function tile( label, sub, value, chip, tone, tab ) {
		return (
			'<button type="button" class="mk-tile" data-act="tab" data-tab="' + esc( tab ) + '">' +
			'<span class="mk-tile-head"><b>' + esc( label ) + '</b><span>' + esc( sub ) + '</span></span>' +
			'<span class="mk-tile-foot"><span class="mk-tile-num">' + value + '</span>' +
			( chip ? '<span class="mk-chip mk-chip-' + tone + '">' + esc( chip ) + '</span>' : '' ) +
			'</span></button>'
		);
	}

	function pagesTile( o ) {
		return tile(
			__( 'Pages watched', 'mykavo' ),
			sprintf( /* translators: %d: number of pages with a baseline. */ _n( '%d with a baseline', '%d with a baseline', o.stats.baselinedPages, 'mykavo' ), o.stats.baselinedPages ),
			bigNum( o.stats.monitoredPages ),
			__( 'Manage', 'mykavo' ),
			'calm',
			'pages'
		);
	}

	function uptimeTile( o ) {
		var h = o.health || {};
		return tile(
			__( 'Uptime, 7 days', 'mykavo' ),
			typeof h.checks7d === 'number' ? sprintf( /* translators: %s: number of checks. */ __( '%s checks', 'mykavo' ), num( h.checks7d ) ) : __( 'First check within minutes', 'mykavo' ),
			typeof h.uptime7d === 'number' ? bigNum( ( Math.round( h.uptime7d * 10 ) / 10 ).toString(), '%' ) : '-',
			'',
			'calm',
			'scans'
		);
	}

	function updatesTile() {
		var log = ( state.updates && state.updates.log ) || [];
		var scans = scansById();
		var checked = 0;
		var flagged = 0;
		log.forEach( function ( entry ) {
			var v = verdict( entry, scans );
			if ( entry.scan_id ) {
				checked += 1;
			}
			if ( v.tone === 'bad' || v.tone === 'warn' ) {
				flagged += 1;
			}
		} );
		return tile(
			__( 'Theme changes checked', 'mykavo' ),
			__( 'Published and edited themes', 'mykavo' ),
			bigNum( checked ),
			flagged ? sprintf( /* translators: %d: number of updates. */ _n( '%d found changes', '%d found changes', flagged, 'mykavo' ), flagged ) : checked ? __( 'All verified', 'mykavo' ) : '',
			flagged ? 'warm' : 'good',
			'updates'
		);
	}

	function botsTile() {
		return '';
	}

	function changesView() {
		var scanChip = state.changesScan
			? '<div class="mk-filter-note">' + icon( 'shield' ) + '<span>' +
				esc( sprintf( /* translators: %s: the update, e.g. "Updated WooCommerce 8.1 → 8.2". */ __( 'Found after: %s', 'mykavo' ), state.changesScan.note ) ) +
				'</span><button type="button" class="mk-btn mk-btn-quiet mk-btn-sm" data-act="clear-scan-filter">' + esc( __( 'Show all changes', 'mykavo' ) ) + '</button></div>'
			: '';
		var toolbar =
			scanChip +
			'<div class="mk-toolbar"' + ( state.changesScan ? ' hidden' : '' ) + '>' +
			'<div class="mk-seg" role="group" aria-label="' + esc( __( 'Status', 'mykavo' ) ) + '">' +
			'<button type="button" data-act="changes-status" data-status="open" data-key="st-open" aria-pressed="' + ( state.changesStatus === 'open' ) + '">' + esc( __( 'Open', 'mykavo' ) ) + '</button>' +
			'<button type="button" data-act="changes-status" data-status="all" data-key="st-all" aria-pressed="' + ( state.changesStatus === 'all' ) + '">' + esc( __( 'All', 'mykavo' ) ) + '</button>' +
			'</div>' +
			'<div class="mk-chips" role="group" aria-label="' + esc( __( 'Severity', 'mykavo' ) ) + '">' +
			[ '' ].concat( SEVERITIES ).map( function ( s ) {
				return '<button type="button" class="mk-chip" data-act="severity" data-sev="' + s + '" data-key="sev-' + ( s || 'all' ) + '" aria-pressed="' + ( state.severity === s ) + '">' + esc( s ? severityLabel( s ) : __( 'Any severity', 'mykavo' ) ) + '</button>';
			} ).join( '' ) +
			'</div></div>';

		var body;
		if ( state.changesError ) {
			body = '<div class="mk-empty"><span>' + esc( state.changesError ) + '</span><button type="button" class="mk-btn mk-btn-sm" data-act="retry-changes">' + esc( __( 'Try again', 'mykavo' ) ) + '</button></div>';
		} else if ( ! state.changes ) {
			body = '<div style="padding:16px 22px">' + loadingBlock( 220 ) + '</div>';
		} else {
			var list = state.changes.changes.filter( function ( c ) {
				return ! state.severity || c.severity === state.severity;
			} );
			body = list.length
				? '<ul class="mk-list">' + list.map( changeRow ).join( '' ) + '</ul>'
				: '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'check' ) + '</span><strong>' +
					esc( state.changesStatus === 'open' ? __( 'No open changes', 'mykavo' ) : __( 'No changes yet', 'mykavo' ) ) + '</strong><span>' +
					esc( __( 'Changes appear here after a scan compares your pages with their baseline.', 'mykavo' ) ) + '</span></div>';
		}
		return '<section class="mk-card">' + toolbar + body + '</section>';
	}

	function scansView() {
		if ( state.scansError ) {
			return errorBlock( state.scansError, 'retry-scans' );
		}
		if ( ! state.scans ) {
			return loadingBlock( 280 );
		}
		var rows = state.scans.scans;
		if ( ! rows.length ) {
			return '<section class="mk-card"><div class="mk-empty"><strong>' + esc( __( 'No scans yet', 'mykavo' ) ) + '</strong></div></section>';
		}
		return (
			'<section class="mk-card"><div class="mk-table-wrap"><table class="mk-table"><thead><tr>' +
			'<th>' + esc( __( 'When', 'mykavo' ) ) + '</th><th>' + esc( __( 'Type', 'mykavo' ) ) + '</th><th>' + esc( __( 'Status', 'mykavo' ) ) + '</th>' +
			'<th>' + esc( __( 'Pages', 'mykavo' ) ) + '</th><th>' + esc( __( 'Changes', 'mykavo' ) ) + '</th><th>' + esc( __( 'Highest', 'mykavo' ) ) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map( function ( s ) {
				var pages = s.pagesFailed
					? sprintf( /* translators: 1: pages scanned, 2: pages requested, 3: pages failed. */ __( '%1$d / %2$d (%3$d failed)', 'mykavo' ), s.pagesScanned, s.pagesRequested, s.pagesFailed )
					: sprintf( /* translators: 1: pages scanned, 2: pages requested. */ __( '%1$d / %2$d', 'mykavo' ), s.pagesScanned, s.pagesRequested );
				return (
					'<tr><td title="' + esc( when( s.createdAt ) ) + '">' + esc( rel( s.completedAt || s.createdAt ) ) + '</td>' +
					'<td>' + ( s.triggerType === 'DEPLOY' && s.note
						? '<span class="mk-tag" title="' + esc( s.note ) + '">' + icon( 'shield' ) + esc( __( 'Theme check', 'mykavo' ) ) + '</span><span class="mk-cell-note">' + esc( s.note ) + '</span>'
						: esc( triggerLabel( s.triggerType ) ) ) + '</td>' +
					'<td><span class="mk-status">' + esc( statusLabel( s.status ) ) + '</span></td>' +
					'<td class="mk-num">' + esc( pages ) + '</td>' +
					'<td class="mk-num">' + esc( s.changesDetected ) + '</td>' +
					'<td>' + ( sevPill( s.highestSeverity ) || '-' ) + '</td></tr>'
				);
			} ).join( '' ) +
			'</tbody></table></div></section>'
		);
	}

	function pagesView() {
		if ( state.pagesError ) {
			return errorBlock( state.pagesError, 'retry-pages' );
		}
		if ( ! state.pages ) {
			return loadingBlock( 240 );
		}
		var links = ( state.overview && state.overview.links ) || {};
		var pagesUrl = cfg.pagesUrl ? safeUrl( new URL( cfg.pagesUrl, window.location.href ).toString() ) : '';
		var adder =
			'<div class="mk-add-wrap"><form class="mk-add-page" data-form="add-page">' +
			'<label class="mk-visually-hidden" for="mk-add-url">' + esc( __( 'Page address', 'mykavo' ) ) + '</label>' +
			'<input id="mk-add-url" data-key="add-url" type="url" required placeholder="' + esc( ( ( cfg.site && cfg.site.url ) || 'https://' ) + 'contact/' ) + '" value="' + esc( state.addUrl || '' ) + '">' +
			'<button type="submit" class="mk-btn mk-btn-dark mk-btn-sm"' + ( state.busy === 'add-pages' ? ' disabled' : '' ) + '>' + esc( __( 'Monitor this page', 'mykavo' ) ) + '</button>' +
			'</form>' +
			( pagesUrl ? '<p class="mk-add-tip">' + esc( __( 'Tip: every page in your Pages list now has a "Monitor with MyKavo" link.', 'mykavo' ) ) + ' <a class="mk-link" href="' + esc( pagesUrl ) + '">' + esc( __( 'Open Pages', 'mykavo' ) ) + '</a></p>' : '' ) +
			'</div>';
		var head =
			'<div class="mk-card-head"><h3 class="mk-card-title">' + esc( sprintf( _n( '%d monitored page', '%d monitored pages', state.pages.pages.length, 'mykavo' ), state.pages.pages.length ) ) + '</h3>' +
			( safeUrl( links.pages ) ? '<a class="mk-link" href="' + esc( safeUrl( links.pages ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Change pages', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' ) +
			'</div>';
		if ( ! state.pages.pages.length ) {
			return '<div class="mk-grid">' + suggestionsCard( false ) + '<section class="mk-card">' + head + adder + '<div class="mk-empty"><span>' + esc( __( 'No pages are monitored yet.', 'mykavo' ) ) + '</span></div></section></div>';
		}
		return (
			'<div class="mk-grid">' + suggestionsCard( false ) +
			'<section class="mk-card">' + head + adder + '<ul class="mk-list">' +
			state.pages.pages.map( function ( p ) {
				var url = safeUrl( p.url );
				var watched = p.elements && p.elements.length ? '<span class="mk-chip mk-chip-good">' + icon( 'eye' ) + esc( sprintf( /* translators: %d: number of watched elements. */ _n( '%d watched element', '%d watched elements', p.elements.length, 'mykavo' ), p.elements.length ) ) + '</span>' : '';
				return (
					'<li class="mk-page-li"><a class="mk-row" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' +
					icon( 'file', 'mk-row-chevron' ) +
					'<span class="mk-row-main"><span class="mk-row-title">' + ( p.name ? esc( p.name ) : '<code class="mk-row-path">' + esc( pathOf( p.url ) ) + '</code>' ) + '</span>' +
					'<span class="mk-row-meta">' + ( p.name ? '<code>' + esc( pathOf( p.url ) ) + '</code>' : '' ) +
					( p.baselineVersion ? '<span>' + esc( sprintf( /* translators: %d: baseline version. */ __( 'Baseline v%d', 'mykavo' ), p.baselineVersion ) ) + '</span>' : '<span>' + esc( __( 'No baseline yet', 'mykavo' ) ) + '</span>' ) +
					( p.enabled ? '' : '<span class="mk-status">' + esc( __( 'Paused', 'mykavo' ) ) + '</span>' ) +
					'</span></span>' +
					( p.openChanges ? '<span class="mk-sev mk-sev-MEDIUM">' + esc( sprintf( _n( '%d open', '%d open', p.openChanges, 'mykavo' ), p.openChanges ) ) + '</span>' : '' ) +
					icon( 'external', 'mk-row-chevron' ) +
					'</a>' + watched +
					( true ? '' : '<button type="button" class="mk-btn mk-btn-sm mk-btn-soft mk-pick-btn" data-act="pick-element" data-url="' + esc( url ) + '">' + icon( 'eye' ) + esc( __( 'Watch an element', 'mykavo' ) ) + '</button>' ) +
					'</li>'
				);
			} ).join( '' ) +
			'</ul></section></div>'
		);
	}

	/* ------------------------------------------------------- safe updates -- */

	function scansById() {
		var map = {};
		var add = function ( list ) {
			( list || [] ).forEach( function ( sc ) {
				map[ sc.id ] = sc;
			} );
		};
		// Overview last: it is the copy refreshed while a scan runs, so it wins
		// over an older history list for the scans both contain.
		add( state.scans && state.scans.scans );
		add( state.overview && state.overview.recentScans );
		return map;
	}

	function updateTitle( entry ) {
		if ( entry.note ) {
			return entry.note;
		}
		var items = entry.items || [];
		if ( ! items.length ) {
			return __( 'Theme change', 'mykavo' );
		}
		var first = items[ 0 ];
		var name = first.type === 'core' ? 'WordPress' : first.name;
		var label;
		if ( first.action === 'activate' ) {
			label = sprintf( /* translators: %s: plugin name. */ __( 'Activated %s', 'mykavo' ), name );
		} else if ( first.action === 'deactivate' ) {
			label = sprintf( /* translators: %s: plugin name. */ __( 'Deactivated %s', 'mykavo' ), name );
		} else if ( first.action === 'switch' ) {
			label = sprintf( /* translators: %s: theme name. */ __( 'Switched theme to %s', 'mykavo' ), name );
		} else if ( first.action === 'rollback' ) {
			label = first.to
				? sprintf( /* translators: 1: plugin name, 2: version. */ __( 'Rolled back %1$s to %2$s', 'mykavo' ), name, first.to )
				: sprintf( /* translators: %s: plugin name. */ __( 'Rolled back %s', 'mykavo' ), name );
		} else {
			label = first.from && first.to ? name + ' ' + first.from + ' → ' + first.to : name + ( first.to ? ' ' + first.to : '' );
		}
		return items.length > 1
			? sprintf( /* translators: 1: first update, 2: number of other updates. */ __( '%1$s and %2$d more', 'mykavo' ), label, items.length - 1 )
			: label;
	}

	/** An update, rather than a plugin switched on or off or a theme switch. */
	function isUpdate( entry ) {
		var first = ( entry.items || [] )[ 0 ];
		return ! first || ! first.action || first.action === 'update';
	}

	/** What happened after an update, in words and a tone. */
	function verdict( entry, scans ) {
		var reason = String( entry.reason || '' ).toUpperCase();
		if ( reason === 'LOCAL' && entry.batch ) {
			return { tone: 'warn', text: safeVerdict( entry.batch ) };
		}
		if ( reason === 'OFF' ) {
			return { tone: 'quiet', text: __( 'Not checked - theme checks were off', 'mykavo' ) };
		}
		if ( reason === 'PLAN' ) {
			return { tone: 'quiet', text: __( 'Not checked - automatic theme checks come with paid plans', 'mykavo' ), upgrade: true };
		}
		if ( reason === 'NO_BASELINE' ) {
			return { tone: 'quiet', text: __( 'Not checked - the first baseline was not ready yet', 'mykavo' ) };
		}
		if ( reason === 'QUOTA' ) {
			return { tone: 'quiet', text: __( 'Not checked - today\'s scan limit was reached', 'mykavo' ) };
		}
		if ( reason === 'UNREACHABLE' ) {
			return { tone: 'bad', text: __( 'Not checked - MyKavo could not be reached', 'mykavo' ) };
		}
		if ( ! entry.scan_id ) {
			return { tone: 'quiet', text: entry.message || __( 'Not checked', 'mykavo' ) };
		}
		var scan = scans[ entry.scan_id ];
		if ( ! scan && entry.result ) {
			// A verdict this site saved before the scan left the recent list.
			scan = {
				id: entry.scan_id,
				status: String( entry.result.status || '' ).toUpperCase(),
				changesDetected: entry.result.changes || 0,
				highestSeverity: String( entry.result.severity || '' ).toUpperCase() || null,
			};
		}
		if ( ! scan ) {
			// Older than the recent scan list: the check ran; details are in
			// MyKavo's scan history.
			return { tone: 'done', text: __( 'Checked', 'mykavo' ) };
		}
		if ( scan.status === 'QUEUED' || scan.status === 'RUNNING' ) {
			return { tone: 'busy', text: __( 'Checking your pages now...', 'mykavo' ) };
		}
		if ( scan.status === 'FAILED' ) {
			return { tone: 'bad', text: __( 'The check could not finish', 'mykavo' ) };
		}
		if ( ! scan.changesDetected ) {
			return { tone: 'good', text: __( 'Verified - nothing changed', 'mykavo' ) };
		}
		return {
			tone: scan.highestSeverity === 'CRITICAL' || scan.highestSeverity === 'HIGH' ? 'bad' : 'warn',
			text: isUpdate( entry )
				? sprintf( _n( '%d change found after this update', '%d changes found after this update', scan.changesDetected, 'mykavo' ), scan.changesDetected )
				: sprintf( _n( '%d change found after this change', '%d changes found after this change', scan.changesDetected, 'mykavo' ), scan.changesDetected ),
			severity: scan.highestSeverity,
			scanId: scan.id,
		};
	}

	function verdictBadge( v ) {
		var ic = { good: 'check', bad: 'alert', warn: 'eye', busy: 'loader', quiet: 'clock', done: 'check' }[ v.tone ];
		return '<span class="mk-verdict mk-verdict-' + v.tone + '">' + icon( ic, v.tone === 'busy' ? 'mk-spin' : '' ) + esc( v.text ) + '</span>';
	}

	function itemIcon( type ) {
		return type === 'theme' ? 'brush' : type === 'core' ? 'wp' : type === 'translation' ? 'file' : 'plug';
	}

	/** "Roll back to 8.1.0" for one plugin of an update. */
	function rollbackButton() {
		return '';
	}

	/** What happened with rollback for one update, in a line. */
	function rollbackNote() {
		return '';
	}

	function updateEntry( entry, scans, compact ) {
		var v = verdict( entry, scans );
		var items = entry.items || [];
		var billing = state.overview && state.overview.links ? safeUrl( state.overview.links.billing ) : '';
		var actions = '';
		if ( v.scanId ) {
			actions = '<button type="button" class="mk-btn mk-btn-sm mk-btn-dark" data-act="update-changes" data-scan="' + esc( v.scanId ) + '" data-note="' + esc( updateTitle( entry ) ) + '">' + esc( __( 'Review changes', 'mykavo' ) ) + icon( 'chevron' ) + '</button>';
		} else if ( v.upgrade && billing ) {
			actions = '<a class="mk-btn mk-btn-sm mk-btn-primary" href="' + esc( billing ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Upgrade', 'mykavo' ) ) + icon( 'external' ) + '</a>';
		}
		if ( ! compact && items.length === 1 ) {
			actions += rollbackButton( entry, items[ 0 ], false );
		}
		return (
			'<li class="mk-update">' +
			'<span class="mk-update-icon">' + icon( itemIcon( items[ 0 ] && items[ 0 ].type ) ) + '</span>' +
			'<div class="mk-update-main">' +
			'<p class="mk-update-title">' + esc( updateTitle( entry ) ) + '</p>' +
			'<p class="mk-row-meta"><span title="' + esc( when( new Date( entry.at * 1000 ).toISOString() ) ) + '">' + esc( rel( new Date( entry.at * 1000 ).toISOString() ) ) + '</span>' +
			'</p>' +
			verdictBadge( v ) +
			( compact ? '' : crashLine( entry ) + batchLine( entry ) + rollbackNote( entry ) ) +
			( ! compact && items.length > 1
				? '<ul class="mk-update-items">' + items.map( function ( it ) {
					var name = it.type === 'core' ? 'WordPress' : it.name;
					return '<li>' + icon( itemIcon( it.type ) ) + '<span>' + esc( name ) + '</span><code>' + esc( it.from && it.to ? it.from + ' → ' + it.to : it.to || '' ) + '</code>' + rollbackButton( entry, it, true ) + '</li>';
				} ).join( '' ) + '</ul>'
				: '' ) +
			'</div>' +
			( actions ? '<div class="mk-update-side">' + actions + '</div>' : '' ) +
			'</li>'
		);
	}

	function updatesView() {
		if ( state.updatesError && ! state.updates ) {
			return errorBlock( state.updatesError, 'retry-updates' );
		}
		if ( ! state.updates ) {
			return loadingBlock( 260 );
		}
		var on = !! state.updates.enabled;
		var planOk = ! state.overview || state.overview.capabilities.updateChecks;
		var billing = state.overview && state.overview.links ? safeUrl( state.overview.links.billing ) : '';
		var scans = scansById();
		var log = state.updates.log || [];

		var intro =
			'<section class="mk-card mk-safe">' +
			'<div class="mk-safe-copy"><span class="mk-safe-icon">' + icon( 'shield' ) + '</span><div>' +
			'<h2>' + esc( __( 'Change your theme without fear', 'mykavo' ) ) + '</h2>' +
			'<p>' + esc( __( 'Every time your live theme is published or edited, MyKavo checks your store against the approved baseline and tells you whether anything broke - and which change did it. Edits are checked at most every 15 minutes while you work in the theme editor.', 'mykavo' ) ) + '</p>' +
			'</div></div>' +
			'<button type="button" class="mk-switch" role="switch" aria-checked="' + on + '" data-act="toggle-updates" data-key="toggle-updates">' +
			'<span class="mk-switch-track"><span class="mk-switch-thumb"></span></span>' +
			'<span>' + esc( on ? __( 'Checks on', 'mykavo' ) : __( 'Checks off', 'mykavo' ) ) + '</span></button>' +
			'</section>';

		var plan = planOk
			? ''
			: '<div class="mk-banner">' + icon( 'zap' ) + '<span>' + esc( __( 'Theme changes are listed here on every plan. Checking the store automatically after each one comes with paid plans, from Starter.', 'mykavo' ) ) + '</span>' +
				( billing ? '<a class="mk-btn mk-btn-primary mk-btn-sm" href="' + esc( billing ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'See plans', 'mykavo' ) ) + '</a>' : '' ) + '</div>';

		var list = log.length
			? '<ul class="mk-list mk-updates">' + log.map( function ( e ) {
				return updateEntry( e, scans, false );
			} ).join( '' ) + '</ul>'
			: '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'shield' ) + '</span><strong>' + esc( __( 'No theme changes yet', 'mykavo' ) ) + '</strong><span>' +
				esc( __( 'The next time your live theme is published or edited, it appears here with a verdict.', 'mykavo' ) ) + '</span></div>';

		return (
			'<div class="mk-grid">' + intro + plan + safeUpdateCard() + autoRollbackCard() +
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Theme changes', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Last 30 changes.', 'mykavo' ) ) + '</span></div>' + list + '</section>' +
			'<div class="mk-grid mk-grid-2">' + healthCard() + windowCard() + '</div>' +
			'<div class="mk-grid mk-grid-2">' + snapshotsCard() + mailCard() + '</div></div>'
		);
	}

	/** A short line about a feature this plan does not include. */
	function upsell( text ) {
		var url = safeUrl( cfg.pricingUrl || 'https://mykavo.app/pricing' );
		return (
			'<p class="mk-upsell">' + icon( 'zap' ) + '<span>' + esc( text ) + ' ' +
			'<a class="mk-link" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'See plans', 'mykavo' ) ) + icon( 'external' ) + '</a></span></p>'
		);
	}

	function autoRollbackCard() {
		return '';
	}

	function shortDate( day ) {
		var d = new Date( String( day ) + 'T00:00:00Z' );
		return isNaN( d.getTime() ) ? String( day || '' ) : d.toLocaleDateString( locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' } );
	}

	function healthCard() {
		return '';
	}

	var DAY_FMT = window.Intl && Intl.DateTimeFormat ? new Intl.DateTimeFormat( locale, { weekday: 'short', timeZone: 'UTC' } ) : null;

	function dayName( d ) {
		// 7 January 2024 was a Sunday (day 0).
		return DAY_FMT ? DAY_FMT.format( new Date( Date.UTC( 2024, 0, 7 + d ) ) ) : [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ][ d ];
	}

	function hourLabel( h ) {
		return ( h < 10 ? '0' : '' ) + h + ':00';
	}

	function windowSummary( w ) {
		// Monday first.
		var days = ( w.days || [] ).slice().sort( function ( a, b ) {
			return ( ( a + 6 ) % 7 ) - ( ( b + 6 ) % 7 );
		} ).map( dayName ).join( ', ' );
		if ( ( w.days || [] ).length === 7 ) {
			return sprintf(
				/* translators: 1: start time, 2: end time, 3: time zone. */
				__( 'Automatic updates run only every day from %1$s to %2$s (%3$s).', 'mykavo' ),
				hourLabel( w.startHour ),
				hourLabel( w.endHour ),
				w.timezone
			);
		}
		return sprintf(
			/* translators: 1: days of the week, 2: start time, 3: end time, 4: time zone. */
			__( 'Automatic updates run only on %1$s, from %2$s to %3$s (%4$s).', 'mykavo' ),
			days,
			hourLabel( w.startHour ),
			hourLabel( w.endHour ),
			w.timezone
		);
	}

	function windowForm() {
		return '';
	}

	function windowCard() {
		return '';
	}

	function pathKey( value ) {
		try {
			var u = new URL( String( value ) );
			return u.host.replace( /^www\./, '' ) + ( u.pathname.replace( /\/+$/, '' ) || '/' );
		} catch ( e ) {
			return String( value || '' );
		}
	}

	function addPages( urls, doneText ) {
		state.busy = 'add-pages';
		render();
		return api( '/pages', { method: 'POST', data: { urls: urls } } )
			.then( function ( data ) {
				toast( data && data.added
					? sprintf( _n( '%d page added. Its baseline is recorded on the next scan.', '%d pages added. Their baselines are recorded on the next scan.', data.added, 'mykavo' ), data.added )
					: doneText || __( 'That page is already monitored.', 'mykavo' ) );
				state.addUrl = '';
				loadPages();
				loadOverview( true );
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.banner = { tone: 'bad', text: errorMessage( err ) };
				}
			} )
			.then( function () {
				state.busy = '';
				render();
			} );
	}

	/** WooCommerce: are the pages that take money monitored? */
	function storeCard() {
		var woo = cfg.woo;
		if ( ! woo || ! woo.pages || ! woo.pages.length ) {
			return '';
		}
		if ( ! state.pages ) {
			return state.pagesError ? '' : loadingBlock( 120 );
		}
		var monitored = {};
		state.pages.pages.forEach( function ( p ) {
			monitored[ pathKey( p.url ) ] = true;
		} );
		var missing = woo.pages.filter( function ( p ) {
			return ! monitored[ pathKey( p.url ) ];
		} );
		var busy = state.busy === 'add-pages';
		return (
			'<section class="mk-card mk-store"><div class="mk-card-head"><h3 class="mk-card-title">' + icon( 'lock', 'mk-title-icon' ) + esc( __( 'Protect your store', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">Shopify</span></div>' +
			'<ul class="mk-store-list">' + woo.pages.map( function ( p ) {
				var ok = monitored[ pathKey( p.url ) ];
				return '<li class="' + ( ok ? 'is-on' : 'is-off' ) + '">' + icon( ok ? 'check' : 'alert' ) + '<span>' + esc( p.label ) + '</span><em>' +
					esc( ok ? __( 'Monitored', 'mykavo' ) : __( 'Not monitored', 'mykavo' ) ) + '</em></li>';
			} ).join( '' ) + '</ul>' +
			( missing.length
				? '<div class="mk-store-foot"><p>' + esc( __( 'A broken cart or checkout costs sales every minute. Monitor them so you hear about it first.', 'mykavo' ) ) + '</p>' +
					'<button type="button" class="mk-btn mk-btn-primary mk-btn-sm" data-act="guard-store"' + ( busy ? ' disabled' : '' ) + '>' +
					( busy ? icon( 'loader', 'mk-spin' ) : icon( 'shield' ) ) +
					esc( sprintf( _n( 'Monitor %d store page', 'Monitor %d store pages', missing.length, 'mykavo' ), missing.length ) ) + '</button></div>'
				: '<div class="mk-store-foot"><p class="mk-store-ok">' + icon( 'check' ) + esc( __( 'Your key store pages are all monitored.', 'mykavo' ) ) + '</p></div>' ) +
			guardBlock() +
			'</section>'
		);
	}

	/** WooCommerce checkout guard: watch the buttons that take money. */
	function guardBlock() {
		return '';
	}


	/* ------------------------------------------------------- AI crawlers -- */

	function utcDay( offsetDays ) {
		return new Date( Date.now() - ( offsetDays || 0 ) * 86400000 ).toISOString().slice( 0, 10 );
	}

	function dayLabel( day ) {
		if ( day === utcDay( 0 ) ) {
			return __( 'Today', 'mykavo' );
		}
		if ( day === utcDay( 1 ) ) {
			return __( 'Yesterday', 'mykavo' );
		}
		var d = new Date( day + 'T00:00:00Z' );
		return isNaN( d.getTime() ) ? day : d.toLocaleDateString( locale, { month: 'short', day: 'numeric', timeZone: 'UTC' } );
	}

	function purposeLabel( purpose ) {
		return {
			search: __( 'Reads pages for AI search answers', 'mykavo' ),
			user: __( 'Opens a page a person asked about', 'mykavo' ),
			training: __( 'Collects training data', 'mykavo' ),
		}[ purpose ] || '';
	}

	function num( n ) {
		return ( Number( n ) || 0 ).toLocaleString( locale );
	}


	function botsView() {
		if ( state.botsError && ! state.bots ) {
			return errorBlock( state.botsError, 'retry-bots' );
		}
		if ( ! state.bots ) {
			return loadingBlock( 260 );
		}
		var b = state.bots;
		var on = !! b.enabled;
		var intro =
			'<section class="mk-card mk-safe">' +
			'<div class="mk-safe-copy"><span class="mk-safe-icon">' + icon( 'bot' ) + '</span><div>' +
			'<h2>' + esc( __( 'Which AI reads your site', 'mykavo' ) ) + '</h2>' +
			'<p>' + esc( __( 'ChatGPT, Claude, Perplexity and other AI systems send crawlers to read your pages before they quote or recommend them. MyKavo counts those visits - by crawler name only: no IP addresses, no cookies, nothing about human visitors.', 'mykavo' ) ) + '</p>' +
			'</div></div>' +
			'<button type="button" class="mk-switch" role="switch" aria-checked="' + on + '" data-act="toggle-bots" data-key="toggle-bots">' +
			'<span class="mk-switch-track"><span class="mk-switch-thumb"></span></span>' +
			'<span>' + esc( on ? __( 'Counting on', 'mykavo' ) : __( 'Counting off', 'mykavo' ) ) + '</span></button>' +
			'</section>';

		var robots = robotsCard();
		var history = historyCard();

		if ( ! b.ready ) {
			return '<div class="mk-grid">' + intro + '<div class="mk-banner">' + icon( 'alert' ) + '<span>' +
				esc( __( 'MyKavo could not create its small visit-count table in this site\'s database. Your hosting may not allow new tables. It retries once a day.', 'mykavo' ) ) + '</span></div>' + robots + llmsCard() + history + '</div>';
		}

		var foot =
			'<p class="mk-fine mk-bots-note">' +
			esc( __( 'Counts visits that reach this site\'s server. Pages served straight from a page cache or CDN may not be counted, so real numbers can be higher. Crawlers are identified by the name they send.', 'mykavo' ) ) +
			( b.sentAt ? ' ' + esc( sprintf( /* translators: %s: relative time, e.g. "3 hours ago". */ __( 'Daily totals are shared with your MyKavo dashboard (last sent %s).', 'mykavo' ), rel( b.sentAt ) ) ) : ' ' + esc( __( 'Daily totals are shared with your MyKavo dashboard once a day.', 'mykavo' ) ) ) +
			'</p>';

		if ( ! b.total ) {
			return '<div class="mk-grid">' + intro +
				'<section class="mk-card"><div class="mk-empty"><span class="mk-empty-icon">' + icon( 'bot' ) + '</span><strong>' +
				esc( on ? __( 'No AI crawler visits yet', 'mykavo' ) : __( 'Counting is off', 'mykavo' ) ) + '</strong><span>' +
				esc( on
					? __( 'Visits appear here as they happen. ChatGPT, Claude and Perplexity usually show up within a few days. If none ever do, check that robots.txt does not block them.', 'mykavo' )
					: __( 'Switch counting on to see which AI systems read your site.', 'mykavo' ) ) +
				'</span></div></section>' + robots + llmsCard() + history + foot + '</div>';
		}

		var answerHits = 0;
		( b.agents || [] ).forEach( function ( a ) {
			if ( a.purpose !== 'training' ) {
				answerHits += a.hits;
			}
		} );
		var stats =
			'<div class="mk-stats mk-stats-cards">' +
			stat( 'activity', __( 'AI crawler visits', 'mykavo' ), num( b.total ), '', __( 'Last 30 days', 'mykavo' ) ) +
			stat( 'eye', __( 'For AI answers', 'mykavo' ), num( answerHits ), '', __( 'Search and "read this page" visits', 'mykavo' ) ) +
			stat( 'bot', __( 'Crawlers seen', 'mykavo' ), b.agents.length, '', __( 'Different AI crawlers', 'mykavo' ) ) +
			stat( 'alert', __( 'Errors served', 'mykavo' ), num( b.errors ), '', __( 'Visits that got a 4xx or 5xx', 'mykavo' ) ) +
			'</div>';

		var max = 1;
		b.daily.forEach( function ( d ) {
			max = Math.max( max, d.hits );
		} );
		var chart =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Visits per day', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Last 30 days (UTC)', 'mykavo' ) ) + '</span></div>' +
			'<div class="mk-bars" role="img" aria-label="' + esc( sprintf( /* translators: %s: number of visits. */ __( '%s AI crawler visits over the last 30 days', 'mykavo' ), num( b.total ) ) ) + '">' +
			b.daily.map( function ( d ) {
				var h = d.hits ? Math.max( 4, Math.round( ( d.hits / max ) * 100 ) ) : 0;
				return '<span class="mk-bar' + ( d.hits ? '' : ' is-zero' ) + '" style="height:' + ( d.hits ? h : 3 ) + '%" title="' + esc( dayLabel( d.day ) + ': ' + num( d.hits ) ) + '"></span>';
			} ).join( '' ) +
			'</div></section>';

		var crawlers =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Crawlers', 'mykavo' ) ) + '</h3></div>' +
			'<div class="mk-table-wrap"><table class="mk-table"><thead><tr>' +
			'<th>' + esc( __( 'Crawler', 'mykavo' ) ) + '</th><th>' + esc( __( 'Why it visits', 'mykavo' ) ) + '</th>' +
			'<th class="mk-num">' + esc( __( 'Visits', 'mykavo' ) ) + '</th><th class="mk-num">' + esc( __( 'Errors', 'mykavo' ) ) + '</th><th>' + esc( __( 'Real or fake?', 'mykavo' ) ) + '</th><th>' + esc( __( 'Last seen', 'mykavo' ) ) + '</th>' +
			'</tr></thead><tbody>' +
			b.agents.map( function ( a ) {
				return '<tr><td><b>' + esc( a.owner ) + '</b><span class="mk-cell-note"><code>' + esc( a.agent ) + '</code></span></td>' +
					'<td>' + esc( purposeLabel( a.purpose ) ) + '</td>' +
					'<td class="mk-num">' + esc( num( a.hits ) ) + '</td>' +
					'<td class="mk-num' + ( a.errors ? ' mk-bad' : '' ) + '">' + esc( num( a.errors ) ) + '</td>' +
					'<td>' + verifyCell( a ) + '</td>' +
					'<td>' + esc( dayLabel( a.lastSeen ) ) + '</td></tr>';
			} ).join( '' ) +
			'</tbody></table></div></section>';

		var pages =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Pages AI reads most', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Last 30 days', 'mykavo' ) ) + '</span></div>' +
			'<div class="mk-table-wrap"><table class="mk-table"><thead><tr>' +
			'<th>' + esc( __( 'Page', 'mykavo' ) ) + '</th><th class="mk-num">' + esc( __( 'Visits', 'mykavo' ) ) + '</th><th class="mk-num">' + esc( __( 'Errors', 'mykavo' ) ) + '</th><th>' + esc( __( 'By', 'mykavo' ) ) + '</th>' +
			'</tr></thead><tbody>' +
			b.pages.map( function ( p ) {
				return '<tr><td><code class="mk-path">' + esc( p.path ) + '</code></td>' +
					'<td class="mk-num">' + esc( num( p.hits ) ) + '</td>' +
					'<td class="mk-num' + ( p.errors ? ' mk-bad' : '' ) + '">' + esc( num( p.errors ) ) + '</td>' +
					'<td class="mk-cell-agents">' + esc( p.agents.join( ', ' ) ) + '</td></tr>';
			} ).join( '' ) +
			'</tbody></table></div></section>';

		return '<div class="mk-grid">' + intro + stats + chart + history + crawlers + pages + missingCard() + robots + llmsCard() + foot + '</div>';
	}

	/** Twelve months of AI crawler visits, from MyKavo (paid plans). */
	function historyCard() {
		return '';
	}

	/* ---------------------------------------------------------------- 1.3.0 -- */

	/** Viewers (the MyKavo viewer role) see everything and change nothing. */
	var READONLY = cfg.canManage === false;
	var MANAGE_ACTS = {
		scan: 1, rollback: 1, 'toggle-auto-rollback': 1, 'toggle-robots': 1, 'toggle-updates': 1, 'toggle-bots': 1,
		'change-action': 1, disconnect: 1, 'guard-checkout': 1, 'store-add': 1, 'health-refresh': 1, 'window-edit': 1,
		'window-off': 1, 'dismiss-alert': 1, 'safe-start': 1, 'safe-backup': 1, 'safe-baseline': 1, 'robots-block': 1,
		'robots-preset': 1, 'robots-allow-all': 1, 'toggle-llms': 1, 'redirect-create': 1, 'redirect-remove': 1,
		'redirect-suggest': 1, 'redirect-use': 1, 'toggle-vuln-auto': 1, 'toggle-mail': 1, 'mail-test': 1, 'forms-sync': 1,
		'suggest-add': 1, 'suggest-toggle': 1, 'pick-element': 1, 'branding-save': 1,
	};

	var PLAN_RANK = { free: 0, starter: 1, pro: 2, agency: 3 };
	var METALS = {
		free: { rim: [ '#D9DCE1', '#9AA1AB', '#5F6670' ], glow: 'rgba(154,161,171,0.25)', rays: [] },
		starter: { rim: [ '#FAD3AE', '#C9844A', '#7C4318' ], glow: 'rgba(201,132,74,0.45)', rays: [ 0 ] },
		pro: { rim: [ '#FFFFFF', '#C6CCD6', '#7A8391' ], glow: 'rgba(198,204,214,0.5)', rays: [ -34, 0, 34 ] },
		agency: { rim: [ '#FFF3B0', '#FFCF00', '#B07F00' ], glow: 'rgba(255,207,0,0.55)', rays: [ -62, -31, 0, 31, 62 ] },
	};
	var badgeSeq = 0;

	function planId() {
		var id = state.overview && state.overview.workspace && state.overview.workspace.plan ? String( state.overview.workspace.plan.id ) : '';
		return PLAN_RANK.hasOwnProperty( id ) ? id : 'free';
	}

	function planAtLeast( id ) {
		return PLAN_RANK[ planId() ] >= PLAN_RANK[ id ];
	}

	function metalName( plan ) {
		return { free: __( 'Steel', 'mykavo' ), starter: __( 'Bronze', 'mykavo' ), pro: __( 'Silver', 'mykavo' ), agency: __( 'Gold', 'mykavo' ) }[ plan ];
	}

	function planLabel( plan ) {
		return { free: __( 'Free', 'mykavo' ), starter: __( 'Starter', 'mykavo' ), pro: __( 'Pro', 'mykavo' ), agency: __( 'Agency', 'mykavo' ) }[ plan ];
	}

	/** The plan medal: a hexagon in the plan's metal with the MyKavo spark. Same art as mykavo.app. */
	function planBadge( plan, size ) {
		var m = METALS[ plan ] || METALS.free;
		var id = 'mkb' + ( ++badgeSeq );
		var hex = 'M32 4.5c1.2 0 2.3.3 3.3.9l19.4 11.2a6.6 6.6 0 0 1 3.3 5.7v22.4a6.6 6.6 0 0 1-3.3 5.7L35.3 61.6a6.6 6.6 0 0 1-6.6 0L9.3 50.4A6.6 6.6 0 0 1 6 44.7V22.3a6.6 6.6 0 0 1 3.3-5.7L28.7 5.4c1-.6 2.1-.9 3.3-.9Z';
		var page = 'M18.5 19.5h8.2l-7.4 12.5 7.4 12.5h-8.2a1.6 1.6 0 0 1-1.6-1.6v-21.8a1.6 1.6 0 0 1 1.6-1.6Z';
		var inner = 'translate(32 32) scale(0.84) translate(-32 -32)';
		var rays = m.rays.map( function ( a ) {
			var len = 21 - Math.abs( a ) / 9;
			var rad = ( a * Math.PI ) / 180;
			var nx = -Math.sin( rad ) * 3;
			var ny = Math.cos( rad ) * 3;
			var f = function ( n ) {
				return n.toFixed( 2 );
			};
			return '<path fill="url(#m' + id + ')" d="M' + f( 27.5 + nx ) + ' ' + f( 32 + ny ) + 'L' + f( 27.5 + Math.cos( rad ) * len ) + ' ' + f( 32 + Math.sin( rad ) * len ) + 'L' + f( 27.5 - nx ) + ' ' + f( 32 - ny ) + 'Z"/>';
		} ).join( '' );
		return (
			'<svg class="mk-medal" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true" style="filter:drop-shadow(0 2px 6px ' + m.glow + ')">' +
			'<defs><linearGradient id="r' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m.rim[ 0 ] + '"/><stop offset=".5" stop-color="' + m.rim[ 1 ] + '"/><stop offset="1" stop-color="' + m.rim[ 2 ] + '"/></linearGradient>' +
			'<linearGradient id="m' + id + '" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="' + m.rim[ 0 ] + '"/><stop offset=".55" stop-color="' + m.rim[ 1 ] + '"/><stop offset="1" stop-color="' + m.rim[ 2 ] + '"/></linearGradient>' +
			'<radialGradient id="c' + id + '" cx=".35" cy=".25" r=".85"><stop offset="0" stop-color="#2A2A2A"/><stop offset="1" stop-color="#0B0B0B"/></radialGradient></defs>' +
			'<path d="' + hex + '" fill="url(#r' + id + ')"/>' +
			'<path d="' + hex + '" transform="' + inner + '" fill="url(#c' + id + ')"/>' +
			'<path d="' + hex + '" transform="' + inner + '" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width=".8"/>' +
			'<path d="' + page + '" fill="url(#m' + id + ')"/>' + rays +
			'<path d="M12 18.5 32 7l20 11.5" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1" stroke-linecap="round"/>' +
			'</svg>'
		);
	}

	/** The plan, as a medal and its name, in the top bar. Opens the Plan tab. */
	function planChip() {
		return '';
	}

	function billingUrl() {
		var links = ( state.overview && state.overview.links ) || {};
		return safeUrl( links.billing ) || '';
	}

	function upgradeButton( label, cls ) {
		var url = billingUrl();
		return url ? '<a class="mk-btn mk-btn-primary ' + ( cls || '' ) + '" href="' + esc( url ) + '" target="_top">' + icon( 'zap' ) + esc( label || __( 'Upgrade to Pro', 'mykavo' ) ) + '</a>' : '';
	}

	/** Words for a paid feature this plan lacks: "comes with Pro", or "rolling out" when it already should. */
	function lockedText( need, what ) {
		if ( planAtLeast( need ) ) {
			/* translators: %s: feature description. */
			return sprintf( __( '%s is rolling out to your plan. It appears here as soon as MyKavo switches it on.', 'mykavo' ), what );
		}
		var names = { starter: __( 'paid plans, from Starter', 'mykavo' ), pro: __( 'Pro and Agency', 'mykavo' ), agency: __( 'Agency', 'mykavo' ) };
		/* translators: 1: feature description, 2: plans. */
		return sprintf( __( '%1$s comes with %2$s.', 'mykavo' ), what, names[ need ] );
	}

	function copyButton( text, label ) {
		return '<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="copy" data-copy="' + esc( text ) + '">' + icon( 'copy' ) + esc( label || __( 'Copy', 'mykavo' ) ) + '</button>';
	}

	function switchButton( act, on, onLabel, offLabel, busy ) {
		return (
			'<button type="button" class="mk-switch" role="switch" aria-checked="' + ( on ? 'true' : 'false' ) + '" data-act="' + act + '" data-key="' + act + '"' + ( busy || READONLY ? ' disabled' : '' ) + '>' +
			'<span class="mk-switch-track"><span class="mk-switch-thumb"></span></span>' +
			'<span>' + esc( on ? onLabel : offLabel ) + '</span></button>'
		);
	}

	/** GET a local route into state[ key ]; errors into state[ key + 'Error' ]. */
	function loadInto( key, path ) {
		return api( path )
			.then( function ( data ) {
				state[ key ] = data;
				state[ key + 'Error' ] = null;
				render();
				return data;
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state[ key + 'Error' ] = errorMessage( err );
					render();
				}
			} );
	}

	/** POST (or DELETE) to a local route, then put the answer in state[ key ]. */
	function send( path, data, key, busy, done, method ) {
		state.busy = busy;
		render();
		return api( path, { method: method || 'POST', data: data || {} } )
			.then( function ( result ) {
				if ( key ) {
					state[ key ] = result;
				}
				if ( done ) {
					done( result );
				}
				return result;
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.banner = { tone: 'bad', text: errorMessage( err ) };
				}
			} )
			.then( function ( result ) {
				state.busy = '';
				render();
				return result;
			} );
	}

	/* ------------------------------------------------- silent disasters -- */

	function alertsBanner() {
		return '';
	}

	/* -------------------------------------------------------- site audit -- */

	function auditCard( o ) {
		var links = o.links || {};
		var url = safeUrl( links.siteAudit ) || safeUrl( ( cfg.appUrl || 'https://mykavo.app' ) + '/dashboard/site-audit' );
		var a = o.siteAudit;
		var score = a && typeof a.healthScore === 'number' ? a.healthScore : null;
		var tone = score === null ? '' : score >= 90 ? 'good' : score >= 70 ? 'warn' : 'bad';
		var body = a
			? ( score !== null
				? '<div class="mk-audit-score mk-audit-' + tone + '">' + bigNum( score ) + '<span class="mk-unit">/100</span></div>' +
					'<p class="mk-fine">' + esc( sprintf( /* translators: 1: errors, 2: warnings. */ __( '%1$d errors, %2$d warnings', 'mykavo' ), a.errors || 0, a.warnings || 0 ) ) +
					( a.completedAt ? ' · ' + esc( rel( a.completedAt ) ) : '' ) + '</p>'
				: '<p class="mk-fine">' + esc( a.status === 'FAILED' ? __( 'The last audit could not finish.', 'mykavo' ) : __( 'An audit is running.', 'mykavo' ) ) + '</p>' )
			: '<p class="mk-fine">' + esc( __( 'A technical SEO crawl of your whole site: titles, links, speed, security and 70+ more checks.', 'mykavo' ) ) + '</p>';
		return (
			'<section class="mk-card mk-card-pad mk-audit">' +
			'<div class="mk-card-head mk-card-head-flush"><div><h3 class="mk-card-title">' + esc( __( 'Site audit', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Your site with MyKavo', 'mykavo' ) ) + '</p></div>' +
			'<a class="mk-iconbtn" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc( __( 'Open site audit', 'mykavo' ) ) + '">' + icon( 'arrow' ) + '</a></div>' +
			body +
			'<a class="mk-btn mk-btn-dark mk-btn-sm" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' + esc( a ? __( 'Open site audit', 'mykavo' ) : __( 'Run a site audit', 'mykavo' ) ) + icon( 'external' ) + '</a>' +
			'</section>'
		);
	}

	/* ------------------------------------------------------------- plan -- */

	/** The workspace card on the Overview: medal, plan, and the way up. */
	function workspaceCard( o ) {
		var p = planId();
		return (
			'<section class="mk-card mk-card-pad mk-workspace">' +
			'<div class="mk-workspace-row">' + planBadge( p, 52 ) +
			'<div><p class="mk-eyebrow">' + esc( o.workspace.name ) + '</p>' +
			'<p class="mk-workspace-plan">' + esc( sprintf( /* translators: 1: plan name, 2: metal name. */ __( '%1$s plan · %2$s', 'mykavo' ), planLabel( p ), metalName( p ) ) ) + '</p></div></div>' +
			( planAtLeast( 'pro' ) ? '' : '<p class="mk-fine">' + esc( __( 'Pro checks 8 sites daily, rolls back broken updates by itself and answers in ChatGPT and Claude.', 'mykavo' ) ) + '</p>' + upgradeButton( __( 'Upgrade to Pro', 'mykavo' ), 'mk-btn-sm' ) ) +
			
			'</section>'
		);
	}

	var PRO_BENEFITS = [
		[ 'activity', 'pro', __( 'Daily checks on 8 websites', 'mykavo' ), __( '15 pages each, checked every day instead of every week, plus 20 manual scans a day.', 'mykavo' ) ],
		[ 'shield', 'starter', __( 'A check after every update', 'mykavo' ), __( 'MyKavo compares your pages after each theme change, and names the one that broke something.', 'mykavo' ) ],
		[ 'undo', 'pro', __( 'Automatic rollback', 'mykavo' ), __( 'When an update breaks something critical, it is put back by itself - day or night - and the site checked again.', 'mykavo' ) ],
		[ 'clock', 'pro', __( 'Risky updates held back', 'mykavo' ), __( 'An automatic update that caused changes on other MyKavo sites waits 48 hours before it reaches yours.', 'mykavo' ) ],
		[ 'lock', 'pro', __( 'Security fixes, automatically', 'mykavo' ), __( 'Known security issues are fixed as soon as a fix is out.', 'mykavo' ) ],
		[ 'eye', 'pro', __( 'Watch buttons and forms', 'mykavo' ), __( 'Pick a buy button or contact form on the page; get a critical alert the moment it disappears or changes.', 'mykavo' ) ],
		[ 'bell', 'pro', __( 'Contact forms tested', 'mykavo' ), __( 'MyKavo sends a test entry through your contact forms so you know messages still arrive.', 'mykavo' ) ],
		[ 'bot', 'pro', __( 'Ask ChatGPT and Claude', 'mykavo' ), __( 'Connect MyKavo to your AI assistant and ask what changed on your sites, in plain words.', 'mykavo' ) ],
		[ 'zap', 'pro', __( '100 AI explanations a month', 'mykavo' ), __( 'Every change explained: what it means for visitors and SEO, and what to do.', 'mykavo' ) ],
		[ 'layers', 'pro', __( 'Site audits of 1,500 pages', 'mykavo' ), __( 'A full technical SEO crawl, up to ten times a day.', 'mykavo' ) ],
		[ 'file', 'pro', __( 'A year of history', 'mykavo' ), __( 'Every change, scan and screenshot kept for 12 months, and up to 3 team members.', 'mykavo' ) ],
	];

	function planView() {
		return '';
	}

	/** ChatGPT, Claude and other AI assistants, through MyKavo's MCP server (Pro and Agency). */
	function mcpCard() {
		return '';
	}

	/* ---------------------------------------------------- safe update all -- */

	function safeUpdateCard() {
		return '';
	}

	/** "7 updated, 6 verified, 1 rolled back" (verified by MyKavo's check, or by the local one on free plans). */
	function safeVerdict( sum ) {
		var parts = [ sprintf( /* translators: %d: number of plugins. */ _n( '%d updated', '%d updated', sum.updated, 'mykavo' ), sum.updated ) ];
		var kept = sum.kept ? sum.kept.length : 0;
		if ( kept ) {
			parts.push( sprintf( /* translators: %d: number of plugins. */ _n( '%d verified', '%d verified', kept, 'mykavo' ), kept ) );
		}
		var rolled = ( sum.rolledBack || [] ).filter( function ( r ) {
			return r.outcome === 'rolled-back';
		} ).length;
		if ( rolled ) {
			parts.push( sprintf( /* translators: %d: number of plugins. */ _n( '%d rolled back', '%d rolled back', rolled, 'mykavo' ), rolled ) );
		}
		if ( sum.failed && sum.failed.length ) {
			parts.push( sprintf( /* translators: %d: number of plugins. */ _n( '%d failed', '%d failed', sum.failed.length, 'mykavo' ), sum.failed.length ) );
		}
		return parts.join( ', ' );
	}

	function startSafeUpdate() {
		var s = state.safe;
		if ( ! s || ! s.plugins.length ) {
			return;
		}
		var backup = !! ( s.backup && s.backup.canStart && s.backupFirst );
		var baseline = feat( 'baselineBeforeUpdate' ) && state.safeBaseline !== false;
		state.safeRun = { rows: {}, current: '', phase: 'start', summary: null };
		render();
		api( '/safe-update/start', { method: 'POST', data: { backup: backup, baseline: baseline } } )
			.then( function ( data ) {
				var b = data.batch || {};
				if ( b.backup && b.backup.state === 'running' ) {
					state.safeRun.phase = 'backup';
					render();
					return waitFor( function () {
						return state.safeRun.skipBackup ? Promise.resolve( true ) : api( '/safe-update' ).then( function ( o ) {
							return ! o.batch || ! o.batch.backup || o.batch.backup.state !== 'running';
						} );
					}, 10000, 120 );
				}
			} )
			.then( function () {
				if ( ! baseline ) {
					return;
				}
				state.safeRun.phase = 'baseline';
				render();
				return waitFor( function () {
					return loadOverview( true ).then( function () {
						return ! ( state.overview && state.overview.scanInProgress );
					} );
				}, 8000, 75 );
			} )
			.then( function () {
				state.safeRun.phase = 'updating';
				return s.plugins.reduce( function ( chain, p ) {
					return chain.then( function () {
						state.safeRun.current = p.file;
						render();
						return api( '/safe-update/plugin', { method: 'POST', data: { file: p.file } } )
							.then( function ( row ) {
								state.safeRun.rows[ p.file ] = row;
							} )
							.catch( function ( err ) {
								state.safeRun.rows[ p.file ] = { outcome: 'failed', problem: errorMessage( err ) };
							} );
					} );
				}, Promise.resolve() );
			} )
			.then( function () {
				state.safeRun.current = '';
				return api( '/safe-update/finish', { method: 'POST' } );
			} )
			.then( function ( result ) {
				state.safeRun.phase = 'done';
				state.safeRun.summary = result.summary;
				state.updates = null;
				state.scans = null;
				loadUpdates();
				loadScans( true );
				loadInto( 'safe', '/safe-update' );
				loadInto( 'snaps', '/snapshots' );
			} )
			.catch( function ( err ) {
				state.safeRun = null;
				state.banner = { tone: 'bad', text: errorMessage( err ) };
				render();
			} );
	}

	/** Ask check() every `ms` until it says true, at most `tries` times. */
	function waitFor( check, ms, tries ) {
		return new Promise( function ( resolve ) {
			var n = 0;
			var tick = function () {
				Promise.resolve( check() ).then( function ( ok ) {
					if ( ok || ++n >= tries ) {
						resolve();
					} else {
						window.setTimeout( tick, ms );
					}
				}, function () {
					resolve();
				} );
			};
			window.setTimeout( tick, ms );
		} );
	}

	/** One line on the local "did it crash?" check under an update. */
	function crashLine( entry ) {
		var c = entry.crash;
		if ( ! c ) {
			return '';
		}
		if ( c.state === 'pending' ) {
			return '<p class="mk-fine mk-crash">' + icon( 'clock' ) + esc( __( 'Loading the site to check it still works...', 'mykavo' ) ) + '</p>';
		}
		if ( c.state === 'ok' && ! entry.batch ) {
			return '<p class="mk-fine mk-crash mk-good">' + icon( 'check' ) + esc( __( 'The site loaded fine right after this update.', 'mykavo' ) ) + '</p>';
		}
		if ( c.state === 'broken' ) {
			var bad = ( c.pages || [] ).filter( function ( p ) {
				return p.problem && p.problem !== 'unreachable';
			} )[ 0 ];
			var what = bad ? { 'server-error': __( 'answered with a server error', 'mykavo' ), 'fatal-error': __( 'showed a PHP error', 'mykavo' ), empty: __( 'came back empty', 'mykavo' ) }[ bad.problem ] || bad.problem : '';
			return '<p class="mk-crash mk-crash-bad">' + icon( 'alert' ) + esc( bad
				? sprintf( /* translators: 1: page path, 2: what went wrong. */ __( 'The site broke: %1$s %2$s right after this update. Roll back now.', 'mykavo' ), pathOf( bad.url ), what )
				: __( 'The site broke right after this update. Roll back now.', 'mykavo' ) ) + '</p>';
		}
		return '';
	}

	function batchLine( entry ) {
		return entry.batch && entry.reason !== 'LOCAL' ? '<p class="mk-crash mk-good">' + icon( 'shield' ) + esc( sprintf( /* translators: %s: summary such as "7 updated, 6 verified, 1 rolled back". */ __( 'Safe Update All: %s', 'mykavo' ), safeVerdict( entry.batch ) ) ) + '</p>' : '';
	}

	/* --------------------------------------------------------- snapshots -- */

	function snapshotsCard() {
		return '';
	}

	/* ------------------------------------------------- email and forms -- */

	function mailCard() {
		return '';
	}

	/* ------------------------------------------------- vulnerabilities -- */

	function vulnBlock() {
		return '';
	}

	/* ----------------------------------------------------- AI crawlers -- */

	/** Every AI crawler, allowed or blocked in robots.txt. */
	function robotsCard() {
		return '';
	}

	function setBlocked( agent, block ) {
		var r = state.robots;
		var list = ( r.agents || [] ).filter( function ( a ) {
			return a.agent === agent ? block : a.blocked;
		} ).map( function ( a ) {
			return a.agent;
		} );
		saveBlocked( list, '' );
	}

	function saveBlocked( list, message ) {
		send( '/robots/rules', { blocked: list }, 'robots', 'robots', function () {
			toast( message || __( 'robots.txt updated.', 'mykavo' ) );
		} );
	}

	/** /llms.txt: a short guide to the site for AI assistants. */
	function llmsCard() {
		return '';
	}

	/** Pages that answered an AI crawler with 404, and redirects to fix them. */
	function missingCard() {
		return '';
	}

	/** "Verified 120 / unverified 8" for one crawler row. */
	function verifyCell( a ) {
		if ( ! a.checkable ) {
			return '<span class="mk-fine" title="' + esc( __( 'Its owner publishes no way to check its visits.', 'mykavo' ) ) + '">' + esc( __( 'Cannot be checked', 'mykavo' ) ) + '</span>';
		}
		if ( ! a.verified && ! a.unverified ) {
			return '<span class="mk-fine">' + esc( __( 'Not checked yet', 'mykavo' ) ) + '</span>';
		}
		return '<span class="mk-good">' + esc( sprintf( /* translators: %s: number. */ __( '%s real', 'mykavo' ), num( a.verified ) ) ) + '</span>' +
			( a.unverified ? ' · <span class="mk-bad" title="' + esc( __( 'Claimed this name but did not come from its owner\'s network: likely a fake.', 'mykavo' ) ) + '">' + esc( sprintf( /* translators: %s: number. */ __( '%s fake', 'mykavo' ), num( a.unverified ) ) ) + '</span>' : '' );
	}

	/* ---------------------------------------------- suggested pages -- */

	function suggestionsCard() {
		return '';
	}

	/* ---------------------------------------------------- element picker -- */

	var pickerHost = null;

	/** Open a page in a frame; the next element clicked becomes a watched element. */
	function openPicker( url ) {
		closePicker();
		pickerHost = document.createElement( 'div' );
		pickerHost.className = 'mk mk-picker';
		pickerHost.innerHTML =
			'<div class="mk-picker-bar"><b>' + esc( __( 'Click the button, link or form MyKavo should watch', 'mykavo' ) ) + '</b>' +
			'<span class="mk-fine">' + esc( pathOf( url ) ) + '</span>' +
			'<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-pick="close">' + esc( __( 'Cancel', 'mykavo' ) ) + '</button></div>' +
			'<div class="mk-picker-form" hidden></div>' +
			'<iframe class="mk-picker-frame" title="' + esc( __( 'Page preview', 'mykavo' ) ) + '"></iframe>';
		document.body.appendChild( pickerHost );
		var frame = pickerHost.querySelector( 'iframe' );
		pickerHost.addEventListener( 'click', function ( e ) {
			var act = e.target.closest( '[data-pick]' );
			if ( ! act ) {
				return;
			}
			if ( act.getAttribute( 'data-pick' ) === 'close' ) {
				closePicker();
			} else if ( act.getAttribute( 'data-pick' ) === 'save' ) {
				var form = pickerHost.querySelector( '.mk-picker-form' );
				savePicked( url, form.querySelector( 'input[name="name"]' ).value.trim(), form.getAttribute( 'data-selector' ), form.getAttribute( 'data-text' ), form.getAttribute( 'data-href' ) );
			} else if ( act.getAttribute( 'data-pick' ) === 'again' ) {
				pickerHost.querySelector( '.mk-picker-form' ).hidden = true;
			}
		} );
		frame.addEventListener( 'load', function () {
			var doc;
			try {
				doc = frame.contentDocument;
			} catch ( err ) {
				doc = null;
			}
			if ( ! doc || ! doc.body ) {
				pickerHost.querySelector( '.mk-picker-bar b' ).textContent = __( 'This page cannot be opened here (it may be on another address). Add elements in the MyKavo dashboard instead.', 'mykavo' );
				return;
			}
			var style = doc.createElement( 'style' );
			style.textContent = '.mykavo-pick-hover{outline:3px solid #FFD400!important;outline-offset:2px!important;cursor:crosshair!important}#wpadminbar{display:none!important}html{margin-top:0!important}';
			doc.head.appendChild( style );
			var last = null;
			doc.addEventListener( 'mouseover', function ( ev ) {
				if ( last ) {
					last.classList.remove( 'mykavo-pick-hover' );
				}
				last = pickTarget( ev.target );
				if ( last ) {
					last.classList.add( 'mykavo-pick-hover' );
				}
			}, true );
			doc.addEventListener( 'click', function ( ev ) {
				ev.preventDefault();
				ev.stopPropagation();
				var el = pickTarget( ev.target );
				if ( ! el ) {
					return;
				}
				el.classList.remove( 'mykavo-pick-hover' );
				showPickForm( el, doc );
			}, true );
			doc.addEventListener( 'submit', function ( ev ) {
				ev.preventDefault();
			}, true );
		} );
		frame.src = url;
	}

	/** The meaningful element under the pointer: a button, link, form or input, else the element itself. */
	function pickTarget( el ) {
		if ( ! el || ! el.closest ) {
			return null;
		}
		return el.closest( 'a,button,form,input,select,textarea,[role="button"]' ) || el;
	}

	function showPickForm( el, doc ) {
		var form = pickerHost.querySelector( '.mk-picker-form' );
		var selector = selectorFor( el, doc );
		var text = ( el.innerText || el.value || '' ).replace( /\s+/g, ' ' ).trim().slice( 0, 120 );
		var href = el.tagName === 'A' ? el.href : '';
		form.setAttribute( 'data-selector', selector );
		form.setAttribute( 'data-text', text );
		form.setAttribute( 'data-href', href );
		form.innerHTML =
			'<label><span>' + esc( __( 'Name', 'mykavo' ) ) + '</span><input name="name" type="text" maxlength="100" value="' + esc( text || el.tagName.toLowerCase() ) + '"></label>' +
			'<p class="mk-fine"><code>' + esc( selector ) + '</code>' + ( text ? ' · "' + esc( text ) + '"' : '' ) + '</p>' +
			'<div><button type="button" class="mk-btn mk-btn-sm mk-btn-dark" data-pick="save">' + esc( __( 'Watch this element', 'mykavo' ) ) + '</button> ' +
			'<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-pick="again">' + esc( __( 'Pick another', 'mykavo' ) ) + '</button></div>';
		form.hidden = false;
		form.querySelector( 'input' ).focus();
	}

	/** A short CSS selector that finds exactly this element on the page. */
	function selectorFor( el, doc ) {
		var cssEscape = window.CSS && window.CSS.escape ? window.CSS.escape : function ( s ) {
			return String( s ).replace( /[^a-zA-Z0-9_-]/g, '\\$&' );
		};
		var unique = function ( sel ) {
			try {
				return doc.querySelectorAll( sel ).length === 1;
			} catch ( err ) {
				return false;
			}
		};
		if ( el.id && ! /\d{3,}/.test( el.id ) && unique( '#' + cssEscape( el.id ) ) ) {
			return '#' + cssEscape( el.id );
		}
		var attrs = [ 'data-testid', 'data-test', 'name', 'aria-label' ];
		for ( var i = 0; i < attrs.length; i++ ) {
			var v = el.getAttribute( attrs[ i ] );
			if ( v ) {
				var sel = el.tagName.toLowerCase() + '[' + attrs[ i ] + '="' + v.replace( /"/g, '\\"' ) + '"]';
				if ( unique( sel ) ) {
					return sel;
				}
			}
		}
		var parts = [];
		var node = el;
		while ( node && node.nodeType === 1 && node !== doc.body && parts.length < 6 ) {
			var part = node.tagName.toLowerCase();
			if ( node.id && ! /\d{3,}/.test( node.id ) ) {
				parts.unshift( '#' + cssEscape( node.id ) );
				break;
			}
			var cls = Array.prototype.slice.call( node.classList ).filter( function ( c ) {
				return c !== 'mykavo-pick-hover' && ! /\d{3,}|^is-|^has-|active|hover|focus/.test( c );
			} ).slice( 0, 2 );
			if ( cls.length ) {
				part += '.' + cls.map( cssEscape ).join( '.' );
			}
			var parent = node.parentElement;
			if ( parent ) {
				var same = Array.prototype.slice.call( parent.children ).filter( function ( c ) {
					return c.tagName === node.tagName;
				} );
				if ( same.length > 1 ) {
					part += ':nth-of-type(' + ( same.indexOf( node ) + 1 ) + ')';
				}
			}
			parts.unshift( part );
			if ( unique( parts.join( ' > ' ) ) ) {
				break;
			}
			node = parent;
		}
		return parts.join( ' > ' );
	}

	function savePicked( url, name, selector, text, href ) {
		if ( ! name ) {
			toast( __( 'Give the element a name first.', 'mykavo' ) );
			return;
		}
		api( '/elements', { method: 'POST', data: { url: url, selector: selector, name: name, text: text || '', href: href || '' } } )
			.then( function ( res ) {
				if ( res && res.allowed === false ) {
					toast( res.message || lockedText( 'pro', __( 'Watching more elements', 'mykavo' ) ) );
					return;
				}
				closePicker();
				toast( sprintf( /* translators: %s: element name. */ __( 'MyKavo now watches "%s". It alerts you if it disappears or changes.', 'mykavo' ), name ) );
				state.pages = null;
				loadPages();
			} )
			.catch( function ( err ) {
				toast( errorMessage( err ) );
			} );
	}

	function closePicker() {
		if ( pickerHost ) {
			pickerHost.remove();
			pickerHost = null;
		}
	}

	/* ---------------------------------------------------- client reports -- */

	function reportsView() {
		return '';
	}

	/** Load what the 1.3.0 cards need for the current tab. */
	function loadExtras() {}

	/** Clicks on the 1.3.0 controls. Returns true when handled. */
	function onClickExtra( act, el ) {
		switch ( act ) {
			case 'copy':
				if ( navigator.clipboard ) {
					navigator.clipboard.writeText( el.getAttribute( 'data-copy' ) || '' ).then( function () {
						toast( __( 'Copied.', 'mykavo' ) );
					} );
				}
				return true;
			case 'dismiss-alert':
				send( '/alerts/dismiss', { id: el.getAttribute( 'data-id' ) || 'all' }, 'alerts', 'alerts' );
				return true;
			case 'safe-start':
				startSafeUpdate();
				return true;
			case 'safe-backup':
				state.safe.backupFirst = el.checked;
				return true;
			case 'safe-baseline':
				state.safeBaseline = el.checked;
				return true;
			case 'safe-skip-backup':
				state.safeRun.skipBackup = true;
				return true;
			case 'safe-close':
				state.safeRun = null;
				render();
				return true;
			case 'robots-block':
				setBlocked( el.getAttribute( 'data-agent' ), el.getAttribute( 'data-block' ) === '1' );
				return true;
			case 'robots-preset':
				saveBlocked( state.robots.preset || [], __( 'robots.txt now asks AI training crawlers to stay away. AI search is still allowed.', 'mykavo' ) );
				return true;
			case 'robots-allow-all':
				saveBlocked( [], __( 'Every AI crawler is allowed.', 'mykavo' ) );
				return true;
			case 'toggle-llms':
				send( '/llms', { enabled: ! state.llms.enabled }, 'llms', 'llms' );
				return true;
			case 'redirect-suggest':
				send( '/redirects/suggest', {
					paths: ( ( state.bots && state.bots.missing ) || [] ).map( function ( m ) {
						return m.path.split( '?' )[ 0 ];
					} ),
				}, 'redirectSuggest', 'suggest', function ( res ) {
					if ( ! res.allowed ) {
						toast( lockedText( 'starter', __( 'Suggested target pages', 'mykavo' ) ) );
					}
				} );
				return true;
			case 'redirect-remove':
				send( '/redirects', { from: el.getAttribute( 'data-from' ) }, 'redirects', 'redirect', null, 'DELETE' );
				return true;
			case 'toggle-vuln-auto':
				send( '/plugin-health/vuln-autoupdate', { enabled: ! ( state.vulnAuto !== undefined ? state.vulnAuto : state.health && state.health.vulnAutoUpdate ) }, null, 'vuln', function ( res ) {
					state.vulnAuto = !! res.enabled;
				} );
				return true;
			case 'toggle-mail':
				send( '/forms/mail', { enabled: ! state.forms.mail.enabled }, 'forms', 'mail' );
				return true;
			case 'mail-test':
				send( '/forms/mail/test', {}, 'forms', 'mail-test', function ( res ) {
					toast( res.mail.last && res.mail.last.ok ? __( 'Test email sent.', 'mykavo' ) : __( 'The test email could not be sent.', 'mykavo' ) );
				} );
				return true;
			case 'forms-sync':
				send( '/forms/sync', {}, 'forms', 'forms' );
				return true;
			case 'suggest-toggle':
				state.sugPick[ el.getAttribute( 'data-url' ) ] = el.checked;
				render();
				return true;
			case 'suggest-add':
				var urls = state.suggestions.pages.filter( function ( p ) {
					return state.sugPick[ p.url ] !== false;
				} ).map( function ( p ) {
					return p.url;
				} );
				var o = state.overview;
				var limit = o && o.workspace.plan.limits ? o.workspace.plan.limits.pagesPerWebsite : null;
				if ( limit ) {
					urls = urls.slice( 0, Math.max( 0, limit - o.stats.monitoredPages ) );
				}
				if ( urls.length ) {
					addPages( urls );
					state.suggestions = null;
				}
				return true;
			case 'pick-element':
				openPicker( el.getAttribute( 'data-url' ) );
				return true;
			case 'retry-reports':
				state.reportsError = null;
				loadInto( 'reports', '/reports' );
				return true;
		}
		return false;
	}

	function render() {
		var focusKey = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute( 'data-key' ) : null;

		if ( ! state.connected ) {
			root.innerHTML = welcome();
			return;
		}

		var view = state.tab === 'changes'
			? changesView()
			: state.tab === 'bots'
				? botsView()
			: state.tab === 'updates'
				? updatesView()
				: state.tab === 'scans'
					? scansView()
					: state.tab === 'pages'
						? pagesView()
						: state.tab === 'plan'
							? planView()
							: state.tab === 'reports'
								? reportsView()
								: overviewView();
		root.innerHTML = '<div class="mk-shell">' + header() + '</div>' + pageHead() + banner() + '<div role="tabpanel" class="mk-panel">' + view + '</div>' + footer();

		if ( focusKey ) {
			var again = root.querySelector( '[data-key="' + focusKey + '"]' );
			if ( again ) {
				again.focus();
			}
		}
	}

	/* --------------------------------------------------------------- drawer -- */

	var drawerHost = document.createElement( 'div' );
	drawerHost.className = 'mk';
	drawerHost.style.cssText = 'padding:0;max-width:none';
	document.body.appendChild( drawerHost );

	function valueBox( kind, label, value ) {
		var empty = value === null || value === undefined || value === '';
		return (
			'<div class="mk-value mk-value-' + kind + '"><p class="mk-value-label">' + esc( label ) + '</p>' +
			( empty ? '<em>' + esc( __( '(empty)', 'mykavo' ) ) + '</em>' : '<pre>' + esc( value ) + '</pre>' ) + '</div>'
		);
	}

	function shots( c, mode ) {
		var img = c.images || {};
		var before = safeUrl( img.before );
		var after = safeUrl( img.after );
		var diff = safeUrl( img.diff );
		if ( ! before && ! after && ! diff ) {
			return '';
		}
		var modes = [];
		if ( before && after ) {
			modes.push( [ 'compare', __( 'Compare', 'mykavo' ) ] );
		}
		if ( before ) {
			modes.push( [ 'before', __( 'Before', 'mykavo' ) ] );
		}
		if ( after ) {
			modes.push( [ 'after', __( 'After', 'mykavo' ) ] );
		}
		if ( diff ) {
			modes.push( [ 'diff', __( 'Differences', 'mykavo' ) ] );
		}
		var bar =
			'<div class="mk-seg mk-compare-tabs" role="group" aria-label="' + esc( __( 'Screenshot view', 'mykavo' ) ) + '">' +
			modes.map( function ( m ) {
				return '<button type="button" data-act="shot-mode" data-mode="' + m[ 0 ] + '" data-key="mode-' + m[ 0 ] + '" aria-pressed="' + ( mode === m[ 0 ] ) + '">' + esc( m[ 1 ] ) + '</button>';
			} ).join( '' ) +
			'</div>';

		var alt = esc( __( 'Screenshot of the page', 'mykavo' ) );
		var body;
		if ( mode === 'compare' && before && after ) {
			body =
				'<div class="mk-shots"><div class="mk-slider" id="mk-slider">' +
				'<div class="mk-slider-labels"><span>' + esc( __( 'Before', 'mykavo' ) ) + '</span><span>' + esc( __( 'After', 'mykavo' ) ) + '</span></div>' +
				'<img src="' + esc( before ) + '" alt="' + alt + '" loading="lazy" decoding="async">' +
				'<div class="mk-slider-after"><img src="' + esc( after ) + '" alt="" loading="lazy" decoding="async"></div>' +
				'<div class="mk-slider-handle"></div>' +
				'</div></div>' +
				'<input class="mk-range" type="range" min="0" max="100" value="50" data-act-input="split" aria-label="' + esc( __( 'Drag to compare before and after', 'mykavo' ) ) + '">';
		} else {
			var src = mode === 'before' ? before : mode === 'diff' ? diff : after || before || diff;
			body = '<div class="mk-shots"><img src="' + esc( src ) + '" alt="' + alt + '" loading="lazy" decoding="async"></div>';
		}
		return '<div class="mk-section"><p class="mk-section-title">' + esc( __( 'Screenshots', 'mykavo' ) ) + '</p>' + bar + body + '</div>';
	}

	function drawerBody( c ) {
		var links = c.brokenLinks && c.brokenLinks.length
			? '<div class="mk-section"><p class="mk-section-title">' + esc( __( 'Broken links', 'mykavo' ) ) + '</p><ul class="mk-links">' +
				c.brokenLinks.slice( 0, 50 ).map( function ( l ) {
					return '<li><code title="' + esc( l.url ) + '">' + esc( l.url ) + '</code><span class="mk-status">' + esc( l.status ? l.status : __( 'Unreachable', 'mykavo' ) ) + '</span></li>';
				} ).join( '' ) + '</ul></div>'
			: '';
		var hasValues = ( c.previousValue !== null && c.previousValue !== undefined ) || ( c.currentValue !== null && c.currentValue !== undefined );
		var found = c.foundBy && c.foundBy.triggerType === 'DEPLOY' && c.foundBy.note
			? '<div class="mk-attrib">' + icon( 'shield' ) + '<div><b>' + esc( __( 'Appeared after a theme change', 'mykavo' ) ) + '</b><span>' + esc( c.foundBy.note ) + '</span></div></div>'
			: '';
		return (
			found +
			( c.description ? '<p style="color:var(--mk-ink-2);font-size:14px">' + esc( c.description ) + '</p>' : '' ) +
			( hasValues
				? '<div class="mk-section"><p class="mk-section-title">' + esc( __( 'What changed', 'mykavo' ) ) + '</p><div class="mk-values">' +
					valueBox( 'before', __( 'Before', 'mykavo' ), c.previousValue ) +
					valueBox( 'after', __( 'Now', 'mykavo' ), c.currentValue ) + '</div></div>'
				: '' ) +
			shots( c, state.drawer.mode ) +
			links
		);
	}

	function drawerActions( c ) {
		if ( READONLY ) {
			var link = safeUrl( c.dashboardUrl );
			return '<span class="mk-fine">' + esc( __( 'View only: ask an administrator to approve or fix changes.', 'mykavo' ) ) + '</span>' +
				( link ? '<a class="mk-link" style="margin-left:auto" href="' + esc( link ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Open in MyKavo', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' );
		}
		var busy = state.drawer.busy;
		var btn = function ( action, label, cls ) {
			var loading = busy === action;
			return '<button type="button" class="mk-btn ' + ( cls || '' ) + '" data-act="change-action" data-action="' + action + '"' + ( busy ? ' disabled' : '' ) + '>' +
				( loading ? icon( 'loader', 'mk-spin' ) : '' ) + esc( label ) + '</button>';
		};
		var open = c.status === 'NEW' || c.status === 'REVIEWED';
		var out = '';
		if ( open ) {
			out += c.canUpdateBaseline
				? btn( 'baseline', __( 'Accept as new baseline', 'mykavo' ), 'mk-btn-primary' )
				: btn( 'approve', __( 'Approve change', 'mykavo' ), 'mk-btn-primary' );
			if ( c.status === 'NEW' ) {
				out += btn( 'review', __( 'Mark reviewed', 'mykavo' ) );
			}
			out += btn( 'resolve', __( 'Fixed', 'mykavo' ) );
			out += btn( 'ignore', __( 'Ignore', 'mykavo' ), 'mk-btn-quiet' );
		} else {
			out += btn( 'reopen', __( 'Reopen', 'mykavo' ) );
		}
		var dash = safeUrl( c.dashboardUrl );
		if ( dash ) {
			out += '<a class="mk-link" style="margin-left:auto" href="' + esc( dash ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Open in MyKavo', 'mykavo' ) ) + icon( 'external' ) + '</a>';
		}
		return out;
	}

	function renderDrawer() {
		var d = state.drawer;
		if ( ! d ) {
			drawerHost.innerHTML = '';
			document.removeEventListener( 'keydown', onDrawerKey );
			return;
		}
		var focusKey = document.activeElement && drawerHost.contains( document.activeElement ) ? document.activeElement.getAttribute( 'data-key' ) : null;
		var c = d.data;
		var head;
		var body;
		var foot = '';
		if ( ! c ) {
			head = '<div style="flex:1">' + loadingBlock( 22 ) + '</div>';
			body = d.error ? '<div class="mk-empty"><span>' + esc( d.error ) + '</span></div>' : loadingBlock( 120 ) + '<div style="height:14px"></div>' + loadingBlock( 320 );
		} else {
			var page = safeUrl( c.pageUrl );
			head =
				'<div style="flex:1;min-width:0"><div class="mk-meta-line">' + sevPill( c.severity ) +
				'<span>' + esc( categoryLabel( c.category ) ) + '</span><span>·</span>' +
				'<span title="' + esc( when( c.detectedAt ) ) + '">' + esc( rel( c.detectedAt ) ) + '</span>' +
				( c.status !== 'NEW' ? '<span class="mk-status">' + esc( statusLabel( c.status ) ) + '</span>' : '' ) +
				'</div><h2 id="mk-drawer-title">' + esc( c.title ) + '</h2>' +
				( page ? '<a class="mk-link" style="margin-top:6px" href="' + esc( page ) + '" target="_blank" rel="noopener noreferrer"><code>' + esc( pathOf( page ) ) + '</code>' + icon( 'external' ) + '</a>' : '' ) +
				'</div>';
			body = ( d.error ? '<div class="mk-banner mk-banner-bad" role="alert">' + icon( 'alert' ) + '<span>' + esc( d.error ) + '</span></div>' : '' ) + drawerBody( c );
			foot = '<div class="mk-drawer-foot">' + drawerActions( c ) + '</div>';
		}
		drawerHost.innerHTML =
			'<div class="mk-scrim" data-act="close-drawer"></div>' +
			'<div class="mk-drawer" role="dialog" aria-modal="true" aria-labelledby="mk-drawer-title">' +
			'<div class="mk-drawer-head">' + head +
			'<button type="button" class="mk-close" data-act="close-drawer" data-key="close" aria-label="' + esc( __( 'Close', 'mykavo' ) ) + '">' + icon( 'x' ) + '</button></div>' +
			'<div class="mk-drawer-body">' + body + '</div>' + foot + '</div>';
		document.addEventListener( 'keydown', onDrawerKey );
		var target = ( focusKey && drawerHost.querySelector( '[data-key="' + focusKey + '"]' ) ) || drawerHost.querySelector( '.mk-close' );
		if ( target ) {
			target.focus();
		}
	}

	function onDrawerKey( e ) {
		if ( ! state.drawer ) {
			return;
		}
		if ( e.key === 'Escape' ) {
			e.preventDefault();
			closeDrawer();
			return;
		}
		if ( e.key === 'Tab' ) {
			var focusable = drawerHost.querySelectorAll( 'button:not([disabled]), a[href], input' );
			if ( ! focusable.length ) {
				return;
			}
			var first = focusable[ 0 ];
			var last = focusable[ focusable.length - 1 ];
			if ( e.shiftKey && document.activeElement === first ) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && document.activeElement === last ) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	/* --------------------------------------------------------------- events -- */

	function onClick( e ) {
		var el = e.target.closest( '[data-act]' );
		if ( ! el ) {
			if ( state.menuOpen && ! e.target.closest( '.mk-menu' ) ) {
				state.menuOpen = false;
				render();
			}
			return;
		}
		var act = el.getAttribute( 'data-act' );
		if ( READONLY && MANAGE_ACTS[ act ] ) {
			e.preventDefault();
			toast( __( 'Your account can view MyKavo but not change anything. Ask an administrator.', 'mykavo' ) );
			return;
		}
		if ( onClickExtra( act, el ) ) {
			return;
		}
		switch ( act ) {
			case 'rollback':
				rollback( el );
				break;
			case 'toggle-auto-rollback':
				setAutoRollback( ! ( state.updates && state.updates.autoRollback ) );
				break;
			case 'toggle-robots':
				setRobots( ! ( state.robots && state.robots.enabled ) );
				break;
			case 'robots-retry':
				state.robotsError = null;
				loadRobots();
				break;
			case 'copy-rules':
				if ( state.robots && navigator.clipboard ) {
					navigator.clipboard.writeText( state.robots.rules ).then( function () {
						toast( __( 'Rules copied.', 'mykavo' ) );
					} );
				}
				break;
			case 'history-retry':
				state.aiHistoryError = null;
				state.aiHistory = null;
				render();
				loadAiHistory();
				break;
			case 'health-refresh':
				loadHealth( true );
				break;
			case 'guard-checkout':
				guardCheckout();
				break;
			case 'window-edit':
				var current = state.win && state.win.updateWindow;
				state.winEdit = current
					? { enabled: true, days: current.days.slice(), startHour: current.startHour, endHour: current.endHour, timezone: current.timezone }
					: { enabled: true, days: [ 1, 2, 3, 4, 5 ], startHour: 2, endHour: 5, timezone: ( state.win && state.win.siteTimezone ) || 'UTC' };
				render();
				break;
			case 'window-cancel':
				state.winEdit = null;
				render();
				break;
			case 'window-retry':
				state.winError = null;
				state.win = null;
				render();
				loadWindow();
				break;
			case 'guard-store':
				if ( cfg.woo && cfg.woo.pages ) {
					addPages( cfg.woo.pages.map( function ( p ) {
						return p.url;
					} ), __( 'Your store pages are already monitored.', 'mykavo' ) );
				}
				break;
			case 'tab':
				state.tab = el.getAttribute( 'data-tab' );
				state.menuOpen = false;
				if ( state.tab === 'changes' && state.changesScan ) {
					state.changesScan = null;
					state.changes = null;
				}
				render();
				loadTab();
				break;
			case 'scan':
				runScan();
				break;
			case 'menu':
				state.menuOpen = ! state.menuOpen;
				render();
				break;
			case 'disconnect':
				disconnect();
				break;
			case 'dismiss-banner':
				state.banner = null;
				render();
				break;
			case 'open-change':
				openChange( el.getAttribute( 'data-id' ) );
				break;
			case 'close-drawer':
				closeDrawer();
				break;
			case 'change-action':
				changeAction( el.getAttribute( 'data-action' ) );
				break;
			case 'shot-mode':
				if ( state.drawer ) {
					state.drawer.mode = el.getAttribute( 'data-mode' );
					renderDrawer();
				}
				break;
			case 'changes-status':
				state.changesStatus = el.getAttribute( 'data-status' ) === 'all' ? 'all' : 'open';
				loadChanges();
				break;
			case 'severity':
				state.severity = el.getAttribute( 'data-sev' ) || '';
				render();
				break;
			case 'retry-overview':
				state.overviewError = null;
				render();
				loadOverview( true );
				break;
			case 'retry-changes':
				loadChanges();
				break;
			case 'retry-scans':
				state.scansError = null;
				state.scans = null;
				render();
				loadScans();
				break;
			case 'severity-jump':
				state.tab = 'changes';
				state.changesStatus = 'open';
				state.severity = el.getAttribute( 'data-sev' ) || '';
				loadChanges();
				break;
			case 'toggle-bots':
				setBotCounting( ! ( state.bots && state.bots.enabled ) );
				break;
			case 'retry-bots':
				state.botsError = null;
				state.bots = null;
				render();
				loadBots();
				break;
			case 'toggle-updates':
				setUpdateChecks( ! ( state.updates && state.updates.enabled ) );
				break;
			case 'update-changes':
				state.changesScan = { id: el.getAttribute( 'data-scan' ), note: el.getAttribute( 'data-note' ) };
				state.tab = 'changes';
				loadChanges();
				break;
			case 'clear-scan-filter':
				state.changesScan = null;
				loadChanges();
				break;
			case 'retry-updates':
				state.updatesError = null;
				state.updates = null;
				render();
				loadUpdates();
				break;
			case 'retry-pages':
				state.pagesError = null;
				state.pages = null;
				render();
				loadPages();
				break;
		}
	}

	/** Arrow keys move between tabs, as screen-reader users expect. */
	function onKey( e ) {
		var tab = e.target.closest && e.target.closest( '[role="tab"]' );
		if ( ! tab || ( e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' ) ) {
			return;
		}
		var all = Array.prototype.slice.call( root.querySelectorAll( '[role="tab"]' ) );
		var next = all[ ( all.indexOf( tab ) + ( e.key === 'ArrowRight' ? 1 : all.length - 1 ) ) % all.length ];
		e.preventDefault();
		next.click();
		var again = root.querySelector( '[data-key="' + next.getAttribute( 'data-key' ) + '"]' );
		if ( again ) {
			again.focus();
		}
	}

	function onInput( e ) {
		if ( e.target.getAttribute( 'data-act-input' ) === 'split' ) {
			var slider = drawerHost.querySelector( '#mk-slider' );
			if ( slider ) {
				slider.style.setProperty( '--mk-split', e.target.value + '%' );
			}
		}
	}

	// Background refreshes redraw the screen; keep what the admin is typing.
	root.addEventListener( 'input', function ( e ) {
		if ( e.target && e.target.id === 'mk-add-url' ) {
			state.addUrl = e.target.value;
		}
		if ( e.target && e.target.getAttribute && e.target.getAttribute( 'data-redirect' ) ) {
			state.redirectDraft[ e.target.getAttribute( 'data-redirect' ) ] = e.target.value;
		}
	} );
	root.addEventListener( 'submit', function ( e ) {
		var redirect = e.target.closest && e.target.closest( '[data-form="redirect"]' );
		if ( redirect ) {
			e.preventDefault();
			var from = redirect.getAttribute( 'data-from' );
			var to = redirect.querySelector( 'input' ).value.trim();
			if ( ! to ) {
				toast( __( 'Enter the page to redirect to.', 'mykavo' ) );
				return;
			}
			send( '/redirects', { from: from, to: to }, 'redirects', 'redirect', function () {
				delete state.redirectDraft[ from ];
				toast( __( 'Redirect created. Crawlers and visitors asking for the old address now land on the right page.', 'mykavo' ) );
			} );
			return;
		}
		var brandForm = e.target.closest && e.target.closest( '[data-form="branding"]' );
		if ( brandForm ) {
			e.preventDefault();
			state.brandDraft = { name: brandForm.querySelector( 'input[name="brandName"]' ).value.trim(), color: brandForm.querySelector( 'input[name="color"]' ).value };
			send( '/reports/branding', { brandName: state.brandDraft.name || null, color: state.brandDraft.color || null }, 'reports', 'branding', function () {
				state.brandDraft = null;
				toast( __( 'Report branding saved.', 'mykavo' ) );
			} );
			return;
		}
		var win = e.target.closest && e.target.closest( '[data-form="window"]' );
		if ( win ) {
			e.preventDefault();
			var days = Array.prototype.slice.call( win.querySelectorAll( 'input[name="day"]:checked' ) ).map( function ( box ) {
				return parseInt( box.value, 10 );
			} );
			var draft = {
				enabled: win.querySelector( 'input[name="enabled"]' ).checked,
				days: days,
				startHour: parseInt( win.querySelector( 'select[name="startHour"]' ).value, 10 ),
				endHour: parseInt( win.querySelector( 'select[name="endHour"]' ).value, 10 ),
				timezone: win.querySelector( 'input[name="timezone"]' ).value.trim(),
			};
			state.winEdit = draft;
			if ( draft.enabled && ! draft.days.length ) {
				state.banner = { tone: 'bad', text: __( 'Choose at least one day for the update window.', 'mykavo' ) };
				render();
				return;
			}
			if ( draft.startHour === draft.endHour ) {
				state.banner = { tone: 'bad', text: __( 'The window needs to end at a different time than it starts.', 'mykavo' ) };
				render();
				return;
			}
			saveWindow( draft );
			return;
		}
		var form = e.target.closest && e.target.closest( '[data-form="add-page"]' );
		if ( ! form ) {
			return;
		}
		e.preventDefault();
		var input = form.querySelector( 'input' );
		var url = safeUrl( input ? input.value.trim() : '' );
		if ( ! url ) {
			state.banner = { tone: 'bad', text: __( 'Enter the full page address, starting with https://', 'mykavo' ) };
			render();
			return;
		}
		state.addUrl = input.value;
		addPages( [ url ] );
	} );
	root.addEventListener( 'click', onClick );
	root.addEventListener( 'keydown', onKey );
	drawerHost.addEventListener( 'click', onClick );
	drawerHost.addEventListener( 'input', onInput );
	document.addEventListener( 'visibilitychange', function () {
		if ( ! document.hidden && state.overview && state.overview.scanInProgress ) {
			schedulePoll();
		}
	} );

	/* ----------------------------------------------------------------- boot -- */

	if ( cfg.notice && window.history && window.history.replaceState ) {
		var clean = new URL( window.location.href );
		clean.searchParams.delete( 'mykavo_notice' );
		window.history.replaceState( null, '', clean.toString() );
	}

	render();
	if ( state.connected ) {
		loadOverview( false );
		loadUpdates();
		loadFeatures( false );
		loadExtras();
		if ( cfg.woo && cfg.woo.pages && cfg.woo.pages.length ) {
			loadPages();
		}
	}
}() );
