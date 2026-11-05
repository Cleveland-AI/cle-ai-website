// A camera glides across one illustration as the chapters scroll past. Each chapter's camera
// (x, y in percent of the image, zoom) holds still, then flies to the next over the end of the
// chapter, pulling back mid-way like a map flying between places. The last chapter is the
// finale: the whole picture, with a tag on each place that flies back to its chapter. Dot walks
// along with the camera, from one chapter's stop to the next.
// In stacked mode (CSS decides) this script stays idle.
document.querySelectorAll( '.wp-block-cle-world' ).forEach( function ( root ) {
	var stage = root.querySelector( '.cle-world__stage' );
	var view = root.querySelector( '.cle-world__view' );
	var img = view.querySelector( 'img' );
	var chapters = Array.prototype.slice.call( root.querySelectorAll( '.cle-wchapter' ) );
	var last = chapters.length - 1;
	var cams = chapters.map( function ( c ) {
		var cam = JSON.parse( c.dataset.cam || '{"x":50,"y":50,"zoom":1}' );
		cam.cut = cam.cut || 100; // 100 = nothing hidden
		return cam;
	} );
	var groups = Array.prototype.slice.call( root.querySelectorAll( '.cle-world__hotspots' ) );
	var controls = groups.map( function ( g ) { return window.cleHotspots( g, { closeOnLeave: false } ); } );
	// Dot's stops, one per chapter in picture percent. A chapter without one keeps the last stop
	// (or, before the first stop, borrows the first), so he never has nowhere to stand.
	var walker = view.querySelector( '.cle-world__walker' );
	var stops = chapters.map( function ( c ) {
		var at = ( c.dataset.stop || '' ).split( ',' );
		return 2 === at.length ? { x: +at[ 0 ], y: +at[ 1 ] } : null;
	} );
	for ( var si = 1; si < stops.length; si++ ) {
		stops[ si ] = stops[ si ] || stops[ si - 1 ];
	}
	for ( var sj = stops.length - 2; sj >= 0; sj-- ) {
		stops[ sj ] = stops[ sj ] || stops[ sj + 1 ];
	}
	var face = 1;
	var tagsEl = root.querySelector( '.cle-world__tags' );
	var tags = tagsEl ? Array.prototype.slice.call( tagsEl.querySelectorAll( '.cle-world__tag' ) ) : [];
	var fine = window.matchMedia( '(pointer: fine)' ).matches;
	var wide = window.matchMedia( '(min-width: 1024px)' );
	var VEIL = 0.36; // share of the desktop stage under the solid text veil (matches style.css)
	var IW = 0, IH = 0, sw = 0, sh = 0, cover = 1, contain = 1;
	var cur = null, lean = { x: 0, y: 0 }, running = false, onChapter = -1, tagsOn = false;

	if ( ! chapters.length || ! img ) {
		return;
	}

	// Remember each pin/popover's position in image percent; render() rewrites --x/--y in pixels.
	groups.forEach( function ( g ) {
		g.querySelectorAll( '.cle-scene__pin, .cle-scene__pop' ).forEach( function ( el ) {
			el.dataset.px = parseFloat( el.style.getPropertyValue( '--x' ) ) || 50;
			el.dataset.py = parseFloat( el.style.getPropertyValue( '--y' ) ) || 50;
		} );
	} );

	tags.forEach( function ( b, k ) {
		b.style.setProperty( '--i', k );
		b.addEventListener( 'click', function () { goTo( +b.dataset.chapter ); } );
	} );

	function staged() {
		return 'sticky' === window.getComputedStyle( stage ).position;
	}

	// The line a chapter's top must cross to become current.
	function line() {
		return wide.matches ? window.innerHeight * 0.5 : window.innerHeight * 0.46 + 60;
	}

	// Scroll so chapter i sits in its still stretch, before the glide to the next one begins.
	function goTo( i ) {
		var ch = chapters[ i ];
		window.scrollTo( { top: ch.getBoundingClientRect().top + window.scrollY - line() + ch.offsetHeight * 0.3, behavior: 'smooth' } );
	}

	function size() {
		// Lay the picture out at its width/height attributes, not naturalWidth: with srcset the
		// browser reports naturalWidth divided by the screen density (557 for 1672 on a 3x phone).
		IW = +img.getAttribute( 'width' ) || img.naturalWidth || 1600;
		IH = +img.getAttribute( 'height' ) || img.naturalHeight || 900;
		var r = stage.getBoundingClientRect();
		sw = r.width;
		sh = r.height;
		cover = Math.max( sw / IW, sh / IH ); // zoom 1 covers the stage
		contain = Math.min( sw / IW, sh / IH );
		view.style.width = IW + 'px';
		view.style.height = IH + 'px';
		// The finale's bottom veil is as tall as its words, so they never sit on the picture.
		var body = chapters[ last ].querySelector( '.cle-wchapter__body' );
		if ( body ) {
			root.style.setProperty( '--cle-fin-h', Math.round( body.offsetHeight + 72 ) + 'px' );
		}
		wake();
	}

	function target() {
		var mid = line(), i = 0, p = 0;
		chapters.forEach( function ( ch, k ) {
			var r = ch.getBoundingClientRect();
			if ( r.top <= mid ) {
				i = k;
				p = Math.min( 1, Math.max( 0, ( mid - r.top ) / r.height ) );
			}
		} );
		var a = cams[ i ], b = cams[ Math.min( i + 1, last ) ];
		var t = Math.max( 0, ( p - 0.55 ) / 0.45 );
		t = t * t * ( 3 - 2 * t );
		// Pull back mid-flight, further for longer trips, so you see where you're going.
		var dist = Math.hypot( ( b.x - a.x ) / 100 * IW / IH, ( b.y - a.y ) / 100 );
		var z = ( a.zoom + ( b.zoom - a.zoom ) * t ) / ( 1 + Math.min( 1.4, dist * 2 ) * Math.sin( Math.PI * t ) );
		// Dot hops from this chapter's stop to the next while the camera flies: a few hops for a
		// long trip, one for a short one, feet back on the ground at both ends.
		var sa = stops[ i ], sb = stops[ Math.min( i + 1, last ) ], walk = null;
		if ( sa && sb ) {
			var far = Math.hypot( sb.x - sa.x, sb.y - sa.y );
			var hops = far < 0.5 ? 0 : 1 + Math.round( far / 12 );
			if ( t > 0 && t < 1 && sb.x !== sa.x ) {
				face = sb.x < sa.x ? -1 : 1;
			}
			walk = {
				x: sa.x + ( sb.x - sa.x ) * t,
				y: sa.y + ( sb.y - sa.y ) * t,
				hop: hops ? Math.abs( Math.sin( Math.PI * hops * t ) ) * 28 : 0,
				moving: hops > 0 && t > 0.001 && t < 0.999,
			};
		}
		return {
			walk: walk,
			x: ( a.x + ( b.x - a.x ) * t ) / 100,
			y: ( a.y + ( b.y - a.y ) * t ) / 100,
			z: Math.max( 1, z ),
			cut: ( a.cut + ( b.cut - a.cut ) * t ) / 100,
			// 1 while a chapter hides part of the picture: the kept part floats centred in the stage.
			hide: ( a.cut < 100 ? 1 - t : 0 ) + ( b.cut < 100 ? t : 0 ),
			fin: i === last ? 1 : ( i + 1 === last ? t : 0 ),
			ch: t < 0.5 ? i : Math.min( i + 1, last ),
			still: t < 0.02 || t > 0.98,
		};
	}

	function render() {
		// Phones are too narrow for the whole picture at cover size, so the finale shrinks it to fit.
		var base = wide.matches ? cover : cover + ( contain - cover ) * cur.fin;
		var s = base * cur.z, w = IW * s, h = IH * s;
		if ( ! ( w > 0 ) ) {
			return;
		}
		// On desktop the veil covers the left of the stage, so aim at the centre of what's left and
		// let the picture's left edge tuck under the solid veil. Both relax as the finale opens.
		var side = wide.matches ? 1 - cur.fin : 0;
		var tx = sw * ( 0.5 + side * VEIL / 2 ) - cur.x * w + lean.x * 24 * cur.z;
		var ty = sh / 2 - cur.y * h + lean.y * 16 * cur.z;
		tx = w < sw ? ( sw - w ) / 2 : Math.min( sw * VEIL * side, Math.max( sw - w, tx ) );
		ty = h < sh ? ( sh - h ) / 2 : Math.min( 0, Math.max( sh - h, ty ) );
		// With the lower picture hidden, centre what's kept; its top edge then fades in too.
		var kept = cur.cut * h;
		if ( cur.hide > 0.001 && kept < sh ) {
			ty += ( ( sh - kept ) / 2 - ty ) * cur.hide;
		}
		view.style.transform = 'translate(' + tx.toFixed( 1 ) + 'px,' + ty.toFixed( 1 ) + 'px) scale(' + s.toFixed( 4 ) + ')';
		if ( walker && cur.walk ) {
			walker.style.left = cur.walk.x.toFixed( 2 ) + '%';
			walker.style.top = cur.walk.y.toFixed( 2 ) + '%';
			walker.style.setProperty( '--hop', cur.walk.hop.toFixed( 1 ) + '%' );
			walker.style.setProperty( '--face', face );
			walker.classList.toggle( 'is-walking', cur.walk.moving );
		}
		root.style.setProperty( '--cle-side', side.toFixed( 3 ) );
		root.style.setProperty( '--cle-cut-y', cur.cut > 0.995 ? '100000px' : ( ty + cur.cut * h ).toFixed( 1 ) + 'px' );
		root.style.setProperty( '--cle-top-y', ( ty > 0 ? ty : -1000 ).toFixed( 1 ) + 'px' );
		root.style.setProperty( '--cle-bottom', ( wide.matches ? cur.fin : 0 ).toFixed( 3 ) );
		groups.forEach( function ( g ) {
			if ( ! g.classList.contains( 'is-on' ) ) {
				return;
			}
			g.querySelectorAll( '.cle-scene__pin, .cle-scene__pop' ).forEach( function ( el ) {
				var y = ty + el.dataset.py / 100 * h;
				el.style.setProperty( '--x', ( tx + el.dataset.px / 100 * w ).toFixed( 1 ) + 'px' );
				el.style.setProperty( '--y', y.toFixed( 1 ) + 'px' );
				// Open towards the roomier half of the stage, judged on screen, not in the picture.
				if ( el.classList.contains( 'cle-scene__pop' ) ) {
					el.classList.toggle( 'is-below', y < sh / 2 );
					el.classList.toggle( 'is-above', y >= sh / 2 );
				}
			} );
		} );
		if ( tagsOn ) {
			tags.forEach( function ( b ) {
				// A tag can sit elsewhere on phones, where the shrunken picture crowds them together.
				var at = ( wide.matches ? b.dataset.at : b.dataset.atPhone ).split( ',' );
				var x = tx + at[ 0 ] / 100 * w, hw = b.offsetWidth / 2 + 8;
				b.style.setProperty( '--x', x.toFixed( 1 ) + 'px' );
				b.style.setProperty( '--y', ( ty + at[ 1 ] / 100 * h ).toFixed( 1 ) + 'px' );
				// Nudge a tag that would hang off the side back inside the stage.
				b.style.setProperty( '--dx', ( Math.min( sw - hw, Math.max( hw, x ) ) - x ).toFixed( 1 ) + 'px' );
			} );
		}
	}

	// Hotspots appear only once the camera has settled on their chapter; tags only in the finale.
	function show( ch ) {
		if ( ch === onChapter ) {
			return;
		}
		onChapter = ch;
		groups.forEach( function ( g, k ) {
			var on = +g.dataset.chapter === ch;
			g.classList.toggle( 'is-on', on );
			g.inert = ! on;
			if ( ! on ) {
				controls[ k ].closeAll();
			}
		} );
		tagsOn = ch === last && last > 0;
		if ( tagsEl ) {
			tagsEl.classList.toggle( 'is-on', tagsOn );
			tagsEl.inert = ! tagsOn;
		}
	}

	function tick() {
		if ( ! staged() ) {
			running = false;
			return;
		}
		var t = target();
		if ( ! cur ) {
			cur = { x: t.x, y: t.y, z: t.z, fin: t.fin, cut: t.cut, hide: t.hide, walk: t.walk };
		}
		// Dot follows the scroll directly (no easing), so his hops land where the camera settles.
		cur.walk = t.walk;
		var k = 0.085;
		cur.x += ( t.x - cur.x ) * k;
		cur.y += ( t.y - cur.y ) * k;
		cur.z += ( t.z - cur.z ) * k;
		cur.fin += ( t.fin - cur.fin ) * k;
		cur.cut += ( t.cut - cur.cut ) * k;
		cur.hide += ( t.hide - cur.hide ) * k;
		var moving = Math.abs( t.x - cur.x ) + Math.abs( t.y - cur.y ) > 0.004 || Math.abs( t.z - cur.z ) > 0.02 || Math.abs( t.fin - cur.fin ) > 0.01;
		show( moving || ! t.still ? -1 : t.ch );
		render();
		if ( moving || lean.active ) {
			requestAnimationFrame( tick );
		} else {
			running = false;
		}
	}

	function wake() {
		if ( ! running ) {
			running = true;
			requestAnimationFrame( tick );
		}
	}

	if ( fine ) {
		stage.addEventListener( 'pointermove', function ( e ) {
			var r = stage.getBoundingClientRect();
			lean.x = 0.5 - ( e.clientX - r.left ) / r.width;
			lean.y = 0.5 - ( e.clientY - r.top ) / r.height;
			lean.active = true;
			wake();
		} );
		stage.addEventListener( 'pointerleave', function () {
			lean.x = 0;
			lean.y = 0;
			lean.active = false;
			wake();
		} );
	}
	window.addEventListener( 'scroll', wake, { passive: true } );
	window.addEventListener( 'resize', size );
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).addEventListener( 'change', size );
	if ( img.complete ) {
		size();
	} else {
		img.addEventListener( 'load', size );
	}
	root.classList.add( 'is-ready' );
} );
