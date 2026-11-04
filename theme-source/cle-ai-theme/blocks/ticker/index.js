( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/ticker', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = function ( key ) {
				return function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); };
			};
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Content', 'cle-ai' ) },
						el( c.SelectControl, {
							label: __( 'Source', 'cle-ai' ),
							value: a.source,
							options: [
								{ label: __( 'Recent posts', 'cle-ai' ), value: 'posts' },
								{ label: __( 'Upcoming events', 'cle-ai' ), value: 'events' },
								{ label: __( 'Events, then posts', 'cle-ai' ), value: 'both' },
							],
							onChange: set( 'source' ),
						} ),
						el( c.RangeControl, { label: __( 'Number of items', 'cle-ai' ), min: 1, max: 20, value: a.count, onChange: set( 'count' ) } ),
						el( c.ToggleControl, { label: __( 'Show thumbnails', 'cle-ai' ), checked: a.showThumbnails, onChange: set( 'showThumbnails' ) } )
					),
					el( c.PanelBody, { title: __( 'Motion and labels', 'cle-ai' ) },
						el( c.RangeControl, {
							label: __( 'Seconds per full loop (higher is slower)', 'cle-ai' ),
							min: 20, max: 120, value: a.duration, onChange: set( 'duration' ),
						} ),
						el( c.TextControl, { label: __( 'Label', 'cle-ai' ), value: a.label, onChange: set( 'label' ) } ),
						el( c.TextControl, { label: __( 'Event prefix', 'cle-ai' ), value: a.eventPrefix, onChange: set( 'eventPrefix' ) } ),
						el( c.TextControl, { label: __( 'Pause button text', 'cle-ai' ), value: a.pauseLabel, onChange: set( 'pauseLabel' ) } ),
						el( c.TextControl, { label: __( 'Play button text', 'cle-ai' ), value: a.playLabel, onChange: set( 'playLabel' ) } )
					)
				),
				el( be.Disabled || c.Disabled, null, el( wp.serverSideRender, { block: 'cle/ticker', attributes: a } ) )
			);
		},
	} );
} )( window.wp );
