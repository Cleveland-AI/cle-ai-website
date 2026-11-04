( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var be = wp.blockEditor;
	var c = wp.components;
	// Same measurements as dots.php.
	var DOTS = [
		{ slug: 'blue', x: 36.71, y: 28.71, r: 28.73, i: 0 },
		{ slug: 'yellow', x: 80.24, y: 40.41, r: 11.69, i: 2 },
		{ slug: 'coral', x: 62.02, y: 77.96, r: 21.96, i: 1 },
		{ slug: 'green', x: 26, y: 82.48, r: 11, i: 3 },
	];

	wp.blocks.registerBlockType( 'cle/logo', {
		edit: function ( props ) {
			return el( 'span', be.useBlockProps( { className: 'wp-block-cle-logo' } ),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Logo', 'cle-ai' ) },
						el( c.TextControl, {
							label: __( 'Link label for screen readers', 'cle-ai' ),
							value: props.attributes.label,
							onChange: function ( v ) { props.setAttributes( { label: v } ); },
						} )
					)
				),
				el( 'span', { className: 'cle-logo__mark', 'aria-hidden': true },
					DOTS.map( function ( d ) {
						return el( 'span', { key: d.slug, className: 'cle-logo__dot', style: { '--x': d.x + '%', '--y': d.y + '%', '--r': d.r + '%', '--c': 'var(--wp--preset--color--' + d.slug + ')', '--i': d.i } } );
					} )
				)
			);
		},
		save: function () {
			return null;
		},
	} );
} )( window.wp );
