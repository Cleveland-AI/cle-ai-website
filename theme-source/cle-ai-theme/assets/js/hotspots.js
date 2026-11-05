/**
 * Marker/popover behaviour shared by cle/hotspot-scene and cle/story.
 * Hover or focus opens a marker's popover; click toggles it. One open at a time.
 * Escape closes and returns focus to the last marker; arrow keys move between markers.
 *
 * @param {Element} root                     Element containing the .cle-scene__pin buttons.
 * @param {Object}  [opts]
 * @param {boolean} [opts.closeOnLeave=true] Close everything when the pointer leaves root.
 * @return {{closeAll: Function}} Controls for the caller.
 */
window.cleHotspots = function ( root, opts ) {
	var pins = Array.prototype.slice.call( root.querySelectorAll( '.cle-scene__pin' ) );
	var closeOnLeave = ! opts || false !== opts.closeOnLeave;
	var last = null;
	var openedAt = 0;
	var quietFocus = false;

	function popFor( pin ) {
		return document.getElementById( pin.getAttribute( 'aria-controls' ) );
	}

	function isOpen( pin ) {
		return 'true' === pin.getAttribute( 'aria-expanded' );
	}

	function closeAll() {
		pins.forEach( function ( pin ) {
			pin.setAttribute( 'aria-expanded', 'false' );
			popFor( pin ).hidden = true;
		} );
	}

	function open( pin ) {
		if ( ! isOpen( pin ) ) {
			closeAll();
			pin.setAttribute( 'aria-expanded', 'true' );
			popFor( pin ).hidden = false;
			openedAt = Date.now();
		}
		last = pin;
	}

	if ( ! pins.length ) {
		return { closeAll: closeAll };
	}

	pins.forEach( function ( pin, i ) {
		pin.addEventListener( 'mouseenter', function () { open( pin ); } );
		pin.addEventListener( 'focus', function () {
			if ( ! quietFocus ) {
				open( pin );
			}
		} );
		// A click that immediately follows the hover/focus that opened it keeps it open.
		pin.addEventListener( 'click', function () {
			if ( isOpen( pin ) ) {
				if ( Date.now() - openedAt > 400 ) {
					closeAll();
				}
			} else {
				open( pin );
			}
		} );
		pin.addEventListener( 'keydown', function ( e ) {
			var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ e.key ];
			if ( step ) {
				e.preventDefault();
				pins[ ( i + step + pins.length ) % pins.length ].focus();
			}
		} );
	} );

	if ( closeOnLeave ) {
		root.addEventListener( 'mouseleave', closeAll );
	}

	document.addEventListener( 'keydown', function ( e ) {
		if ( 'Escape' === e.key ) {
			if ( last ) {
				if ( pins.some( isOpen ) ) {
					closeAll();
					quietFocus = true;
					last.focus();
					quietFocus = false;
				}
			}
		}
	} );

	document.addEventListener( 'click', function ( e ) {
		if ( ! root.contains( e.target ) ) {
			closeAll();
		}
	} );

	return { closeAll: closeAll };
};
