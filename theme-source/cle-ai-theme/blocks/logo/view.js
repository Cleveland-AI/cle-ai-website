// The logo's dots lean towards a nearby mouse pointer, smaller dots further, like clay on
// springs. It also remembers the drop-in has played so later pages start still.
( function () {
	try {
		sessionStorage.setItem( 'cle-logo-seen', '1' );
	} catch ( e ) {}

	if ( ! window.matchMedia( '(pointer: fine) and (prefers-reduced-motion: no-preference)' ).matches ) {
		return;
	}
	var marks = Array.prototype.slice.call( document.querySelectorAll( '.cle-logo__mark' ) );
	var REACH = 220; // px from the logo's centre where the lean starts
	var pending = null;

	function lean() {
		var e = pending;
		pending = null;
		marks.forEach( function ( mark ) {
			var r = mark.getBoundingClientRect();
			var dx = e.clientX - ( r.left + r.width / 2 ), dy = e.clientY - ( r.top + r.height / 2 );
			var d = Math.hypot( dx, dy ), pull = Math.max( 0, 1 - d / REACH );
			mark.querySelectorAll( '.cle-logo__dot' ).forEach( function ( dot ) {
				var k = pull * ( 0.9 * r.width ) / ( dot.offsetWidth + 6 ); // small dots move more
				dot.style.setProperty( '--dx', ( d ? dx / d * k * 3 : 0 ).toFixed( 2 ) + 'px' );
				dot.style.setProperty( '--dy', ( d ? dy / d * k * 3 : 0 ).toFixed( 2 ) + 'px' );
			} );
		} );
	}

	document.addEventListener( 'pointermove', function ( e ) {
		if ( ! pending ) {
			requestAnimationFrame( lean );
		}
		pending = e;
	}, { passive: true } );
	document.addEventListener( 'pointerleave', function () {
		marks.forEach( function ( mark ) {
			mark.querySelectorAll( '.cle-logo__dot' ).forEach( function ( dot ) {
				dot.style.removeProperty( '--dx' );
				dot.style.removeProperty( '--dy' );
			} );
		} );
	} );
} )();
