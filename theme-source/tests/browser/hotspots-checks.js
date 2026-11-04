// Paste into the browser pane's JS console on a page with a hotspot scene.
// Expected: over is [], and the states read ".....", "O....", ".....", "..O..", ".....", ".....", arrow true.
( async () => {
	const frame = document.querySelector( '.cle-hotspots' );
	const pins = [ ...frame.querySelectorAll( '.cle-scene__pin' ) ];
	const fr = frame.getBoundingClientRect();
	const st = () => pins.map( ( p ) => ( 'true' === p.getAttribute( 'aria-expanded' ) ? 'O' : '.' ) ).join( '' );
	const over = [];
	pins.forEach( ( p, i ) => {
		p.dispatchEvent( new MouseEvent( 'mouseenter' ) );
		const r = document.getElementById( p.getAttribute( 'aria-controls' ) ).getBoundingClientRect();
		if ( r.left < fr.left - 0.5 || r.right > fr.right + 0.5 ) over.push( i + 1 );
	} );
	const out = { over };
	frame.dispatchEvent( new MouseEvent( 'mouseleave' ) ); out.leave = st();
	pins[ 0 ].click(); out.click = st();
	await new Promise( ( z ) => setTimeout( z, 450 ) ); pins[ 0 ].click(); out.clickAgain = st();
	pins[ 2 ].dispatchEvent( new FocusEvent( 'focus' ) ); out.focus = st();
	document.dispatchEvent( new KeyboardEvent( 'keydown', { key: 'Escape' } ) ); out.escape = st();
	pins[ 1 ].click(); document.body.click(); out.outside = st();
	pins[ 2 ].focus(); pins[ 2 ].dispatchEvent( new KeyboardEvent( 'keydown', { key: 'ArrowRight', bubbles: true } ) );
	out.arrow = document.activeElement === pins[ 3 ];
	return out;
} )();
