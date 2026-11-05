// The moment nearest the middle of the screen is the one on show: data-on on the section picks
// the pinned picture, the progress dot and the step that is fully opaque.
document.querySelectorAll( '.wp-block-cle-first-night' ).forEach( function ( root ) {
	var steps = Array.prototype.slice.call( root.querySelectorAll( '.cle-night__step' ) );
	if ( ! steps.length || ! ( 'IntersectionObserver' in window ) ) {
		return;
	}
	var on = 0;
	function pick() {
		var mid = window.innerHeight / 2, best = 0, dist = Infinity;
		steps.forEach( function ( s, k ) {
			var r = s.getBoundingClientRect(), c = r.top + r.height / 2, d = Math.abs( c - mid );
			if ( d < dist ) {
				dist = d;
				best = k;
			}
		} );
		if ( best !== on ) {
			on = best;
			root.dataset.on = String( on );
		}
	}
	var watching = false;
	var io = new IntersectionObserver( function ( entries ) {
		watching = entries.some( function ( e ) { return e.isIntersecting; } ) || steps.some( function ( s ) {
			var r = s.getBoundingClientRect();
			return r.bottom > 0 && r.top < window.innerHeight;
		} );
		pick();
	} );
	steps.forEach( function ( s ) { io.observe( s ); } );
	window.addEventListener( 'scroll', function () {
		if ( watching ) {
			requestAnimationFrame( pick );
		}
	}, { passive: true } );
	window.addEventListener( 'resize', pick );
	pick();
} );
