// Story beads: one story open at a time; arrow keys walk the cord.
document.querySelectorAll( '.cle-beads' ).forEach( function ( root ) {
	var beads = Array.prototype.slice.call( root.querySelectorAll( '.cle-beads__bead' ) );
	function open( bead, focus ) {
		beads.forEach( function ( b ) {
			var on = b === bead;
			b.setAttribute( 'aria-expanded', on ? 'true' : 'false' );
			document.getElementById( b.getAttribute( 'aria-controls' ) ).hidden = ! on;
		} );
		if ( focus ) {
			bead.focus();
		}
		bead.scrollIntoView( { block: 'nearest', inline: 'center', behavior: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth' } );
	}
	beads.forEach( function ( b, i ) {
		var story = document.getElementById( b.getAttribute( 'aria-controls' ) );
		story.hidden = 'true' !== b.getAttribute( 'aria-expanded' );
		story.removeAttribute( 'data-closed' );
		b.addEventListener( 'click', function () { open( b, false ); } );
		b.addEventListener( 'keydown', function ( e ) {
			var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ e.key ];
			if ( d && beads[ i + d ] ) {
				e.preventDefault();
				open( beads[ i + d ], true );
			}
		} );
	} );
	root.classList.add( 'is-ready' );
} );
