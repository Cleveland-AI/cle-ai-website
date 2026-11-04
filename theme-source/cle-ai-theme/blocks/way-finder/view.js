// Find your way in: once all three questions are answered, total the points and recommend
// the top way in, with a button that scrolls to that section of the page.
document.querySelectorAll( '.cle-finder' ).forEach( function ( root ) {
	var ways = JSON.parse( root.dataset.ways || '{}' );
	var order = Object.keys( ways );
	var sets = root.querySelectorAll( '.cle-finder__q' );
	var result = root.querySelector( '.cle-finder__result' );
	var pick = root.querySelector( '.cle-finder__pick' );
	var why = root.querySelector( '.cle-finder__why' );
	var go = root.querySelector( '.cle-finder__go a' );

	function update() {
		var chosen = root.querySelectorAll( 'input:checked' );
		if ( chosen.length < sets.length ) {
			return;
		}
		var score = {};
		chosen.forEach( function ( input ) {
			input.value.split( ' ' ).forEach( function ( w ) { score[ w ] = ( score[ w ] || 0 ) + 1; } );
		} );
		var best = order.reduce( function ( b, w ) { return ( score[ w ] || 0 ) > ( score[ b ] || 0 ) ? w : b; }, order[ 0 ] );
		pick.textContent = ways[ best ][ 0 ];
		why.textContent = ways[ best ][ 1 ];
		go.href = '#' + best;
		var first = result.hidden;
		result.hidden = false;
		if ( first && window.cleConfetti ) {
			window.cleConfetti( pick );
		}
		if ( first ) {
			result.scrollIntoView( { block: 'nearest', behavior: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth' } );
		}
	}
	root.addEventListener( 'change', update );
	root.querySelector( 'form' ).addEventListener( 'submit', function ( e ) { e.preventDefault(); } );
	go.addEventListener( 'click', function ( e ) {
		var target = document.getElementById( go.getAttribute( 'href' ).slice( 1 ) );
		if ( target ) {
			e.preventDefault();
			target.scrollIntoView( { behavior: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth' } );
			target.setAttribute( 'tabindex', '-1' );
			target.focus( { preventScroll: true } );
		}
	} );
} );
