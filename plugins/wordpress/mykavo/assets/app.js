/**
 * MyKavo for WordPress - the admin screen.
 *
 * Plain JavaScript on top of two scripts WordPress already ships
 * (wp-api-fetch, wp-i18n): no framework download, so the screen opens fast.
 * It only ever talks to this site's own /wp-json/mykavo/v1 routes; the
 * MyKavo token stays on the server.
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
		// 1.3.1.
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
			DEPLOY: __( 'Update check', 'mykavo' ),
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
			toast( enabled ? __( 'Update checks are on.', 'mykavo' ) : __( 'Update checks are off.', 'mykavo' ) );
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
	function feat( key ) {
		return !! ( state.features && state.features[ key ] );
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

	function rollback( el ) {
		var name = el.getAttribute( 'data-name' );
		var from = el.getAttribute( 'data-from' );
		var to = el.getAttribute( 'data-to' );
		var question = sprintf(
			/* translators: 1: plugin name, 2: version installed now, 3: version to go back to. */
			__( 'Roll back %1$s from %2$s to %3$s?\n\nWordPress reinstalls version %3$s from WordPress.org, keeping the plugin active if it is. MyKavo then checks your site again.', 'mykavo' ),
			name,
			to || '?',
			from
		);
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( question ) ) {
			return;
		}
		var file = el.getAttribute( 'data-file' );
		state.busy = 'rollback:' + file;
		render();
		api( '/rollback', { method: 'POST', data: { entry: el.getAttribute( 'data-entry' ), file: file } } )
			.then( function ( data ) {
				state.updates = data;
				toast( sprintf( /* translators: 1: plugin name, 2: version. */ __( 'Rolled back %1$s to %2$s. MyKavo is checking your site again.', 'mykavo' ), name, from ) );
				state.scans = null;
				pollCount = 0;
				loadScans( true );
				loadOverview( true );
			} )
			.catch( function ( err ) {
				if ( ! handleDisconnect( err ) ) {
					state.banner = { tone: 'bad', text: errorMessage( err ) };
				}
				loadUpdates();
			} )
			.then( function () {
				state.busy = '';
				render();
			} );
	}

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
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'Disconnect this site from MyKavo? Monitoring keeps running in MyKavo; this screen just stops showing it until you connect again.', 'mykavo' ) ) ) {
			return;
		}
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
			state.banner = { tone: 'neutral', text: __( 'Disconnected from MyKavo.', 'mykavo' ) };
			stopPolling();
			render();
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
				__( 'MyKavo scans the pages that matter on %s and tells you when something important changes or breaks - with before-and-after screenshots, right here in WordPress.', 'mykavo' ),
				site.name || __( 'your site', 'mykavo' )
			) ) +
			'</p>' +
			'<ul class="mk-benefits">' +
			benefit( 'shield', __( 'Update without fear', 'mykavo' ), __( 'After every plugin, theme or WordPress update, MyKavo checks nothing broke - and names the update if something did.', 'mykavo' ) ) +
			benefit( 'image', __( 'See exactly what changed', 'mykavo' ), __( 'Before-and-after screenshots and values for every change.', 'mykavo' ) ) +
			benefit( 'alert', __( 'Only what matters', 'mykavo' ), __( 'Changes ranked Critical to Info. Ads and noise are filtered out.', 'mykavo' ) ) +
			benefit( 'check', __( 'Approve in one click', 'mykavo' ), __( 'Accept intentional changes as the new baseline, ignore the rest.', 'mykavo' ) ) +
			'</ul>' +
			'<div class="mk-welcome-cta">' +
			( READONLY
				? '<p class="mk-fine">' + esc( __( 'This site is not connected yet. Ask an administrator to connect it.', 'mykavo' ) ) + '</p>'
				: '<a class="mk-btn mk-btn-primary" href="' + esc( cfg.connectUrl ) + '">' + icon( 'link' ) + esc( __( 'Connect to MyKavo', 'mykavo' ) ) + '</a>' ) +
			'<span class="mk-fine">' + esc( __( 'Free plan available. No card needed.', 'mykavo' ) ) + '</span>' +
			'</div>' +
			'<p class="mk-speed">' + icon( 'zap' ) + esc( __( 'Adds nothing to the pages your visitors load. Zero impact on site speed.', 'mykavo' ) ) + '</p>' +
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
			esc( sprintf( /* translators: %s: plugin version. */ __( 'MyKavo for WordPress %s', 'mykavo' ), cfg.version || '' ) ) +
			'</span><span>' + esc( __( 'Runs only in wp-admin. Your visitors never load it.', 'mykavo' ) ) + '</span></p>'
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
		updates: __( 'Safe Updates', 'mykavo' ),
		bots: __( 'AI crawlers', 'mykavo' ),
		scans: __( 'Scans', 'mykavo' ),
		pages: __( 'Pages', 'mykavo' ),
		plan: __( 'Your plan', 'mykavo' ),
		reports: __( 'Your site report', 'mykavo' ),
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
			'<button type="button" class="is-danger" data-act="disconnect">' + icon( 'unplug' ) + esc( __( 'Disconnect this site', 'mykavo' ) ) + '</button>' +
			'</div>'
		);
	}

	function tabs() {
		var open = state.overview ? state.overview.stats.openChanges : 0;
		var list = [
			[ 'overview', __( 'Overview', 'mykavo' ), '' ],
			[ 'changes', __( 'Changes', 'mykavo' ), open > 0 ? '<span class="mk-count">' + esc( open > 99 ? '99+' : open ) + '</span>' : '' ],
			[ 'updates', __( 'Safe Updates', 'mykavo' ), '' ],
			[ 'bots', __( 'AI crawlers', 'mykavo' ), '' ],
			[ 'scans', __( 'Scans', 'mykavo' ), '' ],
			[ 'pages', __( 'Pages', 'mykavo' ), '' ],
		];
		if ( state.overview && ( planAtLeast( 'agency' ) || feat( 'clientReports' ) ) ) {
			list.push( [ 'reports', __( 'Site report', 'mykavo' ), '' ] );
		}
		list.push( [ 'plan', __( 'Plan', 'mykavo' ), '' ] );
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
			( c.afterUpdate ? '<span class="mk-tag" title="' + esc( c.afterUpdate ) + '">' + icon( 'shield' ) + esc( __( 'After an update', 'mykavo' ) ) + '</span>' : '' ) +
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
			( updates.length ? '<span class="mk-chart-key"><span class="mk-chart-key-dot"></span>' + esc( __( 'Updates', 'mykavo' ) ) + '</span>' : '' ) + '</figcaption>' +
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
			'<button type="button" class="mk-link" data-act="tab" data-tab="updates">' + esc( __( 'Update history', 'mykavo' ) ) + '</button>' +
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
			__( 'Updates checked', 'mykavo' ),
			__( 'Plugins, themes and WordPress', 'mykavo' ),
			bigNum( checked ),
			flagged ? sprintf( /* translators: %d: number of updates. */ _n( '%d found changes', '%d found changes', flagged, 'mykavo' ), flagged ) : checked ? __( 'All verified', 'mykavo' ) : '',
			flagged ? 'warm' : 'good',
			'updates'
		);
	}

	function botsTile() {
		var b = state.bots;
		if ( ! b ) {
			return '';
		}
		return tile(
			__( 'AI crawler visits', 'mykavo' ),
			__( 'ChatGPT, Claude, Perplexity and more', 'mykavo' ),
			bigNum( b.enabled ? num( b.total || 0 ) : '-' ),
			b.enabled ? __( 'Last 30 days', 'mykavo' ) : __( 'Counting off', 'mykavo' ),
			'calm',
			'bots'
		);
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
						? '<span class="mk-tag" title="' + esc( s.note ) + '">' + icon( 'shield' ) + esc( __( 'Update check', 'mykavo' ) ) + '</span><span class="mk-cell-note">' + esc( s.note ) + '</span>'
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
					( READONLY || ! url ? '' : '<button type="button" class="mk-btn mk-btn-sm mk-btn-soft mk-pick-btn" data-act="pick-element" data-url="' + esc( url ) + '">' + icon( 'eye' ) + esc( __( 'Watch an element', 'mykavo' ) ) + '</button>' ) +
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
			return __( 'WordPress update', 'mykavo' );
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
			return { tone: 'quiet', text: __( 'Not checked - update checks were off', 'mykavo' ) };
		}
		if ( reason === 'PLAN' ) {
			return { tone: 'quiet', text: __( 'Not checked - automatic update checks come with paid plans', 'mykavo' ), upgrade: true };
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
	function rollbackButton( entry, it, small ) {
		if ( ! it.canRollback || ! it.file || ! it.from || ! cfg.canUpdate ) {
			return '';
		}
		var busy = state.busy === 'rollback:' + it.file;
		return (
			'<button type="button" class="mk-btn ' + ( small ? 'mk-btn-quiet mk-btn-xs' : 'mk-btn-sm' ) + '" data-act="rollback" data-entry="' + esc( entry.id ) + '" data-file="' + esc( it.file ) + '" data-name="' + esc( it.name ) + '" data-from="' + esc( it.from ) + '" data-to="' + esc( it.to ) + '"' + ( state.busy ? ' disabled' : '' ) + '>' +
			icon( busy ? 'loader' : 'undo', busy ? 'mk-spin' : '' ) +
			esc( sprintf( /* translators: %s: version. */ __( 'Roll back to %s', 'mykavo' ), it.from ) ) + '</button>'
		);
	}

	/** What happened with rollback for one update, in a line. */
	function rollbackNote( entry ) {
		var rb = entry.rollback;
		var out = '';
		if ( rb && rb.done && rb.done.length ) {
			out += '<span class="mk-tag mk-tag-undo">' + icon( 'undo' ) + esc( rb.trigger === 'auto'
				? sprintf( /* translators: %s: plugin names. */ __( 'Rolled back automatically: %s', 'mykavo' ), rb.done.join( ', ' ) )
				: sprintf( /* translators: %s: plugin names. */ __( 'Rolled back: %s', 'mykavo' ), rb.done.join( ', ' ) ) ) + '</span>';
		}
		if ( rb && rb.failed ) {
			Object.keys( rb.failed ).forEach( function ( name ) {
				out += '<span class="mk-rollback-fail">' + icon( 'alert' ) + esc( sprintf( /* translators: 1: plugin name, 2: error message. */ __( 'Could not roll back %1$s: %2$s', 'mykavo' ), name, rb.failed[ name ] ) ) + '</span>';
			} );
		}
		var w = entry.watch;
		if ( ! out && w && feat( 'autoRollback' ) ) {
			if ( w.state === 'watching' || w.state === 'rolling-back' ) {
				out = '<span class="mk-fine mk-watch">' + icon( 'clock' ) + esc( __( 'Rolls back automatically if MyKavo finds a critical change.', 'mykavo' ) ) + '</span>';
			} else if ( w.state === 'nothing' ) {
				out = '<span class="mk-fine mk-watch">' + icon( 'alert' ) + esc( __( 'MyKavo recommended a rollback, but nothing in this update could be rolled back here.', 'mykavo' ) ) + '</span>';
			}
		}
		return out ? '<p class="mk-rollback-note">' + out + '</p>' : '';
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
			'<span class="mk-status">' + esc( entry.trigger === 'auto' ? __( 'Automatic', 'mykavo' ) : __( 'By an admin', 'mykavo' ) ) + '</span></p>' +
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
			'<h2>' + esc( __( 'Update without fear', 'mykavo' ) ) + '</h2>' +
			'<p>' + esc( __( 'Every time WordPress updates a plugin, theme or itself - including automatic updates overnight - and whenever a plugin is switched on or off or the theme changes, MyKavo checks your pages against the approved baseline and tells you whether anything broke, and which change did it.', 'mykavo' ) ) + '</p>' +
			'</div></div>' +
			'<button type="button" class="mk-switch" role="switch" aria-checked="' + on + '" data-act="toggle-updates" data-key="toggle-updates">' +
			'<span class="mk-switch-track"><span class="mk-switch-thumb"></span></span>' +
			'<span>' + esc( on ? __( 'Checks on', 'mykavo' ) : __( 'Checks off', 'mykavo' ) ) + '</span></button>' +
			'</section>';

		var plan = planOk
			? ''
			: '<div class="mk-banner">' + icon( 'zap' ) + '<span>' + esc( __( 'Updates are listed here on every plan, and any plugin from WordPress.org can be rolled back in one click. Checking the site automatically after each update comes with paid plans, from Starter.', 'mykavo' ) ) + '</span>' +
				( billing ? '<a class="mk-btn mk-btn-primary mk-btn-sm" href="' + esc( billing ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'See plans', 'mykavo' ) ) + '</a>' : '' ) + '</div>';

		var list = log.length
			? '<ul class="mk-list mk-updates">' + log.map( function ( e ) {
				return updateEntry( e, scans, false );
			} ).join( '' ) + '</ul>'
			: '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'shield' ) + '</span><strong>' + esc( __( 'No updates yet', 'mykavo' ) ) + '</strong><span>' +
				esc( __( 'The next time a plugin, theme or WordPress updates, it appears here with a verdict.', 'mykavo' ) ) + '</span></div>';

		return (
			'<div class="mk-grid">' + intro + plan + safeUpdateCard() + autoRollbackCard() +
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Update history', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Kept on this site. Last 30 updates.', 'mykavo' ) ) + '</span></div>' + list + '</section>' +
			// Two stacked columns, not a 2x2 grid: cards of different heights
			// would leave gaps under the shorter one in each row.
			'<div class="mk-grid mk-grid-2 mk-cols"><div class="mk-col">' + healthCard() + snapshotsCard() + '</div>' +
			'<div class="mk-col">' + windowCard() + mailCard() + '</div></div></div>'
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
		if ( ! state.features ) {
			return '';
		}
		if ( ! feat( 'autoRollback' ) ) {
			return upsell( __( 'Rolling back automatically when an update breaks something comes with Pro and Agency.', 'mykavo' ) );
		}
		var on = !! ( state.updates && state.updates.autoRollback );
		return (
			'<section class="mk-card mk-card-pad mk-setting">' +
			'<div><h3 class="mk-card-title">' + icon( 'undo', 'mk-title-icon' ) + esc( __( 'Roll back automatically when an update breaks something', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-setting-text">' + esc( __( 'When MyKavo\'s check after an update finds a critical change, or the site crashes right after it, this site puts the plugins and themes from that update back to their previous version (from WordPress.org or the saved copy), and MyKavo checks again. MyKavo itself is never rolled back.', 'mykavo' ) ) + '</p></div>' +
			'<button type="button" class="mk-switch" role="switch" aria-checked="' + on + '" data-act="toggle-auto-rollback" data-key="toggle-auto-rollback">' +
			'<span class="mk-switch-track"><span class="mk-switch-thumb"></span></span>' +
			'<span>' + esc( on ? __( 'On', 'mykavo' ) : __( 'Off', 'mykavo' ) ) + '</span></button>' +
			'</section>'
		);
	}

	function shortDate( day ) {
		var d = new Date( String( day ) + 'T00:00:00Z' );
		return isNaN( d.getTime() ) ? String( day || '' ) : d.toLocaleDateString( locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' } );
	}

	function healthCard() {
		var head =
			'<div class="mk-card-head"><h3 class="mk-card-title">' + icon( 'puzzle', 'mk-title-icon' ) + esc( __( 'Plugin health', 'mykavo' ) ) + '</h3>' +
			( feat( 'pluginHealth' ) && state.health
				? '<button type="button" class="mk-btn mk-btn-quiet mk-btn-sm" data-act="health-refresh"' + ( state.busy === 'health' ? ' disabled' : '' ) + '>' + icon( 'refresh', state.busy === 'health' ? 'mk-spin' : '' ) + esc( __( 'Check again', 'mykavo' ) ) + '</button>'
				: '' ) +
			'</div>';
		var body;
		var h = state.health;
		if ( ! state.features ) {
			body = loadingBlock( 80 );
		} else if ( ! feat( 'pluginHealth' ) || ( h && ! h.allowed ) ) {
			body = upsell( __( 'See which of your plugins were closed on WordPress.org or have not been updated in two years, on paid plans.', 'mykavo' ) );
		} else if ( state.healthError && ! h ) {
			body = '<div class="mk-empty"><span>' + esc( state.healthError ) + '</span><button type="button" class="mk-btn mk-btn-sm" data-act="health-refresh">' + esc( __( 'Try again', 'mykavo' ) ) + '</button></div>';
		} else if ( ! h ) {
			body = '<div class="mk-card-pad">' + loadingBlock( 80 ) + '</div>';
		} else if ( ! h.flagged.length ) {
			body = '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'check' ) + '</span><strong>' + esc( __( 'No abandoned plugins', 'mykavo' ) ) + '</strong><span>' +
				esc( sprintf( _n( '%d plugin checked against WordPress.org. None are closed or more than two years without an update.', '%d plugins checked against WordPress.org. None are closed or more than two years without an update.', h.checked || 0, 'mykavo' ), h.checked || 0 ) ) + '</span></div>';
		} else {
			body = '<ul class="mk-list mk-health">' + h.flagged.map( function ( f ) {
				var closed = f.status === 'closed';
				return (
					'<li><div class="mk-row" style="cursor:default">' +
					'<span class="mk-sev mk-sev-' + ( closed ? 'HIGH' : 'MEDIUM' ) + '">' + esc( closed ? __( 'Closed', 'mykavo' ) : __( 'Outdated', 'mykavo' ) ) + '</span>' +
					'<span class="mk-row-main"><span class="mk-row-title">' + esc( f.name || f.slug ) + '</span>' +
					'<span class="mk-row-meta">' + ( f.reason ? '<span>' + esc( f.reason ) + '</span>' : '' ) +
					( f.lastUpdated ? '<span>' + esc( sprintf( /* translators: %s: date. */ __( 'Last updated %s', 'mykavo' ), shortDate( f.lastUpdated ) ) ) + '</span>' : '' ) +
					'</span></span></div></li>'
				);
			} ).join( '' ) + '</ul>';
		}
		var foot = h && h.at && feat( 'pluginHealth' ) && h.allowed
			? '<p class="mk-fine mk-card-foot">' + esc( sprintf( /* translators: %s: relative time. */ __( 'Checked %s. MyKavo checks again once a day.', 'mykavo' ), rel( new Date( h.at * 1000 ).toISOString() ) ) ) + '</p>'
			: '';
		return '<section class="mk-card">' + head + vulnBlock() + body + foot + '</section>';
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

	function windowForm( d ) {
		var zones = window.Intl && Intl.supportedValuesOf ? Intl.supportedValuesOf( 'timeZone' ) : [];
		var hours = function ( name, from, to, value ) {
			var out = '<select name="' + name + '" id="mk-win-' + name + '">';
			for ( var h = from; h <= to; h++ ) {
				out += '<option value="' + h + '"' + ( h === value ? ' selected' : '' ) + '>' + esc( hourLabel( h ) ) + '</option>';
			}
			return out + '</select>';
		};
		var busy = state.busy === 'window';
		return (
			'<form class="mk-win-form" data-form="window">' +
			'<label class="mk-check"><input type="checkbox" name="enabled"' + ( d.enabled ? ' checked' : '' ) + '> ' + esc( __( 'Only allow automatic updates inside this window', 'mykavo' ) ) + '</label>' +
			'<fieldset class="mk-days"><legend>' + esc( __( 'Days', 'mykavo' ) ) + '</legend>' +
			[ 1, 2, 3, 4, 5, 6, 0 ].map( function ( day ) {
				return '<label class="mk-day"><input type="checkbox" name="day" value="' + day + '"' + ( d.days.indexOf( day ) !== -1 ? ' checked' : '' ) + '><span>' + esc( dayName( day ) ) + '</span></label>';
			} ).join( '' ) +
			'</fieldset>' +
			'<div class="mk-win-row">' +
			'<label for="mk-win-startHour">' + esc( __( 'From', 'mykavo' ) ) + '</label>' + hours( 'startHour', 0, 23, d.startHour ) +
			'<label for="mk-win-endHour">' + esc( __( 'to', 'mykavo' ) ) + '</label>' + hours( 'endHour', 1, 24, d.endHour ) +
			'</div>' +
			'<div class="mk-win-row"><label for="mk-win-tz">' + esc( __( 'Time zone', 'mykavo' ) ) + '</label>' +
			'<input id="mk-win-tz" name="timezone" type="text" list="mk-win-zones" value="' + esc( d.timezone ) + '" autocomplete="off" spellcheck="false">' +
			( zones.length ? '<datalist id="mk-win-zones">' + zones.map( function ( z ) {
				return '<option value="' + esc( z ) + '">';
			} ).join( '' ) + '</datalist>' : '' ) +
			'</div>' +
			'<p class="mk-fine">' + esc( __( 'An end time earlier than the start runs past midnight. Updates WordPress offers outside the window wait for the next one.', 'mykavo' ) ) + '</p>' +
			'<div class="mk-win-actions"><button type="submit" class="mk-btn mk-btn-dark mk-btn-sm"' + ( busy ? ' disabled' : '' ) + '>' + ( busy ? icon( 'loader', 'mk-spin' ) : '' ) + esc( __( 'Save window', 'mykavo' ) ) + '</button>' +
			'<button type="button" class="mk-btn mk-btn-quiet mk-btn-sm" data-act="window-cancel">' + esc( __( 'Cancel', 'mykavo' ) ) + '</button></div>' +
			'</form>'
		);
	}

	function windowCard() {
		var head = '<div class="mk-card-head"><h3 class="mk-card-title">' + icon( 'clock', 'mk-title-icon' ) + esc( __( 'Update window', 'mykavo' ) ) + '</h3>' +
			( feat( 'updateWindows' ) && state.win && state.win.allowed && ! state.winEdit
				? '<button type="button" class="mk-btn mk-btn-quiet mk-btn-sm" data-act="window-edit">' + esc( state.win.updateWindow ? __( 'Edit', 'mykavo' ) : __( 'Set a window', 'mykavo' ) ) + '</button>'
				: '' ) +
			'</div>';
		var body;
		var w = state.win;
		if ( ! state.features ) {
			body = loadingBlock( 80 );
		} else if ( ! feat( 'updateWindows' ) || ( w && ! w.allowed ) ) {
			body = upsell( __( 'Choose the days and hours when WordPress may install automatic updates, on the Agency plan.', 'mykavo' ) );
		} else if ( state.winError && ! w ) {
			body = '<div class="mk-empty"><span>' + esc( state.winError ) + '</span><button type="button" class="mk-btn mk-btn-sm" data-act="window-retry">' + esc( __( 'Try again', 'mykavo' ) ) + '</button></div>';
		} else if ( ! w ) {
			body = '<div class="mk-card-pad">' + loadingBlock( 80 ) + '</div>';
		} else if ( state.winEdit ) {
			body = '<div class="mk-card-pad">' + windowForm( state.winEdit ) + '</div>';
		} else if ( w.updateWindow && w.updateWindow.enabled && w.updateWindow.days.length ) {
			body = '<div class="mk-card-pad"><p class="mk-setting-text">' + esc( windowSummary( w.updateWindow ) ) + '</p>' +
				'<p class="mk-verdict mk-verdict-' + ( w.open ? 'good' : 'quiet' ) + '">' + icon( w.open ? 'check' : 'clock' ) +
				esc( w.open ? __( 'Inside the window now: automatic updates may run.', 'mykavo' ) : __( 'Outside the window now: automatic updates wait.', 'mykavo' ) ) + '</p></div>';
		} else {
			body = '<div class="mk-card-pad"><p class="mk-setting-text">' + esc( __( 'No window set. WordPress installs automatic updates whenever it finds them, day or night.', 'mykavo' ) ) + '</p></div>';
		}
		return '<section class="mk-card">' + head + body + '</section>';
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
			'<span class="mk-fine">WooCommerce</span></div>' +
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
				: '<div class="mk-store-foot"><p class="mk-store-ok">' + icon( 'check' ) + esc( __( 'Your store pages are all monitored.', 'mykavo' ) ) + '</p></div>' ) +
			guardBlock() +
			'</section>'
		);
	}

	/** WooCommerce checkout guard: watch the buttons that take money. */
	function guardBlock() {
		if ( ! state.features ) {
			return '';
		}
		var g = state.guard;
		if ( ! feat( 'checkoutGuard' ) || ( g && g.allowed === false ) ) {
			return '<div class="mk-store-foot mk-guard">' + upsell( __( 'Get a critical alert when the Place order, Proceed to checkout or Add to cart button goes missing, with Pro and Agency.', 'mykavo' ) ) + '</div>';
		}
		if ( g && g.allowed ) {
			return (
				'<div class="mk-store-foot mk-guard"><p class="mk-store-ok">' + icon( 'shield' ) +
				esc( sprintf(
					/* translators: 1: number of buttons, 2: number of pages. */
					__( 'Checkout guard is on: %1$d buttons watched on %2$d pages.', 'mykavo' ),
					g.elements,
					g.pages
				) ) + '</p></div>'
			);
		}
		var busy = state.busy === 'guard';
		return (
			'<div class="mk-store-foot mk-guard"><p>' + esc( __( 'Also watch the Place order, Proceed to checkout and Add to cart buttons themselves, and hear about it the moment one goes missing.', 'mykavo' ) ) + '</p>' +
			'<button type="button" class="mk-btn mk-btn-dark mk-btn-sm" data-act="guard-checkout"' + ( busy ? ' disabled' : '' ) + '>' +
			( busy ? icon( 'loader', 'mk-spin' ) : icon( 'lock' ) ) + esc( __( 'Guard checkout', 'mykavo' ) ) + '</button></div>'
		);
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
		var head = '<div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Last 12 months', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Kept by MyKavo', 'mykavo' ) ) + '</span></div>';
		if ( ! state.features ) {
			return '';
		}
		var h = state.aiHistory;
		if ( ! feat( 'aiInsights' ) || ( h && h.allowed === false ) ) {
			return upsell( __( 'Keep 12 months of AI crawler history, with the day each crawler first visited, on paid plans.', 'mykavo' ) );
		}
		if ( state.aiHistoryError && ! h ) {
			return '<section class="mk-card">' + head + '<div class="mk-empty"><span>' + esc( state.aiHistoryError ) + '</span><button type="button" class="mk-btn mk-btn-sm" data-act="history-retry">' + esc( __( 'Try again', 'mykavo' ) ) + '</button></div></section>';
		}
		if ( ! h ) {
			return '<section class="mk-card">' + head + '<div class="mk-card-pad">' + loadingBlock( 140 ) + '</div></section>';
		}

		// Twelve calendar months (UTC), oldest first.
		var months = [];
		var now = new Date();
		for ( var i = 11; i >= 0; i-- ) {
			var d = new Date( Date.UTC( now.getUTCFullYear(), now.getUTCMonth() - i, 1 ) );
			months.push( { key: d.toISOString().slice( 0, 7 ), date: d, hits: 0, errors: 0 } );
		}
		var byMonth = {};
		months.forEach( function ( m ) {
			byMonth[ m.key ] = m;
		} );
		var agents = {};
		var total = 0;
		( h.days || [] ).forEach( function ( row ) {
			var m = byMonth[ String( row.day ).slice( 0, 7 ) ];
			if ( m ) {
				m.hits += row.hits;
				m.errors += row.errors;
			}
			total += row.hits;
			if ( ! agents[ row.agent ] ) {
				agents[ row.agent ] = { agent: row.agent, hits: 0, errors: 0 };
			}
			agents[ row.agent ].hits += row.hits;
			agents[ row.agent ].errors += row.errors;
		} );
		var first = h.firstSeen || {};
		Object.keys( first ).forEach( function ( a ) {
			if ( ! agents[ a ] ) {
				agents[ a ] = { agent: a, hits: 0, errors: 0 };
			}
		} );
		var rows = Object.keys( agents ).map( function ( a ) {
			return agents[ a ];
		} ).sort( function ( a, b ) {
			return b.hits - a.hits;
		} );
		if ( ! rows.length ) {
			return '<section class="mk-card">' + head + '<div class="mk-empty"><span>' + esc( __( 'MyKavo has no AI crawler visits for this site yet. Daily totals are shared once a day.', 'mykavo' ) ) + '</span></div></section>';
		}
		var max = 1;
		months.forEach( function ( m ) {
			max = Math.max( max, m.hits );
		} );
		var monthFmt = function ( date ) {
			return date.toLocaleDateString( locale, { month: 'short', year: 'numeric', timeZone: 'UTC' } );
		};
		var known = ( state.bots && state.bots.agents ) || [];
		var ownerOf = function ( name ) {
			for ( var k = 0; k < known.length; k++ ) {
				if ( known[ k ].agent === name ) {
					return known[ k ].owner;
				}
			}
			return '';
		};
		var chart =
			'<div class="mk-bars mk-bars-months" role="img" aria-label="' + esc( sprintf( /* translators: %s: number of visits. */ __( '%s AI crawler visits over the last 12 months', 'mykavo' ), num( total ) ) ) + '">' +
			months.map( function ( m ) {
				var pct = m.hits ? Math.max( 4, Math.round( ( m.hits / max ) * 100 ) ) : 0;
				return '<span class="mk-bar' + ( m.hits ? '' : ' is-zero' ) + '" style="height:' + ( m.hits ? pct : 3 ) + '%" title="' + esc( monthFmt( m.date ) + ': ' + num( m.hits ) ) + '"></span>';
			} ).join( '' ) +
			'</div>' +
			'<div class="mk-bars-axis"><span>' + esc( monthFmt( months[ 0 ].date ) ) + '</span><span>' + esc( monthFmt( months[ 11 ].date ) ) + '</span></div>';
		var table =
			'<div class="mk-table-wrap"><table class="mk-table"><thead><tr>' +
			'<th>' + esc( __( 'Crawler', 'mykavo' ) ) + '</th><th class="mk-num">' + esc( __( 'Visits', 'mykavo' ) ) + '</th><th class="mk-num">' + esc( __( 'Errors', 'mykavo' ) ) + '</th><th>' + esc( __( 'First seen', 'mykavo' ) ) + '</th>' +
			'</tr></thead><tbody>' +
			rows.map( function ( a ) {
				var owner = ownerOf( a.agent );
				return '<tr><td>' + ( owner ? '<b>' + esc( owner ) + '</b><span class="mk-cell-note"><code>' + esc( a.agent ) + '</code></span>' : '<code>' + esc( a.agent ) + '</code>' ) + '</td>' +
					'<td class="mk-num">' + esc( num( a.hits ) ) + '</td>' +
					'<td class="mk-num' + ( a.errors ? ' mk-bad' : '' ) + '">' + esc( num( a.errors ) ) + '</td>' +
					'<td>' + esc( first[ a.agent ] ? shortDate( first[ a.agent ] ) : '-' ) + '</td></tr>';
			} ).join( '' ) +
			'</tbody></table></div>';
		return '<section class="mk-card">' + head + chart + table + '</section>';
	}

	/* ---------------------------------------------------------------- 1.3.1 -- */

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
		if ( ! state.overview ) {
			return '';
		}
		var p = planId();
		return (
			'<button type="button" class="mk-plan-chip mk-plan-' + p + '" data-act="tab" data-tab="plan" title="' + esc( __( 'Your plan', 'mykavo' ) ) + '">' +
			planBadge( p, 30 ) + '<span class="mk-plan-chip-text"><b>' + esc( planLabel( p ) ) + '</b><span>' + esc( metalName( p ) ) + '</span></span></button>'
		);
	}

	function billingUrl() {
		var links = ( state.overview && state.overview.links ) || {};
		return safeUrl( links.billing ) || '';
	}

	function upgradeButton( label, cls ) {
		var url = billingUrl();
		return url ? '<a class="mk-btn mk-btn-primary ' + ( cls || '' ) + '" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' + icon( 'zap' ) + esc( label || __( 'Upgrade to Pro', 'mykavo' ) ) + '</a>' : '';
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
		var list = ( state.alerts && state.alerts.alerts ) || [];
		var open = list.filter( function ( a ) {
			return ! a.dismissed;
		} );
		if ( ! open.length ) {
			return '';
		}
		return (
			'<section class="mk-card mk-alerts" role="alert"><div class="mk-alerts-head">' + icon( 'alert' ) +
			'<h3>' + esc( __( 'An important setting changed on this site', 'mykavo' ) ) + '</h3>' +
			( READONLY ? '' : '<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="dismiss-alert" data-id="all">' + esc( __( 'It was me - dismiss', 'mykavo' ) ) + '</button>' ) +
			'</div><ul>' +
			open.slice( 0, 5 ).map( function ( a ) {
				return '<li><span class="mk-sev mk-sev-' + ( a.severity === 'critical' ? 'CRITICAL' : 'HIGH' ) + '">' + esc( a.severity === 'critical' ? __( 'Critical', 'mykavo' ) : __( 'High', 'mykavo' ) ) + '</span>' +
					'<span>' + esc( a.message ) + ( a.by ? ' <span class="mk-fine">' + esc( sprintf( /* translators: %s: user name. */ __( 'by %s', 'mykavo' ), a.by ) ) + '</span>' : '' ) +
					' <span class="mk-fine">' + esc( rel( new Date( a.at * 1000 ).toISOString() ) ) + '</span></span></li>';
			} ).join( '' ) +
			'</ul><p class="mk-fine">' + esc( feat( 'instantAlerts' )
				? __( 'MyKavo also sent this to your alert email.', 'mykavo' )
				: __( 'Shown on every WordPress screen until dismissed. Paid plans also get an instant email or Slack alert.', 'mykavo' ) ) + '</p></section>'
		);
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
		// Why it is worth opening: most owners never connect site issues with lost visitors and sales.
		body += '<p class="mk-audit-why">' + esc( __( 'Broken pages, slow loading and missing titles quietly cost you visitors and sales. The audit shows what each issue costs you and how to fix it.', 'mykavo' ) ) + '</p>';
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
			'<button type="button" class="mk-link" data-act="tab" data-tab="plan">' + esc( planAtLeast( 'pro' ) ? __( 'Everything in your plan', 'mykavo' ) : __( 'See what Pro adds', 'mykavo' ) ) + '</button>' +
			'</section>'
		);
	}

	var PRO_BENEFITS = [
		[ 'activity', 'pro', __( 'Daily checks on 8 websites', 'mykavo' ), __( '15 pages each, checked every day instead of every week, plus 20 manual scans a day.', 'mykavo' ) ],
		[ 'shield', 'starter', __( 'A check after every update', 'mykavo' ), __( 'Safe Updates compares your pages after each plugin, theme and WordPress update, and names the one that broke something.', 'mykavo' ) ],
		[ 'undo', 'pro', __( 'Automatic rollback', 'mykavo' ), __( 'When an update breaks something critical, it is put back by itself - day or night - and the site checked again.', 'mykavo' ) ],
		[ 'clock', 'pro', __( 'Risky updates held back', 'mykavo' ), __( 'An automatic update that caused changes on other MyKavo sites waits 48 hours before it reaches yours.', 'mykavo' ) ],
		[ 'lock', 'pro', __( 'Security fixes, automatically', 'mykavo' ), __( 'A plugin with a known security issue is updated as soon as the fixed version is out.', 'mykavo' ) ],
		[ 'eye', 'pro', __( 'Watch buttons and forms', 'mykavo' ), __( 'Pick a buy button or contact form on the page; get a critical alert the moment it disappears or changes.', 'mykavo' ) ],
		[ 'bell', 'pro', __( 'Contact forms tested', 'mykavo' ), __( 'MyKavo sends a test entry through your contact forms so you know messages still arrive.', 'mykavo' ) ],
		[ 'bot', 'pro', __( 'Ask ChatGPT and Claude', 'mykavo' ), __( 'Connect MyKavo to your AI assistant and ask what changed on your sites, in plain words.', 'mykavo' ) ],
		[ 'zap', 'pro', __( '100 AI explanations a month', 'mykavo' ), __( 'Every change explained: what it means for visitors and SEO, and what to do.', 'mykavo' ) ],
		[ 'layers', 'pro', __( 'Site audits of 1,500 pages', 'mykavo' ), __( 'A full technical SEO crawl, up to ten times a day.', 'mykavo' ) ],
		[ 'file', 'pro', __( 'A year of history', 'mykavo' ), __( 'Every change, scan and screenshot kept for 12 months, and up to 3 team members.', 'mykavo' ) ],
	];

	function planView() {
		var o = state.overview;
		if ( ! o ) {
			return loadingBlock( 300 );
		}
		var p = planId();
		var hero =
			'<section class="mk-card mk-plan-hero mk-plan-' + p + '">' +
			'<div class="mk-plan-hero-main">' + planBadge( p, 96 ) +
			'<div><p class="mk-eyebrow">' + esc( __( 'Your plan', 'mykavo' ) ) + '</p>' +
			'<h3 class="mk-plan-name">' + esc( planLabel( p ) ) + ' <span>' + esc( metalName( p ) ) + '</span></h3>' +
			'<p class="mk-fine">' + esc( o.workspace.name ) + '</p></div></div>' +
			'<div class="mk-plan-hero-side">' +
			( planAtLeast( 'pro' )
				? '<p class="mk-fine">' + esc( p === 'agency' ? __( 'Every MyKavo feature is included.', 'mykavo' ) : __( 'Need a branded site report or update windows? Agency has both.', 'mykavo' ) ) + '</p>' +
					( p === 'agency' ? '' : '<a class="mk-btn mk-btn-soft" href="' + esc( safeUrl( cfg.pricingUrl ) || '' ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Compare plans', 'mykavo' ) ) + icon( 'external' ) + '</a>' )
				: upgradeButton( __( 'Upgrade to Pro', 'mykavo' ) ) + '<a class="mk-link" href="' + esc( safeUrl( cfg.pricingUrl ) || '' ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Compare all plans', 'mykavo' ) ) + icon( 'external' ) + '</a>' ) +
			'</div></section>';

		var benefits =
			'<section class="mk-card"><div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( planAtLeast( 'pro' ) ? __( 'What your plan includes', 'mykavo' ) : __( 'What Pro adds', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Everything below runs on MyKavo\'s servers or comes from them. Nothing extra loads on your site.', 'mykavo' ) ) + '</p></div></div>' +
			'<ul class="mk-benefits">' +
			PRO_BENEFITS.map( function ( b ) {
				var has = planAtLeast( b[ 1 ] );
				return '<li class="' + ( has ? 'is-on' : '' ) + '"><span class="mk-benefit-icon">' + icon( b[ 0 ] ) + '</span><div><p class="mk-benefit-title">' + esc( b[ 2 ] ) +
					( has ? '<span class="mk-chip mk-chip-good">' + icon( 'check' ) + esc( __( 'Included', 'mykavo' ) ) + '</span>' : '' ) + '</p><p class="mk-fine">' + esc( b[ 3 ] ) + '</p></div></li>';
			} ).join( '' ) +
			'</ul>' +
			( planAtLeast( 'pro' ) ? '' : '<div class="mk-card-foot mk-benefits-foot">' + upgradeButton( __( 'Upgrade to Pro', 'mykavo' ) ) + '<span class="mk-fine">' + esc( __( 'Cancel any time. Your free plan keeps working either way.', 'mykavo' ) ) + '</span></div>' ) +
			'</section>';

		return '<div class="mk-grid">' + hero + '<div class="mk-grid mk-grid-2">' + mcpCard() + auditCard( o ) + '</div>' + benefits + '</div>';
	}

	/** ChatGPT, Claude and other AI assistants, through MyKavo's MCP server (Pro and Agency). */
	function mcpCard() {
		var o = state.overview;
		var links = ( o && o.links ) || {};
		var allowed = o && o.workspace.plan.includes ? !! o.workspace.plan.includes.aiAssistants : planAtLeast( 'pro' );
		var endpoint = safeUrl( links.mcpEndpoint ) || safeUrl( ( cfg.appUrl || 'https://mykavo.app' ) + '/api/mcp' );
		var setup = safeUrl( links.aiAssistants ) || safeUrl( ( cfg.appUrl || 'https://mykavo.app' ) + '/dashboard/ai-assistants' );
		var asks = [ __( 'What changed on my site this week?', 'mykavo' ), __( 'Did the last plugin update break anything?', 'mykavo' ), __( 'Which pages do AI crawlers read most?', 'mykavo' ) ];
		var body = allowed
			? '<p class="mk-fine">' + esc( __( 'Add MyKavo as a connector in ChatGPT, Claude or any MCP app, sign in, and ask in plain words.', 'mykavo' ) ) + '</p>' +
				'<div class="mk-code mk-code-inline"><code>' + esc( endpoint ) + '</code>' + copyButton( endpoint, __( 'Copy address', 'mykavo' ) ) + '</div>' +
				'<a class="mk-btn mk-btn-dark mk-btn-sm" href="' + esc( setup ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Set up step by step', 'mykavo' ) ) + icon( 'external' ) + '</a>'
			: '<p class="mk-fine">' + esc( __( 'Ask ChatGPT or Claude about your sites and get answers from MyKavo\'s real monitoring data. Comes with Pro and Agency.', 'mykavo' ) ) + '</p>' + upgradeButton( __( 'Upgrade to Pro', 'mykavo' ), 'mk-btn-sm' );
		return (
			'<section class="mk-card mk-card-pad mk-mcp' + ( allowed ? '' : ' is-locked' ) + '">' +
			'<div class="mk-card-head mk-card-head-flush"><div><h3 class="mk-card-title">' + esc( __( 'Ask ChatGPT and Claude', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'AI assistants (MCP) · Pro and Agency', 'mykavo' ) ) + '</p></div>' +
			'<span class="mk-chip ' + ( allowed ? 'mk-chip-good' : 'mk-chip-calm' ) + '">' + icon( allowed ? 'check' : 'lock' ) + esc( allowed ? __( 'Included', 'mykavo' ) : __( 'Pro', 'mykavo' ) ) + '</span></div>' +
			'<ul class="mk-asks">' + asks.map( function ( q ) {
				return '<li>' + icon( 'bot' ) + esc( q ) + '</li>';
			} ).join( '' ) + '</ul>' + body + '</section>'
		);
	}

	/* ---------------------------------------------------- safe update all -- */

	function safeUpdateCard() {
		var s = state.safe;
		if ( ! s || READONLY ) {
			return '';
		}
		var run = state.safeRun;
		var head = '<div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Safe Update All', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Back up, update one plugin at a time, check the site after each, roll back any that break it.', 'mykavo' ) ) + '</p></div></div>';
		if ( run ) {
			var rows = s.plugins.map( function ( p ) {
				var r = run.rows[ p.file ];
				var st = r ? r.outcome : ( run.current === p.file ? 'running' : 'waiting' );
				var label = {
					waiting: __( 'Waiting', 'mykavo' ),
					running: __( 'Updating and checking...', 'mykavo' ),
					updated: __( 'Updated, site works', 'mykavo' ),
					'rolled-back': __( 'Broke the site - rolled back', 'mykavo' ),
					broken: __( 'Broke the site - roll back by hand', 'mykavo' ),
					failed: __( 'Could not update', 'mykavo' ),
				}[ st ];
				var tone = { updated: 'good', 'rolled-back': 'warn', broken: 'bad', failed: 'bad', running: 'busy' }[ st ] || 'quiet';
				return '<li class="mk-safe-row"><span>' + esc( p.name ) + ' <code>' + esc( p.from + ' → ' + p.to ) + '</code></span>' +
					'<span class="mk-verdict mk-verdict-' + tone + '">' + ( st === 'running' ? icon( 'loader', 'mk-spin' ) : '' ) + esc( label ) + '</span>' +
					( r && r.problem ? '<span class="mk-fine">' + esc( r.problem ) + '</span>' : '' ) + '</li>';
			} ).join( '' );
			var phase = run.phase === 'backup'
				? '<p class="mk-banner">' + icon( 'loader', 'mk-spin' ) + '<span>' + esc( __( 'Waiting for the UpdraftPlus backup to finish...', 'mykavo' ) ) + '</span><button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="safe-skip-backup">' + esc( __( 'Skip waiting', 'mykavo' ) ) + '</button></p>'
				: run.phase === 'baseline'
					? '<p class="mk-banner">' + icon( 'loader', 'mk-spin' ) + '<span>' + esc( __( 'MyKavo is taking a fresh baseline before the updates...', 'mykavo' ) ) + '</span></p>'
					: run.phase === 'done' && run.summary
						? '<p class="mk-banner mk-banner-good">' + icon( 'check' ) + '<span>' + esc( safeVerdict( run.summary ) ) + '</span><button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="safe-close">' + esc( __( 'Done', 'mykavo' ) ) + '</button></p>'
						: '';
			return '<section class="mk-card">' + head + phase + '<ul class="mk-safe-rows">' + rows + '</ul></section>';
		}
		if ( ! s.plugins.length ) {
			return '<section class="mk-card">' + head + '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'check' ) + '</span><strong>' + esc( __( 'Every plugin is up to date', 'mykavo' ) ) + '</strong></div></section>';
		}
		if ( ! s.canUpdate ) {
			return '<section class="mk-card">' + head + '<p class="mk-card-pad mk-fine">' + esc( __( 'You cannot update plugins on this site (permissions or DISALLOW_FILE_MODS).', 'mykavo' ) ) + '</p></section>';
		}
		var backup = s.backup
			? ( s.backup.canStart
				? '<label class="mk-check"><input type="checkbox" data-act="safe-backup"' + ( s.backupFirst ? ' checked' : '' ) + '> ' + esc( sprintf( /* translators: %s: backup plugin name. */ __( 'Back up first with %s', 'mykavo' ), s.backup.name ) ) + '</label>'
				: '<p class="mk-fine">' + icon( 'check' ) + esc( sprintf( /* translators: %s: backup plugin name. */ __( '%s backs this site up continuously, so there is nothing to start.', 'mykavo' ), s.backup.name ) ) + '</p>' )
			: '<p class="mk-fine">' + esc( __( 'Tip: with UpdraftPlus active, MyKavo can start a backup first.', 'mykavo' ) ) + '</p>';
		var baselineOk = feat( 'baselineBeforeUpdate' );
		var baseline = '<label class="mk-check' + ( baselineOk ? '' : ' is-locked' ) + '"><input type="checkbox" data-act="safe-baseline"' + ( baselineOk && state.safeBaseline !== false ? ' checked' : '' ) + ( baselineOk ? '' : ' disabled' ) + '> ' +
			esc( __( 'Take a fresh baseline first', 'mykavo' ) ) + ( baselineOk ? '' : ' <span class="mk-fine">(' + esc( __( 'paid plans', 'mykavo' ) ) + ')</span>' ) + '</label>';
		return (
			'<section class="mk-card">' + head +
			'<ul class="mk-safe-rows">' + s.plugins.map( function ( p ) {
				return '<li class="mk-safe-row"><span>' + esc( p.name ) + ' <code>' + esc( p.from + ' → ' + p.to ) + '</code></span></li>';
			} ).join( '' ) + '</ul>' +
			'<div class="mk-card-foot mk-safe-foot">' + backup + baseline +
			'<button type="button" class="mk-btn mk-btn-dark" data-act="safe-start">' + icon( 'shield' ) +
			esc( sprintf( /* translators: %d: number of plugins. */ _n( 'Safely update %d plugin', 'Safely update %d plugins', s.plugins.length, 'mykavo' ), s.plugins.length ) ) + '</button></div>' +
			'</section>'
		);
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
		var s = state.snaps;
		if ( ! s ) {
			return '';
		}
		var mb = ( s.bytes / 1048576 ).toFixed( 1 );
		return (
			'<section class="mk-card"><div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Saved copies for rollback', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( sprintf( /* translators: 1: copies per plugin, 2: days. */ __( 'Before every update, the plugin or theme is zipped on this site, so any of them - premium ones too - can be rolled back. The last %1$d per plugin are kept, for %2$d days.', 'mykavo' ), s.keep, s.days ) ) + '</p></div></div>' +
			( s.items.length
				? '<ul class="mk-list mk-snaps">' + s.items.slice( 0, 8 ).map( function ( it ) {
					return '<li><div class="mk-row" style="cursor:default">' + icon( it.type === 'theme' ? 'brush' : 'plug', 'mk-row-chevron' ) +
						'<span class="mk-row-main"><span class="mk-row-title">' + esc( it.slug ) + ' <code>' + esc( it.version ) + '</code></span>' +
						'<span class="mk-row-meta"><span>' + esc( rel( new Date( it.at * 1000 ).toISOString() ) ) + '</span><span>' + esc( ( it.size / 1048576 ).toFixed( 1 ) + ' MB' ) + '</span></span></span></div></li>';
				} ).join( '' ) + '</ul><p class="mk-fine mk-card-foot">' + esc( sprintf( /* translators: %s: megabytes. */ __( '%s MB on disk in wp-content/mykavo-snapshots, closed to the web.', 'mykavo' ), mb ) ) + '</p>'
				: '<div class="mk-empty"><span>' + esc( __( 'The next update leaves a saved copy here.', 'mykavo' ) ) + '</span></div>' ) +
			'</section>'
		);
	}

	/* ------------------------------------------------- email and forms -- */

	function mailCard() {
		var f = state.forms;
		if ( ! f ) {
			return '';
		}
		var m = f.mail;
		var at = m.last ? rel( new Date( m.last.at * 1000 ).toISOString() ) : '';
		var status = ! m.last
			? '<span class="mk-fine">' + esc( __( 'No test sent yet.', 'mykavo' ) ) + '</span>'
			: m.last.ok
				? '<span class="mk-crash mk-good">' + icon( 'check' ) + esc( sprintf( /* translators: %s: relative time. */ __( 'Last test sent %s', 'mykavo' ), at ) ) + '</span>'
				: '<span class="mk-crash mk-crash-bad">' + icon( 'alert' ) + esc( sprintf( /* translators: 1: relative time, 2: error message. */ __( 'Last test failed %1$s: %2$s', 'mykavo' ), at, m.last.error ) ) + '</span>';
		var forms = f.forms;
		var formsBody;
		if ( ! forms.pages.length ) {
			formsBody = '<p class="mk-fine">' + esc( __( 'No Contact Form 7, Gravity Forms or WPForms form found on a published page.', 'mykavo' ) ) + '</p>';
		} else if ( forms.allowed === false || ! feat( 'formChecks' ) ) {
			formsBody = '<ul class="mk-plain">' + forms.pages.map( function ( p ) {
				return '<li>' + esc( p.title || pathOf( p.url ) ) + ' <span class="mk-fine">' + esc( p.plugin ) + '</span></li>';
			} ).join( '' ) + '</ul>' + upsell( lockedText( 'starter', __( 'Having MyKavo check these forms still work', 'mykavo' ) ) );
		} else {
			var byUrl = {};
			( forms.forms || [] ).forEach( function ( r ) {
				byUrl[ r.url ] = r;
			} );
			formsBody = '<ul class="mk-plain">' + forms.pages.map( function ( p ) {
				var r = byUrl[ p.url ];
				var st = r ? r.status : 'pending';
				var sub = r && r.submission && r.submission.status ? ' · ' + ( r.submission.status === 'ok' ? __( 'test entry delivered', 'mykavo' ) : __( 'test entry failed', 'mykavo' ) ) : '';
				return '<li>' + esc( p.title || pathOf( p.url ) ) + ' <span class="mk-verdict mk-verdict-' + ( st === 'ok' ? 'good' : st === 'broken' ? 'bad' : 'quiet' ) + '">' +
					esc( ( st === 'ok' ? __( 'Form renders', 'mykavo' ) : st === 'broken' ? __( 'Form missing', 'mykavo' ) : __( 'Checking soon', 'mykavo' ) ) + sub ) + '</span></li>';
			} ).join( '' ) + '</ul>' +
				( feat( 'formSubmissions' ) ? '' : '<p class="mk-fine">' + esc( lockedText( 'pro', __( 'A real test entry through each form', 'mykavo' ) ) ) + '</p>' ) +
				( READONLY ? '' : '<p class="mk-mail-actions"><button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="forms-sync"' + ( state.busy === 'forms' ? ' disabled' : '' ) + '>' + icon( 'refresh' ) + esc( __( 'Send form pages to MyKavo', 'mykavo' ) ) + '</button></p>' );
		}
		return (
			'<section class="mk-card mk-mail">' +
			'<div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Email and contact forms', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'A form that silently stops sending costs leads for weeks.', 'mykavo' ) ) + '</p></div></div>' +
			'<div class="mk-mail-block">' +
			'<div class="mk-mail-row"><div>' +
			'<p class="mk-mail-label">' + esc( __( 'Daily email test', 'mykavo' ) ) + ' <span class="mk-chip mk-chip-calm">' + esc( __( 'Free', 'mykavo' ) ) + '</span></p>' +
			'<p class="mk-fine">' + sprintf( esc( /* translators: %s: email address. */ __( 'One short email a day to %s, to prove this site can still send mail.', 'mykavo' ) ), '<b class="mk-mail-to">' + esc( m.to ) + '</b>' ) + '</p></div>' +
			switchButton( 'toggle-mail', m.enabled, __( 'On', 'mykavo' ), __( 'Off', 'mykavo' ), state.busy === 'mail' ) + '</div>' +
			'<div class="mk-mail-status">' + status +
			( READONLY ? '' : '<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="mail-test"' + ( state.busy === 'mail-test' ? ' disabled' : '' ) + '>' + icon( 'zap' ) + esc( __( 'Send a test now', 'mykavo' ) ) + '</button>' ) +
			'</div></div>' +
			'<div class="mk-mail-block"><p class="mk-mail-label">' + esc( __( 'Contact forms', 'mykavo' ) ) + '</p>' + formsBody + '</div>' +
			'</section>'
		);
	}

	/* ------------------------------------------------- vulnerabilities -- */

	function vulnBlock() {
		var h = state.health;
		var v = h && h.vulnerabilities;
		if ( ! v || ! v.count ) {
			return '';
		}
		var head = '<p class="mk-crash mk-crash-bad">' + icon( 'alert' ) + esc( sprintf( /* translators: %d: number of plugins. */ _n( '%d plugin has a known security issue.', '%d plugins have a known security issue.', v.count, 'mykavo' ), v.count ) ) + '</p>';
		var items = v.items
			? '<ul class="mk-plain">' + v.items.map( function ( x ) {
				return '<li><span class="mk-sev mk-sev-' + ( { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }[ x.severity ] || 'MEDIUM' ) + '">' + esc( x.severity ) + '</span> <b>' + esc( x.name || x.slug ) + '</b>: ' + esc( x.title ) +
					( x.fixedIn ? ' <span class="mk-fine">' + esc( sprintf( /* translators: %s: version. */ __( 'fixed in %s', 'mykavo' ), x.fixedIn ) ) + '</span>' : ' <span class="mk-fine">' + esc( __( 'no fix yet', 'mykavo' ) ) + '</span>' ) +
					( x.cve ? ' <code>' + esc( x.cve ) + '</code>' : '' ) + '</li>';
			} ).join( '' ) + '</ul>'
			: upsell( lockedText( 'starter', __( 'Which plugin, what the issue is and the version that fixes it', 'mykavo' ) ) );
		var auto = feat( 'vulnAutoUpdate' )
			? '<div class="mk-setting"><p class="mk-fine">' + esc( __( 'Update vulnerable plugins automatically as soon as the fixed version is out.', 'mykavo' ) ) + '</p>' +
				switchButton( 'toggle-vuln-auto', !! ( state.vulnAuto !== undefined ? state.vulnAuto : h.vulnAutoUpdate ), __( 'On', 'mykavo' ), __( 'Off', 'mykavo' ), state.busy === 'vuln' ) + '</div>'
			: '<p class="mk-fine">' + esc( lockedText( 'pro', __( 'Updating vulnerable plugins automatically', 'mykavo' ) ) ) + '</p>';
		return '<div class="mk-card-pad mk-vulns">' + head + items + auto + '</div>';
	}

	/* ----------------------------------------------------- AI crawlers -- */

	/** Every AI crawler, allowed or blocked in robots.txt. */
	function robotsCard() {
		var r = state.robots;
		var head = '<div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Allow or block each AI crawler', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Rules in robots.txt, a request well-behaved crawlers follow.', 'mykavo' ) ) + '</p></div>' +
			( r && safeUrl( r.url ) ? '<a class="mk-link" href="' + esc( safeUrl( r.url ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'View robots.txt', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' ) +
			'</div>';
		if ( state.robotsError && ! r ) {
			return '<section class="mk-card">' + head + '<div class="mk-empty"><span>' + esc( state.robotsError ) + '</span><button type="button" class="mk-btn mk-btn-sm" data-act="robots-retry">' + esc( __( 'Try again', 'mykavo' ) ) + '</button></div></section>';
		}
		if ( ! r ) {
			return '<section class="mk-card">' + head + '<div class="mk-card-pad">' + loadingBlock( 90 ) + '</div></section>';
		}
		var busy = state.busy === 'robots';
		var presets = READONLY ? '' : '<div class="mk-robots-presets">' +
			'<button type="button" class="mk-btn mk-btn-sm mk-btn-dark" data-act="robots-preset"' + ( busy ? ' disabled' : '' ) + '>' + icon( 'lock' ) + esc( __( 'Block training, allow search', 'mykavo' ) ) + '</button>' +
			'<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="robots-allow-all"' + ( busy ? ' disabled' : '' ) + '>' + esc( __( 'Allow all', 'mykavo' ) ) + '</button></div>';
		var table =
			'<div class="mk-table-wrap"><table class="mk-table"><thead><tr><th>' + esc( __( 'Crawler', 'mykavo' ) ) + '</th><th>' + esc( __( 'Why it visits', 'mykavo' ) ) + '</th><th>' + esc( __( 'robots.txt', 'mykavo' ) ) + '</th></tr></thead><tbody>' +
			( r.agents || [] ).map( function ( a ) {
				return '<tr><td><b>' + esc( a.owner ) + '</b><span class="mk-cell-note"><code>' + esc( a.agent ) + '</code></span></td><td>' + esc( purposeLabel( a.purpose ) ) + '</td>' +
					'<td><span class="mk-seg" role="group" aria-label="' + esc( a.agent ) + '">' +
					'<button type="button" class="' + ( a.blocked ? '' : 'is-on' ) + '" data-act="robots-block" data-agent="' + esc( a.agent ) + '" data-block="0"' + ( busy || r.physical || READONLY ? ' disabled' : '' ) + '>' + esc( __( 'Allow', 'mykavo' ) ) + '</button>' +
					'<button type="button" class="' + ( a.blocked ? 'is-on is-block' : '' ) + '" data-act="robots-block" data-agent="' + esc( a.agent ) + '" data-block="1"' + ( busy || r.physical || READONLY ? ' disabled' : '' ) + '>' + esc( __( 'Block', 'mykavo' ) ) + '</button></span></td></tr>';
			} ).join( '' ) + '</tbody></table></div>';
		var file = '';
		if ( r.physical ) {
			var all = r.blocked.length && r.inFile && r.inFile.length === r.blocked.length;
			file =
				'<div class="mk-banner">' + icon( 'file' ) + '<span>' +
				esc( all
					? __( 'This site has its own robots.txt file, and it already names every blocked crawler.', 'mykavo' )
					: __( 'This site has its own robots.txt file on the server, so WordPress cannot add to it. Copy these rules into that file by hand:', 'mykavo' ) ) +
				'</span></div>' +
				( all || ! r.blocked.length ? '' : '<div class="mk-code"><pre>' + esc( r.rules ) + '</pre><button type="button" class="mk-btn mk-btn-sm" data-act="copy-rules">' + icon( 'copy' ) + esc( __( 'Copy rules', 'mykavo' ) ) + '</button></div>' );
		}
		var hidden = r.public ? '' : '<p class="mk-fine mk-card-pad">' + esc( __( 'This site asks search engines not to index it (Settings > Reading), so its robots.txt already asks every crawler to stay away.', 'mykavo' ) ) + '</p>';
		return '<section class="mk-card">' + head + '<div class="mk-card-pad mk-robots">' + presets + file + '</div>' + table + hidden + '</section>';
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
		var l = state.llms;
		if ( ! l ) {
			return '';
		}
		var url = safeUrl( l.url );
		return (
			'<section class="mk-card"><div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'llms.txt for AI assistants', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'A short Markdown guide at /llms.txt: your site\'s name, what it is about and its important pages. Some AI tools read it; it does not change Google search or AI Overviews.', 'mykavo' ) ) + '</p></div>' +
			( l.enabled && ! l.physical && url ? '<a class="mk-link" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'View llms.txt', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' ) + '</div>' +
			'<div class="mk-card-pad">' +
			( l.physical
				? '<div class="mk-banner">' + icon( 'file' ) + '<span>' + esc( __( 'This site already has an llms.txt file on the server, which is served instead. To use MyKavo\'s version, copy it into that file:', 'mykavo' ) ) + '</span></div>'
				: '<div class="mk-setting"><p class="mk-fine">' + esc( l.enabled ? __( 'Served now. It refreshes daily and whenever monitored pages change.', 'mykavo' ) : __( 'Off. Nothing is served at /llms.txt.', 'mykavo' ) ) + '</p>' +
					switchButton( 'toggle-llms', l.enabled, __( 'On', 'mykavo' ), __( 'Off', 'mykavo' ), state.busy === 'llms' ) + '</div>' ) +
			'<div class="mk-code"><pre>' + esc( l.text ) + '</pre>' + copyButton( l.text, __( 'Copy', 'mykavo' ) ) + '</div>' +
			( feat( 'llmsSummaries' ) ? ( l.summarized ? '<p class="mk-fine">' + esc( __( 'Page summaries written by MyKavo.', 'mykavo' ) ) + '</p>' : '' ) : '<p class="mk-fine">' + esc( lockedText( 'starter', __( 'A one-line summary of each page, written by MyKavo', 'mykavo' ) ) ) + '</p>' ) +
			'</div></section>'
		);
	}

	/** Pages that answered an AI crawler with 404, and redirects to fix them. */
	function missingCard() {
		var b = state.bots;
		var missing = ( b && b.missing ) || [];
		var redirects = ( state.redirects && state.redirects.redirects ) || [];
		if ( ! missing.length && ! redirects.length ) {
			return '';
		}
		var taken = {};
		redirects.forEach( function ( r ) {
			taken[ r.from ] = r;
		} );
		var sugg = {};
		( ( state.redirectSuggest && state.redirectSuggest.suggestions ) || [] ).forEach( function ( s ) {
			sugg[ s.path ] = s;
		} );
		var rows = missing.filter( function ( m ) {
			return ! taken[ m.path.split( '?' )[ 0 ] ];
		} ).map( function ( m ) {
			var path = m.path.split( '?' )[ 0 ];
			var s = sugg[ path ];
			var draft = state.redirectDraft[ path ] !== undefined ? state.redirectDraft[ path ] : ( s ? s.url : '' );
			return '<li class="mk-redirect-row"><div><code class="mk-path">' + esc( m.path ) + '</code><span class="mk-fine">' +
				esc( sprintf( /* translators: %d: number of visits. */ _n( '%d crawler visit got a 404', '%d crawler visits got a 404', m.hits, 'mykavo' ), m.hits ) ) + '</span></div>' +
				( READONLY ? '' : '<form class="mk-redirect-form" data-form="redirect" data-from="' + esc( path ) + '">' +
					'<label class="mk-visually-hidden" for="mk-r-' + esc( path ) + '">' + esc( __( 'Redirect to', 'mykavo' ) ) + '</label>' +
					'<input id="mk-r-' + esc( path ) + '" data-key="r-' + esc( path ) + '" data-redirect="' + esc( path ) + '" type="text" placeholder="' + esc( __( '/new-page/ or full address', 'mykavo' ) ) + '" value="' + esc( draft ) + '">' +
					'<button type="submit" class="mk-btn mk-btn-sm mk-btn-dark"' + ( state.busy === 'redirect' ? ' disabled' : '' ) + '>' + esc( __( 'Create redirect', 'mykavo' ) ) + '</button></form>' ) +
				( s && s.title ? '<span class="mk-fine">' + esc( sprintf( /* translators: %s: page title. */ __( 'MyKavo suggests: %s', 'mykavo' ), s.title ) ) + '</span>' : '' ) +
				'</li>';
		} ).join( '' );
		var suggest = READONLY || ! missing.length ? '' : feat( 'redirectSuggestions' )
			? '<button type="button" class="mk-btn mk-btn-sm mk-btn-soft" data-act="redirect-suggest"' + ( state.busy === 'suggest' ? ' disabled' : '' ) + '>' + icon( 'zap' ) + esc( __( 'Suggest targets', 'mykavo' ) ) + '</button>'
			: '<span class="mk-fine">' + esc( lockedText( 'starter', __( 'Suggested target pages', 'mykavo' ) ) ) + '</span>';
		return (
			'<section class="mk-card"><div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Errors served to AI: fix them', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Addresses AI crawlers asked for that do not exist (often an old link AI keeps quoting). A redirect sends them, and people, to the right page.', 'mykavo' ) ) + '</p></div>' + suggest + '</div>' +
			( rows ? '<ul class="mk-list">' + rows + '</ul>' : '' ) +
			( redirects.length
				? '<div class="mk-card-pad"><p class="mk-benefit-title">' + esc( __( 'Redirects', 'mykavo' ) ) + '</p><ul class="mk-plain">' + redirects.map( function ( r ) {
					return '<li><code>' + esc( r.from ) + '</code> → <code>' + esc( pathOf( r.to ) ) + '</code> <span class="mk-fine">' + esc( sprintf( _n( '%d use', '%d uses', r.hits, 'mykavo' ), r.hits ) ) + '</span>' +
						( READONLY ? '' : ' <button type="button" class="mk-link" data-act="redirect-remove" data-from="' + esc( r.from ) + '">' + esc( __( 'Remove', 'mykavo' ) ) + '</button>' ) + '</li>';
				} ).join( '' ) + '</ul></div>'
				: '' ) +
			'</section>'
		);
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

	function suggestionsCard( compact ) {
		var s = state.suggestions;
		if ( READONLY || ! s || ! s.pages.length ) {
			return '';
		}
		var o = state.overview;
		var limit = o && o.workspace.plan.limits ? o.workspace.plan.limits.pagesPerWebsite : null;
		var used = o ? o.stats.monitoredPages : 0;
		var room = limit === null || limit === undefined ? s.pages.length : Math.max( 0, limit - used );
		var picked = s.pages.filter( function ( p ) {
			return state.sugPick[ p.url ] !== false;
		} ).slice( 0, room );
		var reasons = { home: __( 'Home page', 'mykavo' ), store: __( 'Store', 'mykavo' ), contact: __( 'Contact page', 'mykavo' ), main: __( 'Main page', 'mykavo' ) };
		return (
			'<section class="mk-card"><div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( compact ? __( 'Watch your most important pages', 'mykavo' ) : __( 'Suggested pages', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( limit
				? sprintf( /* translators: 1: pages used, 2: page limit. */ __( 'Picked from this site. Your plan monitors %2$d pages per site; %1$d are in use.', 'mykavo' ), used, limit )
				: __( 'Picked from this site: the pages that would hurt most if they broke.', 'mykavo' ) ) + '</p></div></div>' +
			'<ul class="mk-plain mk-suggest">' + s.pages.map( function ( p, i ) {
				var on = state.sugPick[ p.url ] !== false && i < room;
				return '<li><label class="mk-check"><input type="checkbox" data-act="suggest-toggle" data-url="' + esc( p.url ) + '"' + ( on ? ' checked' : '' ) + ( i >= room ? ' disabled' : '' ) + '> <b>' + esc( p.title || pathOf( p.url ) ) + '</b> <code>' + esc( pathOf( p.url ) ) + '</code> <span class="mk-fine">' + esc( reasons[ p.reason ] || '' ) + '</span></label></li>';
			} ).join( '' ) + '</ul>' +
			'<div class="mk-card-foot">' +
			( room > 0
				? '<button type="button" class="mk-btn mk-btn-dark mk-btn-sm" data-act="suggest-add"' + ( ! picked.length || state.busy === 'add-pages' ? ' disabled' : '' ) + '>' + esc( sprintf( /* translators: %d: number of pages. */ _n( 'Monitor %d page', 'Monitor %d pages', picked.length, 'mykavo' ), picked.length ) ) + '</button>'
				: '<span class="mk-fine">' + esc( __( 'Your plan\'s page limit is reached.', 'mykavo' ) ) + '</span> ' + upgradeButton( __( 'Upgrade to Pro', 'mykavo' ), 'mk-btn-sm' ) ) +
			'</div></section>'
		);
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

	/* ---------------------------------------------------- your site report -- */

	function reportsView() {
		var r = state.reports;
		if ( state.reportsError && ! r ) {
			return errorBlock( state.reportsError, 'retry-reports' );
		}
		if ( ! r ) {
			return loadingBlock( 260 );
		}
		if ( ! r.allowed ) {
			return '<section class="mk-card mk-card-pad">' + upsell( lockedText( 'agency', __( 'Your site report under your own brand', 'mykavo' ) ) ) + '</section>';
		}
		var b = r.branding || {};
		var draft = state.brandDraft || { name: b.name || '', color: b.color || '#FFD400' };
		if ( r.enabled === false ) {
			return '<section class="mk-card mk-card-pad"><div class="mk-empty"><span class="mk-empty-icon">' + icon( 'file' ) + '</span><strong>' + esc( __( 'Your site report is switched off', 'mykavo' ) ) + '</strong><span>' +
				esc( __( 'Switch the report on for this website in MyKavo. It appears here straight away.', 'mykavo' ) ) + '</span>' +
				( safeUrl( r.settingsUrl ) ? '<a class="mk-btn mk-btn-dark mk-btn-sm" href="' + esc( safeUrl( r.settingsUrl ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Open in MyKavo', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' ) +
				'</div></section>';
		}
		var list = r.reports.length
			? '<ul class="mk-list">' + r.reports.map( function ( rep ) {
				var s = rep.summary || {};
				var bits = [];
				if ( s.updates !== undefined ) {
					bits.push( sprintf( _n( '%d update', '%d updates', s.updates, 'mykavo' ), s.updates ) );
				}
				if ( s.rollbacks ) {
					bits.push( sprintf( _n( '%d rollback', '%d rollbacks', s.rollbacks, 'mykavo' ), s.rollbacks ) );
				}
				if ( s.uptimePermille !== undefined ) {
					bits.push( sprintf( /* translators: %s: uptime percentage. */ __( '%s%% uptime', 'mykavo' ), ( s.uptimePermille / 10 ).toFixed( 1 ) ) );
				}
				if ( s.changesCaught !== undefined ) {
					bits.push( sprintf( _n( '%d change caught', '%d changes caught', s.changesCaught, 'mykavo' ), s.changesCaught ) );
				}
				if ( s.aiVisits !== undefined ) {
					bits.push( sprintf( _n( '%d AI crawler visit', '%d AI crawler visits', s.aiVisits, 'mykavo' ), s.aiVisits ) );
				}
				if ( s.sslDaysLeft !== undefined ) {
					bits.push( sprintf( _n( 'SSL: %d day left', 'SSL: %d days left', s.sslDaysLeft, 'mykavo' ), s.sslDaysLeft ) );
				}
				return '<li><div class="mk-row mk-report-row" style="cursor:default">' + icon( 'file', 'mk-row-chevron' ) + '<span class="mk-row-main"><span class="mk-row-title">' + esc( rep.month ) + '</span><span class="mk-row-meta">' + bits.map( function ( x ) {
					return '<span>' + esc( x ) + '</span>';
				} ).join( '' ) + '</span></span>' +
					( safeUrl( rep.url ) ? '<a class="mk-btn mk-btn-sm mk-btn-dark" href="' + esc( safeUrl( rep.url ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Open report', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' ) +
					( safeUrl( rep.pdfUrl ) ? '<a class="mk-btn mk-btn-sm mk-btn-dark" href="' + esc( safeUrl( rep.pdfUrl ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Download PDF', 'mykavo' ) ) + '</a>' : '' ) +
					'</div></li>';
			} ).join( '' ) + '</ul>'
			: '<div class="mk-empty"><span>' + esc( __( 'The first report appears at the start of next month.', 'mykavo' ) ) + '</span></div>';
		var brand = READONLY ? '' :
			'<section class="mk-card mk-card-pad"><h3 class="mk-card-title">' + esc( __( 'Your brand on the report', 'mykavo' ) ) + '</h3>' +
			'<form class="mk-brand-form" data-form="branding">' +
			( safeUrl( b.logoUrl ) ? '<img class="mk-brand-logo" src="' + esc( safeUrl( b.logoUrl ) ) + '" alt="' + esc( __( 'Report logo', 'mykavo' ) ) + '">' : '' ) +
			'<label><span>' + esc( __( 'Brand name', 'mykavo' ) ) + '</span><input name="brandName" type="text" maxlength="60" data-key="brand-name" value="' + esc( draft.name ) + '"></label>' +
			'<label><span>' + esc( __( 'Brand colour', 'mykavo' ) ) + '</span><input name="color" type="color" data-key="brand-color" value="' + esc( draft.color || '#FFD400' ) + '"></label>' +
			'<button type="submit" class="mk-btn mk-btn-dark mk-btn-sm"' + ( state.busy === 'branding' ? ' disabled' : '' ) + '>' + esc( __( 'Save', 'mykavo' ) ) + '</button></form>' +
			( safeUrl( r.brandingUrl ) ? '<p class="mk-fine">' + esc( b.logoUrl ? __( 'To change the logo, upload a new one in MyKavo.', 'mykavo' ) : __( 'Add your logo in MyKavo.', 'mykavo' ) ) + ' <a class="mk-link" href="' + esc( safeUrl( r.brandingUrl ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Agency branding', 'mykavo' ) ) + icon( 'external' ) + '</a></p>' : '' ) +
			'</section>';
		return '<div class="mk-grid"><section class="mk-card"><div class="mk-card-head"><div><h3 class="mk-card-title">' + esc( __( 'Last 30 days', 'mykavo' ) ) + '</h3>' +
			'<p class="mk-card-sub">' + esc( __( 'Updates, rollbacks, uptime, SSL, changes caught and AI crawler visits on one page, ready to share. Use Print on the report to save it as a PDF.', 'mykavo' ) ) + '</p></div></div>' + list + '</section>' + brand + '</div>';
	}

	/** Load what the 1.3.1 cards need for the current tab. */
	function loadExtras() {
		if ( state.tab === 'overview' || state.tab === 'pages' ) {
			if ( ! READONLY && ! state.suggestions ) {
				loadInto( 'suggestions', '/suggestions' );
			}
		}
		if ( state.tab === 'updates' ) {
			if ( ! READONLY && ! state.safe ) {
				loadInto( 'safe', '/safe-update' );
			}
			if ( ! state.snaps ) {
				loadInto( 'snaps', '/snapshots' );
			}
			if ( ! state.forms ) {
				loadInto( 'forms', '/forms' );
			}
		}
		if ( state.tab === 'bots' ) {
			if ( ! state.llms ) {
				loadInto( 'llms', '/llms' );
			}
			if ( ! state.redirects ) {
				loadInto( 'redirects', '/redirects' );
			}
		}
		if ( state.tab === 'reports' && ! state.reports && ! state.reportsError ) {
			loadInto( 'reports', '/reports' );
		}
	}

	/** Clicks on the 1.3.1 controls. Returns true when handled. */
	function onClickExtra( act, el ) {
		switch ( act ) {
			case 'tip':
				// Touch screens have no hover: a tap shows or hides the explanation.
				if ( tipFor === el ) {
					hideTip();
				} else {
					showTip( el );
				}
				return true;
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
					toast( res.mail.last && res.mail.last.ok ? __( 'Test email sent.', 'mykavo' ) : __( 'WordPress could not send the test email.', 'mykavo' ) );
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

	/* ----------------------------------------------------------- tooltips -- */

	/**
	 * What each feature is, in a sentence: shown from a small "i" next to the
	 * title of every card, page and AI crawler figure. Matched on the title
	 * as drawn, so every card gets its tip without its own code changing.
	 */
	function tipText() {
		return [
			[ __( 'Site overview', 'mykavo' ), __( 'Everything about this site at a glance: what changed, how fast and reliable it is, and what needs you first.', 'mykavo' ) ],
			[ __( 'Changes', 'mykavo' ), __( 'Everything MyKavo found that differs from your approved baseline: visual, SEO, content, links, scripts and speed. Approve what you meant to change, fix the rest.', 'mykavo' ) ],
			[ __( 'Safe Updates', 'mykavo' ), __( 'After every plugin, theme or WordPress update, MyKavo checks your pages and tells you whether the update broke something, and which one.', 'mykavo' ) ],
			[ __( 'AI crawlers', 'mykavo' ), __( 'Which AI systems (ChatGPT, Claude, Perplexity and others) read your site, which pages they read, and what you allow them to read.', 'mykavo' ) ],
			[ __( 'Scans', 'mykavo' ), __( 'Every time MyKavo checked your pages: when, why (scheduled, by hand or after an update) and what it found.', 'mykavo' ) ],
			[ __( 'Pages', 'mykavo' ), __( 'The pages MyKavo watches. Each has an approved baseline, and every scan is compared against it.', 'mykavo' ) ],
			[ __( 'Your plan', 'mykavo' ), __( 'What your MyKavo plan includes, and what the next plan adds.', 'mykavo' ) ],
			[ __( 'Your site report', 'mykavo' ), __( 'A one-page summary of the last 30 days to share or print: updates, uptime, SSL, changes caught and AI crawler visits.', 'mykavo' ) ],
			[ __( 'Open changes', 'mykavo' ), __( 'Changes nobody has reviewed yet, grouped by how serious they are. Critical and High need you soon.', 'mykavo' ) ],
			[ __( 'Site vitals', 'mykavo' ), __( 'Uptime, response time and SSL certificate expiry, checked by MyKavo from outside your site every few minutes. The chart marks your updates, so you can see if one slowed the site.', 'mykavo' ) ],
			[ __( 'Needs your attention', 'mykavo' ), __( 'The most important open changes, most serious first. Click one to see the before and after.', 'mykavo' ) ],
			[ __( 'Site audit', 'mykavo' ), __( 'A full crawl of your site in MyKavo that finds what quietly loses you visitors and sales: broken pages, slow loading, missing titles, security gaps and 100+ more checks, each with what it costs you and how to fix it.', 'mykavo' ) ],
			[ __( 'Recent scans', 'mykavo' ), __( 'MyKavo\'s latest checks of your pages, and how many changes each one found.', 'mykavo' ) ],
			[ __( 'Protect your store', 'mykavo' ), __( 'Whether your shop, cart, checkout and account pages are monitored, with one click to add the missing ones.', 'mykavo' ) ],
			[ __( 'Update without fear', 'mykavo' ), __( 'Switch the check after updates on or off. When on, every update is reported to MyKavo, which scans your pages and gives a verdict.', 'mykavo' ) ],
			[ __( 'Safe Update All', 'mykavo' ), __( 'Updates your plugins one at a time, checks the site still loads after each, and rolls back any update that breaks it. Can start an UpdraftPlus backup first.', 'mykavo' ) ],
			[ __( 'Roll back automatically when an update breaks something', 'mykavo' ), __( 'When MyKavo\'s check after an update finds a critical change, or the site crashes, the update is undone without anyone having to be there.', 'mykavo' ) ],
			[ __( 'Update history', 'mykavo' ), __( 'Every update, plugin switch and theme change on this site, with MyKavo\'s verdict and a rollback button.', 'mykavo' ) ],
			[ __( 'Plugin health', 'mykavo' ), __( 'Flags installed plugins that were closed on WordPress.org, have not been updated in two years, or have a known security issue.', 'mykavo' ) ],
			[ __( 'Update window', 'mykavo' ), __( 'The days and hours WordPress may run automatic updates, so they happen when someone is around to check.', 'mykavo' ) ],
			[ __( 'Saved copies for rollback', 'mykavo' ), __( 'Before each update the plugin or theme folder is zipped on this site, so it can be put back exactly as it was, premium ones too. Kept for 7 days.', 'mykavo' ) ],
			[ __( 'Email and contact forms', 'mykavo' ), __( 'Checks that this site can still send email and that its contact forms still work, so messages and leads are not silently lost.', 'mykavo' ) ],
			[ __( 'Which AI reads your site', 'mykavo' ), __( 'Counts visits from AI crawlers by the name they send. No IP addresses or visitor data are recorded, and you can switch it off.', 'mykavo' ) ],
			[ __( 'Visits per day', 'mykavo' ), __( 'AI crawler visits to this site each day over the last 30 days.', 'mykavo' ) ],
			[ __( 'Last 12 months', 'mykavo' ), __( 'A year of AI crawler visits kept by MyKavo, with the day each crawler first visited.', 'mykavo' ) ],
			[ __( 'Crawlers', 'mykavo' ), __( 'Each AI crawler that visited, why it visits, and whether its visits really came from its owner or from a fake using its name.', 'mykavo' ) ],
			[ __( 'Pages AI reads most', 'mykavo' ), __( 'The pages AI crawlers read most in the last 30 days: the pages AI is most likely to quote.', 'mykavo' ) ],
			[ __( 'Errors served to AI: fix them', 'mykavo' ), __( 'Addresses AI crawlers asked for that do not exist. Create a redirect so crawlers, and people, land on the right page.', 'mykavo' ) ],
			[ __( 'Allow or block each AI crawler', 'mykavo' ), __( 'Ask each AI crawler to stay away, or allow it, through robots.txt. Block training crawlers to keep your content out of AI training while staying visible in AI search.', 'mykavo' ) ],
			[ __( 'llms.txt for AI assistants', 'mykavo' ), __( 'A short guide to your site at /llms.txt that some AI tools read. It does not change Google search or AI Overviews.', 'mykavo' ) ],
			[ __( 'AI crawler visits', 'mykavo' ), __( 'All AI crawler visits to this site in the last 30 days.', 'mykavo' ) ],
			[ __( 'For AI answers', 'mykavo' ), __( 'Visits from crawlers that read pages to answer people in AI search, or open a page someone asked about.', 'mykavo' ) ],
			[ __( 'Crawlers seen', 'mykavo' ), __( 'How many different AI crawlers visited in the last 30 days.', 'mykavo' ) ],
			[ __( 'Errors served', 'mykavo' ), __( 'Crawler visits that got an error (4xx or 5xx). AI cannot quote a page it could not load.', 'mykavo' ) ],
			[ __( 'Ask ChatGPT and Claude', 'mykavo' ), __( 'Connect MyKavo to ChatGPT, Claude or another AI assistant and ask about your sites in plain words.', 'mykavo' ) ],
			[ __( 'What your plan includes', 'mykavo' ), __( 'Features that come from MyKavo\'s service. Nothing extra loads on your site.', 'mykavo' ) ],
			[ __( 'What Pro adds', 'mykavo' ), __( 'What upgrading to Pro unlocks. These run on MyKavo\'s servers; nothing extra loads on your site.', 'mykavo' ) ],
			[ __( 'Last 30 days', 'mykavo' ), __( 'The live report for the last 30 days. Open it to share the link, or print it as a PDF.', 'mykavo' ) ],
			[ __( 'Your brand on the report', 'mykavo' ), __( 'The name, colour and logo shown on your site report.', 'mykavo' ) ],
			[ __( 'Watch your most important pages', 'mykavo' ), __( 'Pages picked from your site that would hurt most if they broke. Add them to monitoring in one click.', 'mykavo' ) ],
			[ __( 'Suggested pages', 'mykavo' ), __( 'Pages picked from your site that would hurt most if they broke. Add them to monitoring in one click.', 'mykavo' ) ],
			[ /monitored page/i, __( 'The pages MyKavo checks on every scan. Use Watch an element to get an alert if a button or form on a page disappears.', 'mykavo' ) ],
		];
	}

	/** Add an "i" with the explanation next to every known title in a container. */
	function decorateTips( container ) {
		var list = tipText();
		if ( ! list.length ) {
			return;
		}
		var nodes = container.querySelectorAll( '.mk-card-title, .mk-safe h2, .mk-page-title, .mk-stat-label' );
		Array.prototype.forEach.call( nodes, function ( node ) {
			if ( node.querySelector( '.mk-tip' ) || node.closest( 'button, a' ) ) {
				return;
			}
			var label = node.textContent.replace( /\s+/g, ' ' ).trim();
			var tip = '';
			for ( var i = 0; i < list.length && ! tip; i++ ) {
				var key = list[ i ][ 0 ];
				if ( key instanceof RegExp ? key.test( label ) : key === label ) {
					tip = list[ i ][ 1 ];
				}
			}
			if ( ! tip ) {
				return;
			}
			var btn = document.createElement( 'button' );
			btn.type = 'button';
			btn.className = 'mk-tip';
			btn.setAttribute( 'data-act', 'tip' );
			btn.setAttribute( 'data-tip', tip );
			btn.setAttribute( 'aria-label', sprintf( /* translators: %s: feature name. */ __( 'What is %s?', 'mykavo' ), label ) );
			btn.setAttribute( 'aria-describedby', 'mk-tooltip' );
			btn.textContent = 'i';
			node.appendChild( btn );
		} );
	}

	var tipHost = document.createElement( 'div' );
	tipHost.className = 'mk mk-tooltip-host';
	tipHost.innerHTML = '<div class="mk-tooltip" id="mk-tooltip" role="tooltip" hidden></div>';
	document.body.appendChild( tipHost );
	var tipBox = tipHost.firstChild;
	var tipFor = null;

	function showTip( btn ) {
		tipFor = btn;
		tipBox.textContent = btn.getAttribute( 'data-tip' ) || '';
		tipBox.hidden = false;
		var r = btn.getBoundingClientRect();
		var w = tipBox.offsetWidth;
		var h = tipBox.offsetHeight;
		var left = Math.min( Math.max( 12, r.left + r.width / 2 - w / 2 ), window.innerWidth - w - 12 );
		var top = r.bottom + 10;
		if ( top + h > window.innerHeight - 12 ) {
			top = Math.max( 12, r.top - h - 10 );
		}
		tipBox.style.left = left + 'px';
		tipBox.style.top = top + 'px';
	}

	function hideTip() {
		tipFor = null;
		tipBox.hidden = true;
	}

	[ root ].forEach( function ( el ) {
		el.addEventListener( 'mouseover', function ( e ) {
			var btn = e.target.closest && e.target.closest( '.mk-tip' );
			if ( btn && btn !== tipFor ) {
				showTip( btn );
			}
		} );
		el.addEventListener( 'mouseout', function ( e ) {
			var btn = e.target.closest && e.target.closest( '.mk-tip' );
			if ( btn && ( ! e.relatedTarget || ! btn.contains( e.relatedTarget ) ) ) {
				hideTip();
			}
		} );
		el.addEventListener( 'focusin', function ( e ) {
			if ( e.target.classList && e.target.classList.contains( 'mk-tip' ) ) {
				showTip( e.target );
			}
		} );
		el.addEventListener( 'focusout', function ( e ) {
			if ( e.target.classList && e.target.classList.contains( 'mk-tip' ) ) {
				hideTip();
			}
		} );
	} );
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && tipFor ) {
			hideTip();
		}
	} );
	window.addEventListener( 'scroll', hideTip, { passive: true } );

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
		hideTip();
		decorateTips( root );

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
			? '<div class="mk-attrib">' + icon( 'shield' ) + '<div><b>' + esc( __( 'Appeared after an update', 'mykavo' ) ) + '</b><span>' + esc( c.foundBy.note ) + '</span></div></div>'
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
		loadBots();
		loadFeatures( false );
		loadInto( 'alerts', '/alerts' );
		loadExtras();
		if ( cfg.woo && cfg.woo.pages && cfg.woo.pages.length ) {
			loadPages();
		}
	}
}() );
