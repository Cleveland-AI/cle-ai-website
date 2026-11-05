// Where we meet: the shared marker behaviour (hover/focus/tap to open, Escape to close).
document.querySelectorAll( '.cle-map__frame' ).forEach( function ( frame ) {
	if ( window.cleHotspots ) {
		window.cleHotspots( frame );
	}
} );
