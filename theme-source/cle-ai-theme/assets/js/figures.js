// Big figures count up when they scroll into view: every number inside a .cle-figure's first
// line and inside .cle-figures text (4,284 members · 183 events · 4.8 from 1,465 reviews).
// Commas and decimals are kept as written. Each element runs once; not under reduced motion.
( function () {
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}
	var els = Array.prototype.slice.call( document.querySelectorAll( '.cle-figure > :first-child, .cle-figures' ) );
	if ( ! els.length ) {
		return;
	}
	function wrap( el ) {
		var walker = document.createTreeWalker( el, NodeFilter.SHOW_TEXT ), nodes = [], n;
		while ( ( n = walker.nextNode() ) ) {
			if ( /\d/.test( n.nodeValue ) ) {
				nodes.push( n );
			}
		}
		var spans = [];
		nodes.forEach( function ( node ) {
			var parts = node.nodeValue.split( /(\d[\d,]*(?:\.\d+)?)/ ), frag = document.createDocumentFragment();
			parts.forEach( function ( part, k ) {
				if ( k % 2 ) {
					var sp = document.createElement( 'span' );
					sp.className = 'cle-count';
					sp.dataset.final = part;
					sp.textContent = part;
					frag.appendChild( sp );
					spans.push( sp );
				} else if ( part ) {
					frag.appendChild( document.createTextNode( part ) );
				}
			} );
			node.parentNode.replaceChild( frag, node );
		} );
		return spans;
	}
	function format( value, final ) {
		var dec = ( final.split( '.' )[ 1 ] || '' ).length;
		var s = value.toFixed( dec );
		if ( final.indexOf( ',' ) >= 0 ) {
			s = s.replace( /\B(?=(\d{3})+(?!\d))/g, ',' );
		}
		return s;
	}
	function run( spans ) {
		var start = null, dur = 1400;
		spans.forEach( function ( sp ) {
			sp.dataset.target = parseFloat( sp.dataset.final.replace( /,/g, '' ) );
			sp.textContent = format( 0, sp.dataset.final );
		} );
		// A timer, not requestAnimationFrame: a frame loop can stall in a background tab and
		// leave the numbers at zero, while a timer always gets to the end.
		var timer = setInterval( function () {
			var now = performance.now();
			start = start || now;
			var t = Math.min( 1, ( now - start ) / dur );
			var e = 1 - Math.pow( 1 - t, 3 );
			spans.forEach( function ( sp ) {
				sp.textContent = t < 1 ? format( sp.dataset.target * e, sp.dataset.final ) : sp.dataset.final;
			} );
			if ( t >= 1 ) {
				clearInterval( timer );
			}
		}, 16 );
	}
	// Checked on scroll rather than with an observer, so it also works where observers are
	// throttled (background tabs, embedded previews). Each element runs once.
	var pending = false;
	function check() {
		pending = false;
		els = els.filter( function ( el ) {
			var r = el.getBoundingClientRect();
			if ( r.bottom < 0 || r.top > window.innerHeight * 0.9 ) {
				return true;
			}
			var spans = wrap( el );
			if ( spans.length ) {
				run( spans );
			}
			return false;
		} );
		if ( ! els.length ) {
			window.removeEventListener( 'scroll', queue );
			window.removeEventListener( 'resize', queue );
		}
	}
	function queue() {
		if ( ! pending ) {
			pending = true;
			requestAnimationFrame( check );
		}
	}
	window.addEventListener( 'scroll', queue, { passive: true } );
	window.addEventListener( 'resize', queue );
	check();
} )();
