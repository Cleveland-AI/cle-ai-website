// Scroll progress through the section drives the track under a fixed centre playhead.
document.querySelectorAll( '.wp-block-cle-timeline' ).forEach( function ( root ) {
	var track = root.querySelector( '.cle-timeline__track' );
	var items = Array.prototype.slice.call( root.querySelectorAll( '.cle-timeline__item' ) );
	var reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	var queued = false;

	function update() {
		queued = false;
		if ( reduce.matches ) {
			track.style.transform = '';
			items.forEach( function ( item ) { item.classList.remove( 'is-active', 'is-past' ); } );
			return;
		}
		var rect = root.getBoundingClientRect();
		var runway = rect.height - window.innerHeight;
		var p = runway > 0 ? Math.min( 1, Math.max( 0, -rect.top / runway ) ) : 0;
		track.style.transform = 'translateX(' + ( root.clientWidth / 2 - p * track.offsetWidth ) + 'px)';

		// The most recent item the playhead has reached shows its card, anchored at the playhead
		// so it stays on screen through long empty stretches. Before the first, show the first.
		var active = items[ 0 ] || null;
		items.forEach( function ( item ) {
			var reached = parseFloat( item.dataset.x ) <= p + 0.001;
			item.classList.toggle( 'is-past', reached );
			if ( reached ) {
				active = item;
			}
		} );
		items.forEach( function ( item ) { item.classList.toggle( 'is-active', item === active ); } );
		if ( active ) {
			var shift = root.clientWidth / 2 - ( active.getBoundingClientRect().left - root.getBoundingClientRect().left );
			active.style.setProperty( '--cle-tl-shift', shift + 'px' );
		}
	}

	function queue() {
		if ( ! queued ) {
			queued = true;
			window.requestAnimationFrame( update );
		}
	}

	window.addEventListener( 'scroll', queue, { passive: true } );
	window.addEventListener( 'resize', queue );
	reduce.addEventListener( 'change', queue );
	update();
} );
