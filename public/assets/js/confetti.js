/**
 * A short burst of clay-coloured confetti from an element, for small celebrations (a sponsorship
 * package picked, a way in found, Dot poked). Skipped entirely for reduced motion.
 *
 * window.cleConfetti( element )
 */
window.cleConfetti = function ( from ) {
	if ( ! from || window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}
	var colors = [ '#38B6FF', '#FF5757', '#FFDE59', '#7ED957', '#002050' ];
	var r = from.getBoundingClientRect();
	var layer = document.createElement( 'div' );
	layer.className = 'cle-confetti';
	layer.setAttribute( 'aria-hidden', 'true' );
	for ( var i = 0; i < 28; i++ ) {
		var bit = document.createElement( 'span' );
		var angle = Math.random() * Math.PI * 2;
		var dist = 60 + Math.random() * 110;
		bit.style.left = ( r.left + r.width / 2 ) + 'px';
		bit.style.top = ( r.top + r.height / 2 ) + 'px';
		bit.style.background = colors[ i % colors.length ];
		bit.style.setProperty( '--dx', Math.cos( angle ) * dist + 'px' );
		bit.style.setProperty( '--dy', Math.sin( angle ) * dist - 40 + 'px' );
		bit.style.setProperty( '--rot', ( Math.random() * 540 - 270 ) + 'deg' );
		bit.style.animationDelay = ( Math.random() * 80 ) + 'ms';
		if ( i % 3 === 0 ) {
			bit.style.borderRadius = '50%';
		}
		layer.appendChild( bit );
	}
	document.body.appendChild( layer );
	setTimeout( function () { layer.remove(); }, 1400 );
};
