( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/next-event', {
		edit: function ( props ) {
			var a = props.attributes;
			var text = function ( key, label ) {
				return el( c.TextControl, {
					label: label,
					value: a[ key ],
					onChange: function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); },
				} );
			};
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Display', 'cle-ai' ) },
						el( c.SelectControl, {
							label: __( 'Layout', 'cle-ai' ),
							value: a.layout,
							options: [
								{ label: __( 'Callout', 'cle-ai' ), value: 'callout' },
								{ label: __( 'One-line bar', 'cle-ai' ), value: 'bar' },
							],
							onChange: function ( v ) { props.setAttributes( { layout: v } ); },
						} ),
						el( c.ToggleControl, {
							label: __( 'Show event summary', 'cle-ai' ),
							checked: a.showExcerpt,
							onChange: function ( v ) { props.setAttributes( { showExcerpt: v } ); },
						} ),
						text( 'eyebrow', __( 'Label', 'cle-ai' ) ),
						text( 'rsvpLabel', __( 'RSVP button text', 'cle-ai' ) ),
						text( 'match', __( 'Only events whose title contains (blank = any)', 'cle-ai' ) )
					),
					el( c.PanelBody, { title: __( 'When no event is scheduled', 'cle-ai' ), initialOpen: false },
						text( 'emptyText', __( 'Message', 'cle-ai' ) ),
						text( 'emptyLinkLabel', __( 'Link text', 'cle-ai' ) ),
						text( 'emptyLink', __( 'Link URL', 'cle-ai' ) )
					)
				),
				el( wp.serverSideRender, { block: 'cle/next-event', attributes: a } )
			);
		},
	} );
} )( window.wp );
