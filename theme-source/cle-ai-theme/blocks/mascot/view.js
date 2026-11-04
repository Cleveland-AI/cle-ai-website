// Dot: the peeking pose rises into view once it scrolls on screen. Poke any Dot three times
// in quick succession and he hops, with confetti.
document.querySelectorAll( '.cle-dot' ).forEach( function ( dot ) {
	if ( dot.classList.contains( 'cle-dot--peek' ) && 'IntersectionObserver' in window ) {
		dot.classList.add( 'is-waiting' );
		var io = new IntersectionObserver( function ( entries ) {
			if ( entries[ 0 ].isIntersecting ) {
				dot.classList.add( 'is-in' );
				io.disconnect();
			}
		}, { threshold: 0.6 } );
		io.observe( dot );
	}
	var pokes = [];
	dot.addEventListener( 'click', function () {
		var now = Date.now();
		pokes = pokes.filter( function ( t ) { return now - t < 1200; } ).concat( now );
		if ( pokes.length >= 3 ) {
			pokes = [];
			dot.classList.remove( 'is-hopping' );
			void dot.offsetWidth;
			dot.classList.add( 'is-hopping' );
			if ( window.cleConfetti ) {
				window.cleConfetti( dot );
			}
		}
	} );
} );
