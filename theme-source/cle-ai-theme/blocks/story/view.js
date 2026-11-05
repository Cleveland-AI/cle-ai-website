// Drives the pinned stage from whichever chapter crosses the middle of the viewport.
// CSS decides whether the stage is active (sticky). In stacked mode this script clears any
// stage state (night, pattern, far, active chapter) and waits until the stage comes back.
document.querySelectorAll( '.wp-block-cle-story' ).forEach( function ( story ) {
	var all = function ( sel ) { return Array.prototype.slice.call( story.querySelectorAll( sel ) ); };
	var stage = story.querySelector( '.cle-story__stage' );
	var camera = story.querySelector( '.cle-story__camera' );
	var chapters = all( '.cle-chapter' );
	var states = chapters.map( function ( ch ) { return JSON.parse( ch.dataset.chapter || '{}' ); } );
	var layers = all( '.cle-story__layer' );
	var extras = all( '.cle-story__bubble, .cle-story__pin' );
	var foregrounds = all( '.cle-story__fg' );
	var railLinks = all( '.cle-story__rail a' );
	var hotspotsEl = story.querySelector( '.cle-story__hotspots' );
	var hotspots = hotspotsEl ? window.cleHotspots( hotspotsEl, { closeOnLeave: false } ) : null;
	var active = -1;
	var shown = -1;
	var queued = false;

	function staged() {
		return 'sticky' === window.getComputedStyle( stage ).position;
	}

	function apply( i, revealCount ) {
		var s = states[ i ];
		var visible = s.reveal ? s.layers.slice( 0, Math.max( 2, revealCount ) ) : s.layers;
		story.dataset.active = String( i );
		story.classList.toggle( 'is-night', !! s.night );
		story.classList.toggle( 'is-pattern', !! s.pattern );
		story.classList.toggle( 'is-far', s.camera.zoom < 0.5 );
		layers.forEach( function ( layer ) {
			var slug = layer.dataset.layer;
			var on = 'neon' === slug ? !! s.night : ( ! s.night ) && -1 !== visible.indexOf( slug );
			layer.classList.toggle( 'is-on', on );
		} );
		camera.style.setProperty( '--cam-x', s.camera.x + '%' );
		camera.style.setProperty( '--cam-y', s.camera.y + '%' );
		camera.style.setProperty( '--cam-z', String( s.camera.zoom ) );
		extras.forEach( function ( el ) { el.classList.toggle( 'is-on', String( i ) === el.dataset.chapter ); } );
		foregrounds.forEach( function ( el ) { el.classList.toggle( 'is-on', el.dataset.foreground === s.foreground ); } );
		if ( hotspotsEl ) {
			hotspotsEl.classList.toggle( 'is-on', !! s.hotspots );
			hotspotsEl.inert = ! s.hotspots;
			if ( ! s.hotspots ) {
				hotspots.closeAll();
			}
		}
		// Untitled chapters have no rail link, so match links by data-index, not position.
		railLinks.forEach( function ( a ) {
			var current = String( i ) === a.dataset.index;
			a.classList.toggle( 'is-active', current );
			if ( current ) {
				a.setAttribute( 'aria-current', 'step' );
			} else {
				a.removeAttribute( 'aria-current' );
			}
		} );
	}

	function update() {
		queued = false;
		if ( ! chapters.length ) {
			return;
		}
		if ( ! staged() ) {
			if ( -1 !== active ) {
				story.classList.remove( 'is-night', 'is-pattern', 'is-far' );
				delete story.dataset.active;
				active = -1;
				shown = -1;
			}
			return;
		}
		var mid = window.innerHeight / 2;
		var index = 0;
		var progress = 0;
		chapters.forEach( function ( ch, k ) {
			var r = ch.getBoundingClientRect();
			if ( r.top <= mid ) {
				index = k;
				progress = Math.min( 1, Math.max( 0, ( mid - r.top ) / r.height ) );
			}
		} );
		var reveal = Math.ceil( progress * states[ index ].layers.length );
		// Re-apply only when something visible changes.
		if ( index !== active || ( states[ index ].reveal && reveal !== shown ) ) {
			apply( index, reveal );
			active = index;
			shown = reveal;
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
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).addEventListener( 'change', queue );
	story.classList.add( 'is-ready' );
	update();
} );
