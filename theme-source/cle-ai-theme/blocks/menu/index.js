( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/menu', {
		edit: function ( props ) {
			var a = props.attributes;
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Menu', 'cle-ai' ) },
						el( c.SelectControl, {
							label: __( 'Menu location', 'cle-ai' ),
							value: a.location,
							options: [
								{ label: __( 'Primary', 'cle-ai' ), value: 'primary' },
								{ label: __( 'Social', 'cle-ai' ), value: 'social' },
							],
							onChange: function ( v ) { props.setAttributes( { location: v } ); },
						} ),
						el( c.TextControl, {
							label: __( 'Accessible name', 'cle-ai' ),
							value: a.label,
							onChange: function ( v ) { props.setAttributes( { label: v } ); },
						} ),
						el( 'p', null, __( 'Edit the links themselves in Appearance → Menus.', 'cle-ai' ) )
					)
				),
				el( c.Disabled, null, el( wp.serverSideRender, { block: 'cle/menu', attributes: a } ) )
			);
		},
	} );
} )( window.wp );
