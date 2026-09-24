/**
 * MyKavo for Shopify - starts the embedded screen.
 *
 * 1. Asks mykavo.app who this store is (/api/shopify/session), with the
 *    App Bridge session token. That also completes the install the first
 *    time the app opens.
 * 2. Provides the two small WordPress APIs the shared screen (app.js, built
 *    from the WordPress plugin) expects: wp.i18n and wp.apiFetch. apiFetch
 *    maps the plugin's REST routes onto mykavo.app's site API.
 * 3. Loads app.js.
 */
( function () {
	'use strict';

	var root = document.getElementById( 'mykavo-app' );
	var bridge = window.shopify;

	// Opened outside the Shopify admin (a bookmark, a shared link): go to the
	// app inside the store's admin, where it belongs.
	var adminUrl = root && root.getAttribute( 'data-admin-url' );
	if ( window.top === window.self && adminUrl && /^https:\/\/admin\.shopify\.com\//.test( adminUrl ) ) {
		window.location.replace( adminUrl );
		return;
	}
	// Read now: document.currentScript is only set while this file runs.
	var self = document.currentScript;
	var version = ( self && /[?&]v=([^&]+)/.exec( self.src ) || [] )[ 1 ] || '1';

	/* --------------------------------------------------------------- i18n -- */

	function sprintf( format ) {
		var args = arguments;
		var next = 1;
		return String( format ).replace( /%(\d+\$)?([sd%])/g, function ( match, position, type ) {
			if ( type === '%' ) {
				return '%';
			}
			var value = position ? args[ parseInt( position, 10 ) ] : args[ next++ ];
			return type === 'd' ? String( parseInt( value, 10 ) || 0 ) : String( value );
		} );
	}

	window.wp = window.wp || {};
	window.wp.i18n = {
		__: function ( text ) {
			return text;
		},
		_n: function ( single, plural, count ) {
			return count === 1 ? single : plural;
		},
		sprintf: sprintf,
	};

	/* ---------------------------------------------------------------- api -- */

	function sessionToken() {
		if ( ! bridge || typeof bridge.idToken !== 'function' ) {
			return Promise.reject( new Error( 'Open MyKavo from your Shopify admin.' ) );
		}
		return bridge.idToken();
	}

	function request( url, method, body ) {
		return sessionToken().then( function ( token ) {
			return fetch( url, {
				method: method || 'GET',
				headers: {
					Authorization: 'Bearer ' + token,
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: body === undefined ? undefined : JSON.stringify( body ),
			} );
		} ).then( function ( res ) {
			return res.json().catch( function () {
				return {};
			} ).then( function ( data ) {
				if ( res.ok ) {
					return data;
				}
				var err = new Error( data.error || 'Something went wrong. Try again in a moment.' );
				// The shared screen treats this code as "not connected any more".
				err.code = res.status === 401 ? 'mykavo_not_connected' : data.code || 'mykavo_error';
				err.status = res.status;
				throw err;
			} );
		} );
	}

	/** The plugin's /wp-json/mykavo/v1 routes, mapped onto mykavo.app. */
	function route( path, method, data ) {
		var m;
		if ( /^\/overview(\?|$)/.test( path ) ) {
			return [ '/api/wp/v1/site', 'GET' ];
		}
		if ( /^\/scans(\?|$)/.test( path ) ) {
			return [ '/api/wp/v1/scans', method ];
		}
		if ( path === '/pages' ) {
			return method === 'POST'
				? [ '/api/wp/v1/pages', 'POST', { pages: ( data && data.urls || [] ).map( function ( url ) {
					return { url: url };
				} ) } ]
				: [ '/api/wp/v1/pages', 'GET' ];
		}
		if ( path === '/updates' ) {
			return [ '/api/shopify/updates', method, data ];
		}
		if ( path === '/disconnect' ) {
			return [ '/api/wp/v1/disconnect', 'POST' ];
		}
		if ( ( m = /^\/changes\/([\w-]+)\/action$/.exec( path ) ) ) {
			return [ '/api/wp/v1/changes/' + m[ 1 ], 'PATCH', { action: data && data.action } ];
		}
		if ( ( m = /^\/changes\/([\w-]+)\/baseline$/.exec( path ) ) ) {
			return [ '/api/wp/v1/changes/' + m[ 1 ] + '/baseline', 'POST', {} ];
		}
		if ( /^\/changes(\/[\w-]+)?(\?|$)/.test( path ) ) {
			return [ '/api/wp/v1' + path, 'GET' ];
		}
		return null;
	}

	window.wp.apiFetch = function ( options ) {
		var path = String( options.path || '' ).replace( /^\/mykavo\/v1/, '' );
		var target = route( path, ( options.method || 'GET' ).toUpperCase(), options.data );
		if ( ! target ) {
			return Promise.reject( new Error( 'Unknown request: ' + path ) );
		}
		return request( target[ 0 ], target[ 1 ], target[ 2 ] ).then( function ( data ) {
			// Shopify App Store apps must not send merchants to pay elsewhere
			// from inside the app, so the screen never gets the billing link.
			if ( data && data.links ) {
				delete data.links.billing;
			}
			return data;
		} );
	};

	/* -------------------------------------------------------------- start -- */

	function showError( message ) {
		root.innerHTML = '';
		var box = document.createElement( 'div' );
		box.className = 'mk-boot-error';
		var text = document.createElement( 'p' );
		text.textContent = message;
		var again = document.createElement( 'button' );
		again.type = 'button';
		again.textContent = 'Try again';
		again.addEventListener( 'click', function () {
			window.location.reload();
		} );
		box.appendChild( text );
		box.appendChild( again );
		root.appendChild( box );
	}

	/**
	 * After the merchant opens the consent page in a new tab, check every few
	 * seconds (and whenever they come back to this tab) until the store is
	 * linked, then reload into the connected screen.
	 */
	var watching = false;
	function watchLink() {
		if ( watching ) {
			return;
		}
		watching = true;
		var tries = 0;
		function check() {
			request( '/api/shopify/session', 'POST' ).then( function ( data ) {
				if ( data.linked ) {
					window.location.reload();
				} else if ( ++tries < 200 ) {
					window.setTimeout( check, 4000 );
				}
			} ).catch( function () {
				window.setTimeout( check, 8000 );
			} );
		}
		window.setTimeout( check, 4000 );
	}
	document.addEventListener( 'click', function ( e ) {
		if ( e.target.closest && e.target.closest( '.mk-connect' ) ) {
			watchLink();
		}
	} );

	request( '/api/shopify/session', 'POST' ).then( function ( data ) {
		window.mykavoConfig = {
			connected: !! data.linked,
			connectUrl: data.linkUrl || '#',
			site: { name: data.name || '', url: ( data.primaryDomain || '' ) + '/' },
			website: data.website,
			woo: { active: true, pages: data.storePages || [] },
			pagesUrl: null,
			notice: null,
			version: '',
		};
		var script = document.createElement( 'script' );
		script.src = '/shopify-app/app.js?v=' + version;
		document.body.appendChild( script );
	} ).catch( function ( err ) {
		showError( err && err.message ? err.message : 'MyKavo could not start. Reload the app to try again.' );
	} );
}() );
