( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	var TEMPLATE = [
		[ 'cle/menu', { location: 'primary', label: 'Main' } ],
		[ 'cle/menu', { location: 'social', label: 'Social' } ],
	];

	wp.blocks.registerBlockType( 'cle/nav', {
		edit: function ( props ) {
			var a = props.attributes;
			var blockProps = be.useBlockProps( { className: 'cle-nav-editor' } );
			var inner = be.useInnerBlocksProps( { className: 'cle-nav__panel', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--wp--preset--spacing--m)' } }, {
				template: TEMPLATE,
				orientation: 'horizontal',
			} );
			return el( 'div', blockProps,
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Mobile menu button', 'cle-ai' ) },
						el( c.TextControl, { label: __( 'Open label (screen readers)', 'cle-ai' ), value: a.openLabel, onChange: function ( v ) { props.setAttributes( { openLabel: v } ); } } ),
						el( c.TextControl, { label: __( 'Close button text', 'cle-ai' ), value: a.closeLabel, onChange: function ( v ) { props.setAttributes( { closeLabel: v } ); } } )
					)
				),
				el( 'div', inner )
			);
		},
		save: function () {
			return el( be.InnerBlocks.Content );
		},
	} );
} )( window.wp );
