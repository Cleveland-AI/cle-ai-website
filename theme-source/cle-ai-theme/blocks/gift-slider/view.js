// What your gift covers: the slider picks a step, the pile shows every object up to it, and
// the button follows the amount down to the donation form.
document.querySelectorAll( '.cle-gift' ).forEach( function ( root ) {
	var steps = JSON.parse( root.dataset.steps || '[]' );
	var live = root.querySelector( '.cle-gift__live' );
	var list = root.querySelector( '.cle-gift__list' );
	var range = root.querySelector( '.cle-gift__range' );
	var amount = root.querySelector( '.cle-gift__amount' );
	var covers = root.querySelector( '.cle-gift__covers' );
	var cta = root.querySelector( '.cle-gift__cta' );
	var pieces = root.querySelectorAll( '.cle-gift__piece' );
	var button = root.dataset.button || 'Give %s';
	if ( ! steps.length || ! range ) {
		return;
	}
	live.hidden = false;
	list.hidden = true;

	function update() {
		var i = +range.value;
		var s = steps[ i ];
		amount.textContent = s.amount;
		covers.textContent = s.label;
		cta.textContent = button.replace( '%s', s.amount );
		range.setAttribute( 'aria-valuetext', s.amount + ': ' + s.label );
		range.style.setProperty( '--fill', ( i / Math.max( 1, steps.length - 1 ) * 100 ) + '%' );
		pieces.forEach( function ( p, k ) { p.classList.toggle( 'is-on', k <= i ); } );
	}
	range.addEventListener( 'input', update );
	update();
} );
