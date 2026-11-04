( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/world', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = function ( key ) { return function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); }; };
			var inner = be.useInnerBlocksProps( { className: 'cle-world__chapters' }, {
				allowedBlocks: [ 'cle/world-chapter' ],
				template: [ [ 'cle/world-chapter', { title: __( 'First chapter', 'cle-ai' ) } ] ],
			} );
			return el( 'div', be.useBlockProps( { className: 'is-mode-' + a.mode } ),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Story world', 'cle-ai' ) },
						el( c.SelectControl, {
							label: __( 'Presentation', 'cle-ai' ),
							value: a.mode,
							options: [
								{ label: __( 'Camera glides across the picture', 'cle-ai' ), value: 'stage' },
								{ label: __( 'Stacked chapters', 'cle-ai' ), value: 'stacked' },
							],
							onChange: set( 'mode' ),
						} ),
						el( 'div', { style: { marginBottom: '12px' } },
							el( 'strong', null, __( 'Picture', 'cle-ai' ) ),
							el( 'div', null, a.imageId ? __( 'Media Library image #', 'cle-ai' ) + a.imageId : __( 'Theme default', 'cle-ai' ) ),
							el( be.MediaUploadCheck, null,
								el( be.MediaUpload, {
									allowedTypes: [ 'image' ],
									value: a.imageId,
									onSelect: function ( m ) { props.setAttributes( { imageId: m.id } ); },
									render: function ( o ) { return el( c.Button, { variant: 'secondary', size: 'small', onClick: o.open }, __( 'Replace picture', 'cle-ai' ) ); },
								} )
							),
							a.imageId ? el( c.Button, { variant: 'link', onClick: function () { props.setAttributes( { imageId: 0 } ); } }, __( 'Use theme default', 'cle-ai' ) ) : null
						),
						el( c.TextareaControl, { label: __( 'Picture description (screen readers)', 'cle-ai' ), value: a.alt, onChange: set( 'alt' ) } ),
						el( 'p', null, __( 'Each chapter below sets where the camera looks while it is on screen. Select a chapter and click its preview to aim.', 'cle-ai' ) )
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
