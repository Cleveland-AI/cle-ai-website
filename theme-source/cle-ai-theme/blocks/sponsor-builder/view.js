// Sponsorship builder: toggling perks fills the pile, totals the weights, lights the matching
// tier and rewrites the button so the inquiry arrives with the picks already in it.
document.querySelectorAll( '.cle-builder' ).forEach( function ( root ) {
	var perks = Array.prototype.slice.call( root.querySelectorAll( '.cle-builder__perk' ) );
	var pieces = root.querySelectorAll( '.cle-builder__piece' );
	var tierEls = root.querySelectorAll( '.cle-builder__tiers li' );
	var result = root.querySelector( '.cle-builder__result' );
	var cta = root.querySelector( '.cle-builder__cta' );
	var tiers = JSON.parse( root.dataset.tiers || '[]' );
	var form = root.dataset.form || '';
	var mailto = root.dataset.mailto || '';
	var intro = result.textContent;
	var celebrated = false;

	function update() {
		var picked = perks.filter( function ( p ) { return 'true' === p.getAttribute( 'aria-pressed' ); } );
		var total = picked.reduce( function ( sum, p ) { return sum + ( parseFloat( p.dataset.weight ) || 0 ); }, 0 );
		var labels = picked.map( function ( p ) { return p.dataset.label; } );
		var at = -1;
		tiers.forEach( function ( t, i ) { if ( total > 0 && total >= t.min ) { at = i; } } );
		perks.forEach( function ( p, i ) { pieces[ i ].classList.toggle( 'is-on', 'true' === p.getAttribute( 'aria-pressed' ) ); } );
		tierEls.forEach( function ( li, i ) { li.classList.toggle( 'is-match', i === at ); } );
		if ( at === tiers.length - 1 && at >= 0 && ! celebrated && window.cleConfetti ) {
			celebrated = true; // reaching the top tier gets a little party, once
			window.cleConfetti( tierEls[ at ] );
		}
		if ( ! picked.length ) {
			result.textContent = intro;
		} else {
			var tier = tiers[ Math.max( at, 0 ) ];
			result.textContent = labels.length + ( 1 === labels.length ? ' pick' : ' picks' ) + ( tier ? ': that sounds like a ' + tier.name.toLowerCase() + ( tier.price && tier.price.indexOf( '[' ) < 0 ? ' (' + tier.price + ')' : '' ) + '.' : '.' );
		}
		var list = labels.join( ', ' );
		cta.href = form
			? form.replace( 'PACKAGE', encodeURIComponent( list ) )
			: mailto + ( list ? '&body=' + encodeURIComponent( 'We are interested in: ' + list + '.\n\nCompany:\nContact:\n' ) : '' );
	}

	perks.forEach( function ( p ) {
		p.addEventListener( 'click', function () {
			p.setAttribute( 'aria-pressed', 'true' === p.getAttribute( 'aria-pressed' ) ? 'false' : 'true' );
			update();
		} );
	} );
	root.classList.add( 'is-ready' );
} );
