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
		changesScan: null,
		addUrl: '',
		banner: bannerFromNotice( cfg.notice ),
		menuOpen: false,
		busy: '',
		drawer: null,
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
		mark: '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M5.4 3.3h8.5c1.7 0 .7 1.15.7 1.15L3.8 15.45c-.55.55-.55 1.1 0 1.1l10.8 11c1 1.15-.7 1.15-.7 1.15H5.4c-2.2 0-2.2-2.2-2.2-2.2v-21c0-2.2 2.2-2.2 2.2-2.2z"/><path d="M10.35 16 19.45 3.4 15.85 12l7.85-3.8-7.15 6.3 12.55 1.5-12.55 1.5 7.15 6.3-7.85-3.8 3.6 8.6z"/></svg>',
		check: '<path d="M20 6 9 17l-5-5"/>',
		alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
		eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
		refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
		external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
		chevron: '<path d="m9 18 6-6-6-6"/>',
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
		wp: '<circle cx="12" cy="12" r="10"/><path d="M3.5 8.5 8 20l3-8.5"/><path d="M9 8.5h5"/><path d="M11.5 8.5 16 20l4.5-11.5"/>',
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
					} else if ( state.tab !== 'overview' ) {
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
		if ( state.tab === 'changes' && ! state.changes ) {
			loadChanges();
		} else if ( state.tab === 'scans' && ! state.scans ) {
			loadScans();
		} else if ( state.tab === 'pages' && ! state.pages ) {
			loadPages();
		} else if ( state.tab === 'updates' ) {
			if ( ! state.updates ) {
				loadUpdates();
			}
			if ( ! state.scans ) {
				loadScans();
			}
		}
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
				if ( state.tab === 'changes' ) {
					loadChanges();
				}
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
			'<a class="mk-btn mk-btn-primary" href="' + esc( cfg.connectUrl ) + '">' + icon( 'link' ) + esc( __( 'Connect to MyKavo', 'mykavo' ) ) + '</a>' +
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
		var site = o ? o.website : cfg.website || {};
		var dot = 'mk-dot';
		if ( o ) {
			dot += o.health && o.health.status === 'down' ? ' mk-dot-bad' : o.stats.bySeverity.CRITICAL + o.stats.bySeverity.HIGH > 0 ? ' mk-dot-warn' : ' mk-dot-good';
		}
		var dashboard = o && o.links ? safeUrl( o.links.website ) : '';
		return (
			'<div class="mk-top">' +
			brand() +
			'<span class="mk-site"><span class="' + dot + '"></span><b>' + esc( site.name || '' ) + '</b><span>' + esc( hostOf( site.url ) ) + '</span></span>' +
			'<div class="mk-top-actions">' +
			( dashboard ? '<a class="mk-btn mk-btn-quiet mk-btn-sm" href="' + esc( dashboard ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Open in MyKavo', 'mykavo' ) ) + icon( 'external' ) + '</a>' : '' ) +
			'<div class="mk-menu">' +
			'<button type="button" class="mk-btn mk-btn-sm" data-act="menu" aria-haspopup="true" aria-expanded="' + ( state.menuOpen ? 'true' : 'false' ) + '" aria-label="' + esc( __( 'More', 'mykavo' ) ) + '">' + icon( 'more' ) + '</button>' +
			( state.menuOpen ? menu() : '' ) +
			'</div></div></div>'
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
			[ 'scans', __( 'Scans', 'mykavo' ), '' ],
			[ 'pages', __( 'Pages', 'mykavo' ), '' ],
		];
		return (
			'<div class="mk-tabs" role="tablist" aria-label="' + esc( __( 'MyKavo sections', 'mykavo' ) ) + '">' +
			list.map( function ( t ) {
				var selected = state.tab === t[ 0 ];
				return '<button type="button" role="tab" class="mk-tab" data-act="tab" data-tab="' + t[ 0 ] + '" data-key="tab-' + t[ 0 ] + '" aria-selected="' + selected + '" tabindex="' + ( selected ? '0' : '-1' ) + '">' + esc( t[ 1 ] ) + t[ 2 ] + '</button>';
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

		var cap = o.capabilities || {};
		var busy = state.busy === 'scan';
		var disabled = busy || ! cap.canRunManualScan;
		var first = ! scan && urgent > 0 && o.topChanges && o.topChanges[ 0 ];
		var reviewBtn = first
			? '<button type="button" class="mk-btn mk-btn-primary" data-act="open-change" data-id="' + esc( first.id ) + '">' + esc( __( 'Review now', 'mykavo' ) ) + icon( 'chevron' ) + '</button>'
			: '';
		var scanBtn =
			'<button type="button" class="mk-btn' + ( reviewBtn ? '' : ' mk-btn-dark' ) + '" data-act="scan"' + ( disabled ? ' disabled' : '' ) +
			( cap.manualScanBlockedReason ? ' title="' + esc( cap.manualScanBlockedReason ) + '"' : '' ) + '>' +
			icon( busy ? 'loader' : 'refresh', busy ? 'mk-spin' : '' ) + esc( __( 'Run scan', 'mykavo' ) ) + '</button>';

		var meta = [];
		if ( o.website.lastScanAt ) {
			meta.push( sprintf( /* translators: %s: relative time. */ __( 'Last scan %s', 'mykavo' ), rel( o.website.lastScanAt ) ) );
		}
		if ( o.website.nextScanAt && o.website.status !== 'PAUSED' ) {
			meta.push( sprintf( /* translators: %s: relative time. */ __( 'Next scan %s', 'mykavo' ), rel( o.website.nextScanAt ) ) );
		}
		if ( o.website.status === 'PAUSED' ) {
			meta.push( __( 'Monitoring paused', 'mykavo' ) );
		}

		return (
			'<section class="mk-card mk-hero mk-tone-' + tone + '" aria-live="polite">' +
			'<div class="mk-hero-main"><span class="mk-hero-icon">' + icon( ic, ic === 'loader' ? 'mk-spin' : '' ) + '</span>' +
			'<div style="min-width:0;flex:1"><p class="mk-eyebrow">' + esc( eyebrow ) + '</p><h2>' + esc( title ) + '</h2>' +
			( sub ? '<p class="mk-hero-sub">' + esc( sub ) + '</p>' : '' ) + extra + '</div></div>' +
			'<div class="mk-hero-side"><div class="mk-hero-actions">' + reviewBtn + scanBtn + '</div>' +
			( ! disabled || ! cap.manualScanBlockedReason ? '' : '<span class="mk-hero-meta">' + esc( cap.manualScanBlockedReason ) + '</span>' ) +
			( meta.length ? '<span class="mk-hero-meta">' + esc( meta.join( ' · ' ) ) + '</span>' : '' ) +
			'</div></section>'
		);
	}

	function stat( ic, label, value, unit, foot ) {
		return (
			'<div class="mk-card mk-stat"><p class="mk-stat-label">' + icon( ic ) + esc( label ) + '</p>' +
			'<p class="mk-stat-value">' + esc( value ) + ( unit ? '<small>' + esc( unit ) + '</small>' : '' ) + '</p>' +
			( foot ? '<p class="mk-stat-foot">' + esc( foot ) + '</p>' : '' ) + '</div>'
		);
	}

	function stats( o ) {
		var h = o.health || {};
		var pct = function ( v ) {
			return typeof v === 'number' ? ( Math.round( v * 10 ) / 10 ).toString() : '-';
		};
		return (
			'<div class="mk-stats">' +
			stat( 'activity', __( 'Uptime, 24 hours', 'mykavo' ), pct( h.uptime24h ), typeof h.uptime24h === 'number' ? '%' : '', typeof h.uptime7d === 'number' ? sprintf( /* translators: %s: percentage. */ __( '%s%% over 7 days', 'mykavo' ), pct( h.uptime7d ) ) : __( 'First check within minutes', 'mykavo' ) ) +
			stat( 'gauge', __( 'Response time', 'mykavo' ), typeof h.avgResponseMs24h === 'number' ? Math.round( h.avgResponseMs24h ) : '-', typeof h.avgResponseMs24h === 'number' ? 'ms' : '', __( 'Average, 24 hours', 'mykavo' ) ) +
			stat( 'lock', __( 'SSL certificate', 'mykavo' ), typeof h.sslDaysLeft === 'number' ? h.sslDaysLeft : '-', typeof h.sslDaysLeft === 'number' ? __( 'days left', 'mykavo' ) : '', h.sslValidTo ? sprintf( /* translators: %s: date. */ __( 'Valid to %s', 'mykavo' ), new Date( h.sslValidTo ).toLocaleDateString( locale ) ) : '' ) +
			stat( 'layers', __( 'Pages monitored', 'mykavo' ), o.stats.monitoredPages, '', sprintf( /* translators: %d: number of pages with a baseline. */ _n( '%d with a baseline', '%d with a baseline', o.stats.baselinedPages, 'mykavo' ), o.stats.baselinedPages ) ) +
			'</div>'
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
			return '<div class="mk-grid">' + loadingBlock( 150 ) + loadingBlock( 96 ) + loadingBlock( 260 ) + '</div>';
		}
		var by = o.stats.bySeverity;
		var top = o.topChanges || [];

		var attention =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Needs attention', 'mykavo' ) ) + '</h3>' +
			( o.stats.openChanges > 0 ? '<button type="button" class="mk-link" style="border:0;background:none;cursor:pointer" data-act="tab" data-tab="changes">' + esc( sprintf( /* translators: %d: number of open changes. */ __( 'All %d open changes', 'mykavo' ), o.stats.openChanges ) ) + icon( 'chevron' ) + '</button>' : '' ) +
			'</div>' +
			( top.length
				? '<ul class="mk-list">' + top.map( changeRow ).join( '' ) + '</ul>'
				: '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'check' ) + '</span><strong>' + esc( __( 'Nothing needs attention', 'mykavo' ) ) + '</strong><span>' + esc( __( 'When a scan finds an important change, it shows up here first.', 'mykavo' ) ) + '</span></div>' ) +
			'</section>';

		var breakdown =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Open changes by severity', 'mykavo' ) ) + '</h3></div>' +
			'<div class="mk-breakdown">' +
			SEVERITIES.map( function ( s ) {
				return '<div class="mk-breakdown-item' + ( by[ s ] ? '' : ' is-zero' ) + '">' + sevPill( s ) + '<b>' + esc( by[ s ] ) + '</b></div>';
			} ).join( '' ) +
			'</div></section>';

		var scans = o.recentScans || [];
		var recent =
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Recent scans', 'mykavo' ) ) + '</h3>' +
			'<button type="button" class="mk-link" style="border:0;background:none;cursor:pointer" data-act="tab" data-tab="scans">' + esc( __( 'History', 'mykavo' ) ) + icon( 'chevron' ) + '</button></div>' +
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

		var plan =
			'<section class="mk-card mk-card-pad"><p class="mk-eyebrow">' + esc( __( 'Workspace', 'mykavo' ) ) + '</p>' +
			'<p style="font-weight:650;font-size:15px">' + esc( o.workspace.name ) + '</p>' +
			'<p class="mk-stat-foot">' + esc( sprintf( /* translators: %s: plan name. */ __( '%s plan', 'mykavo' ), o.workspace.plan.name ) ) + '</p>' +
			( o.workspace.plan.id === 'free'
				? '<p style="margin-top:12px"><a class="mk-btn mk-btn-primary mk-btn-sm" href="' + esc( safeUrl( o.links.billing ) ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'Daily scans with Pro', 'mykavo' ) ) + icon( 'external' ) + '</a></p>'
				: '' ) +
			'</section>';

		return (
			'<div class="mk-grid">' +
			hero( o ) +
			stats( o ) +
			'<div class="mk-grid mk-grid-main"><div class="mk-grid">' + attention + breakdown + '</div><div class="mk-grid">' + storeCard() + safeUpdatesCard() + recent + plan + '</div></div>' +
			'</div>'
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
			return '<section class="mk-card">' + head + adder + '<div class="mk-empty"><span>' + esc( __( 'No pages are monitored yet.', 'mykavo' ) ) + '</span></div></section>';
		}
		return (
			'<section class="mk-card">' + head + adder + '<ul class="mk-list">' +
			state.pages.pages.map( function ( p ) {
				var url = safeUrl( p.url );
				return (
					'<li><a class="mk-row" href="' + esc( url ) + '" target="_blank" rel="noopener noreferrer">' +
					icon( 'file', 'mk-row-chevron' ) +
					'<span class="mk-row-main"><span class="mk-row-title">' + esc( p.name || pathOf( p.url ) ) + '</span>' +
					'<span class="mk-row-meta"><code>' + esc( pathOf( p.url ) ) + '</code>' +
					( p.baselineVersion ? '<span>' + esc( sprintf( /* translators: %d: baseline version. */ __( 'Baseline v%d', 'mykavo' ), p.baselineVersion ) ) + '</span>' : '<span>' + esc( __( 'No baseline yet', 'mykavo' ) ) + '</span>' ) +
					( p.enabled ? '' : '<span class="mk-status">' + esc( __( 'Paused', 'mykavo' ) ) + '</span>' ) +
					'</span></span>' +
					( p.openChanges ? '<span class="mk-sev mk-sev-MEDIUM">' + esc( sprintf( _n( '%d open', '%d open', p.openChanges, 'mykavo' ), p.openChanges ) ) + '</span>' : '' ) +
					icon( 'external', 'mk-row-chevron' ) +
					'</a></li>'
				);
			} ).join( '' ) +
			'</ul></section>'
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
		var label = first.from && first.to ? name + ' ' + first.from + ' → ' + first.to : name + ( first.to ? ' ' + first.to : '' );
		return items.length > 1
			? sprintf( /* translators: 1: first update, 2: number of other updates. */ __( '%1$s and %2$d more', 'mykavo' ), label, items.length - 1 )
			: label;
	}

	/** What happened after an update, in words and a tone. */
	function verdict( entry, scans ) {
		var reason = String( entry.reason || '' ).toUpperCase();
		if ( reason === 'OFF' ) {
			return { tone: 'quiet', text: __( 'Not checked - update checks were off', 'mykavo' ) };
		}
		if ( reason === 'PLAN' ) {
			return { tone: 'quiet', text: __( 'Not checked - automatic update checks come with Pro', 'mykavo' ), upgrade: true };
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
			text: sprintf( _n( '%d change found after this update', '%d changes found after this update', scan.changesDetected, 'mykavo' ), scan.changesDetected ),
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
		return (
			'<li class="mk-update">' +
			'<span class="mk-update-icon">' + icon( itemIcon( items[ 0 ] && items[ 0 ].type ) ) + '</span>' +
			'<div class="mk-update-main">' +
			'<p class="mk-update-title">' + esc( updateTitle( entry ) ) + '</p>' +
			'<p class="mk-row-meta"><span title="' + esc( when( new Date( entry.at * 1000 ).toISOString() ) ) + '">' + esc( rel( new Date( entry.at * 1000 ).toISOString() ) ) + '</span>' +
			'<span class="mk-status">' + esc( entry.trigger === 'auto' ? __( 'Automatic', 'mykavo' ) : __( 'By an admin', 'mykavo' ) ) + '</span></p>' +
			verdictBadge( v ) +
			( ! compact && items.length > 1
				? '<ul class="mk-update-items">' + items.map( function ( it ) {
					var name = it.type === 'core' ? 'WordPress' : it.name;
					return '<li>' + icon( itemIcon( it.type ) ) + '<span>' + esc( name ) + '</span><code>' + esc( it.from && it.to ? it.from + ' → ' + it.to : it.to || '' ) + '</code></li>';
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
			'<p>' + esc( __( 'Every time WordPress updates a plugin, theme or itself - including automatic updates overnight - MyKavo checks your pages against the approved baseline and tells you whether anything broke, and which update did it.', 'mykavo' ) ) + '</p>' +
			'</div></div>' +
			'<button type="button" class="mk-switch" role="switch" aria-checked="' + on + '" data-act="toggle-updates" data-key="toggle-updates">' +
			'<span class="mk-switch-track"><span class="mk-switch-thumb"></span></span>' +
			'<span>' + esc( on ? __( 'Checks on', 'mykavo' ) : __( 'Checks off', 'mykavo' ) ) + '</span></button>' +
			'</section>';

		var plan = planOk
			? ''
			: '<div class="mk-banner">' + icon( 'zap' ) + '<span>' + esc( __( 'Updates are listed here on every plan. Checking the site automatically after each one comes with Pro and Agency.', 'mykavo' ) ) + '</span>' +
				( billing ? '<a class="mk-btn mk-btn-primary mk-btn-sm" href="' + esc( billing ) + '" target="_blank" rel="noopener noreferrer">' + esc( __( 'See plans', 'mykavo' ) ) + '</a>' : '' ) + '</div>';

		var list = log.length
			? '<ul class="mk-list mk-updates">' + log.map( function ( e ) {
				return updateEntry( e, scans, false );
			} ).join( '' ) + '</ul>'
			: '<div class="mk-empty"><span class="mk-empty-icon">' + icon( 'shield' ) + '</span><strong>' + esc( __( 'No updates yet', 'mykavo' ) ) + '</strong><span>' +
				esc( __( 'The next time a plugin, theme or WordPress updates, it appears here with a verdict.', 'mykavo' ) ) + '</span></div>';

		return (
			'<div class="mk-grid">' + intro + plan +
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + esc( __( 'Update history', 'mykavo' ) ) + '</h3>' +
			'<span class="mk-fine">' + esc( __( 'Kept on this site. Last 30 updates.', 'mykavo' ) ) + '</span></div>' + list + '</section></div>'
		);
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
			'</section>'
		);
	}

	function safeUpdatesCard() {
		var latest = state.updates && state.updates.log && state.updates.log[ 0 ];
		var body = latest
			? '<ul class="mk-list mk-updates">' + updateEntry( latest, scansById(), true ) + '</ul>'
			: '<div class="mk-card-pad" style="padding-top:14px"><p class="mk-stat-foot" style="font-size:13px">' +
				esc( state.updates && ! state.updates.enabled
					? __( 'Update checks are off.', 'mykavo' )
					: __( 'The next time WordPress updates a plugin, theme or itself, MyKavo checks nothing broke.', 'mykavo' ) ) +
				'</p></div>';
		return (
			'<section class="mk-card"><div class="mk-card-head"><h3 class="mk-card-title">' + icon( 'shield', 'mk-title-icon' ) + esc( __( 'Safe Updates', 'mykavo' ) ) + '</h3>' +
			'<button type="button" class="mk-link" style="border:0;background:none;cursor:pointer" data-act="tab" data-tab="updates">' + esc( latest ? __( 'History', 'mykavo' ) : __( 'How it works', 'mykavo' ) ) + icon( 'chevron' ) + '</button></div>' +
			body + '</section>'
		);
	}

	function render() {
		var focusKey = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute( 'data-key' ) : null;

		if ( ! state.connected ) {
			root.innerHTML = welcome();
			return;
		}

		var view = state.tab === 'changes'
			? changesView()
			: state.tab === 'updates'
				? updatesView()
				: state.tab === 'scans'
					? scansView()
					: state.tab === 'pages'
						? pagesView()
						: overviewView();
		root.innerHTML = header() + banner() + tabs() + '<div role="tabpanel">' + view + '</div>' + footer();

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
		switch ( act ) {
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
	} );
	root.addEventListener( 'submit', function ( e ) {
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
		if ( cfg.woo && cfg.woo.pages && cfg.woo.pages.length ) {
			loadPages();
		}
	}
}() );
