// Paste into the browser pane's JS console on the homepage (desktop width, pane visible).
// Walks every chapter and reports what the stage did.
( async () => {
	const story = document.querySelector( '.wp-block-cle-story' );
	const chapters = [ ...story.querySelectorAll( '.cle-chapter' ) ];
	const wait = ( ms ) => new Promise( ( z ) => setTimeout( z, ms ) );
	const out = {
		chapters: chapters.length,
		rail: story.querySelectorAll( '.cle-story__rail a' ).length,
		stagePosition: getComputedStyle( story.querySelector( '.cle-story__stage' ) ).position,
		seen: [],
	};
	for ( let i = 0; i < chapters.length; i++ ) {
		chapters[ i ].scrollIntoView( { block: 'center' } );
		window.dispatchEvent( new Event( 'scroll' ) );
		await wait( 900 );
		out.seen.push( [
			i,
			story.dataset.active,
			[ ...story.querySelectorAll( '.cle-story__layer.is-on' ) ].map( ( l ) => l.dataset.layer ).join( ',' ),
			story.querySelector( '.cle-story__camera' ).style.getPropertyValue( '--cam-z' ),
			[ 'is-night', 'is-pattern', 'is-far' ].filter( ( c ) => story.classList.contains( c ) ).join( ' ' ),
			story.querySelectorAll( '.cle-story__bubble.is-on' ).length,
			!! story.querySelector( '.cle-story__fg.is-on' ),
			story.querySelector( '.cle-story__hotspots' ).inert,
			story.querySelector( '.cle-story__rail a[aria-current="step"]' )?.dataset.index,
		] );
	}
	out.hOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
	return out;
} )();
