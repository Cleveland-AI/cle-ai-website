// Paste into the browser pane's JS console on any wp-admin editor screen (block editor loaded).
// Parses every theme template, part and pattern with the editor's own validator.
( async () => {
	const out = {};
	const check = ( label, raw ) => {
		const bad = [];
		let n = 0;
		const walk = ( blocks ) => blocks.forEach( ( b ) => {
			n++;
			if ( ! b.isValid ) bad.push( b.name + ': ' + JSON.stringify( ( b.validationIssues || [] ).map( ( i ) => i.args ) ).slice( 0, 300 ) );
			if ( 'core/missing' === b.name ) bad.push( 'unregistered: ' + b.attributes.originalName );
			walk( b.innerBlocks );
		} );
		walk( wp.blocks.parse( raw ) );
		out[ label ] = bad.length ? bad : n + ' ok';
	};
	( await wp.apiFetch( { path: '/wp/v2/templates?context=edit&per_page=100' } ) ).filter( ( x ) => 'cle-ai-theme' === x.theme ).forEach( ( x ) => check( 'T ' + x.slug, x.content.raw ) );
	( await wp.apiFetch( { path: '/wp/v2/template-parts?context=edit&per_page=100' } ) ).filter( ( x ) => 'cle-ai-theme' === x.theme ).forEach( ( x ) => check( 'P ' + x.slug, x.content.raw ) );
	( await wp.apiFetch( { path: '/wp/v2/block-patterns/patterns' } ) ).filter( ( x ) => x.name.startsWith( 'cle-ai/' ) ).forEach( ( x ) => check( 'Pat ' + x.name, x.content ) );
	return out;
} )();
