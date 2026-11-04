( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/coming-up', {
		edit: function ( props ) {
			var a = props.attributes;
			var events = a.events || [];
			var setEvent = function ( i, patch ) {
				var next = events.slice();
				next[ i ] = Object.assign( {}, next[ i ], patch );
				props.setAttributes( { events: next } );
			};
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Event cards', 'cle-ai' ) },
						el( 'p', null, __( 'Each card shows the next event whose title contains its word. If none matches, it shows the next event not already shown.', 'cle-ai' ) ),
						events.map( function ( ev, i ) {
							return el( 'div', { key: i },
								el( c.TextControl, { label: __( 'Card', 'cle-ai' ) + ' ' + ( i + 1 ) + ': ' + __( 'label', 'cle-ai' ), value: ev.label, onChange: function ( v ) { setEvent( i, { label: v } ); } } ),
								el( c.TextControl, { label: __( 'Title contains', 'cle-ai' ), value: ev.match, onChange: function ( v ) { setEvent( i, { match: v } ); } } ),
								el( c.Button, { variant: 'link', isDestructive: true, onClick: function () { props.setAttributes( { events: events.filter( function ( x, k ) { return k !== i; } ) } ); } }, __( 'Remove card', 'cle-ai' ) ),
								el( 'hr' )
							);
						} ),
						el( c.Button, { variant: 'secondary', onClick: function () { props.setAttributes( { events: events.concat( [ { match: '', label: __( 'Next event', 'cle-ai' ) } ] ) } ); } }, __( 'Add an event card', 'cle-ai' ) )
					),
					el( c.PanelBody, { title: __( 'Latest post', 'cle-ai' ) },
						el( c.ToggleControl, { label: __( 'Show the latest post', 'cle-ai' ), checked: a.showPost, onChange: function ( v ) { props.setAttributes( { showPost: v } ); } } ),
						el( c.TextControl, { label: __( 'Label', 'cle-ai' ), value: a.postLabel, onChange: function ( v ) { props.setAttributes( { postLabel: v } ); } } )
					)
				),
				el( wp.serverSideRender, { block: 'cle/coming-up', attributes: a } )
			);
		},
		save: function () {
			return null;
		},
	} );
} )( window.wp );
