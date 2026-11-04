( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/event-meta', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = function ( key ) {
				return function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); };
			};
			var postId = props.context.postId;
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Show', 'cle-ai' ) },
						el( c.ToggleControl, { label: __( 'Upcoming / Past status', 'cle-ai' ), checked: a.showStatus, onChange: set( 'showStatus' ) } ),
						el( c.ToggleControl, { label: __( 'Date and time', 'cle-ai' ), checked: a.showDate, onChange: set( 'showDate' ) } ),
						el( c.SelectControl, { label: __( 'Date style', 'cle-ai' ), value: a.dateStyle, options: [ { label: __( 'Short (cards)', 'cle-ai' ), value: 'short' }, { label: __( 'Long (event page)', 'cle-ai' ), value: 'long' } ], onChange: set( 'dateStyle' ) } ),
						el( c.ToggleControl, { label: __( 'Venue', 'cle-ai' ), checked: a.showVenue, onChange: set( 'showVenue' ) } ),
						el( c.SelectControl, { label: __( 'Venue style', 'cle-ai' ), value: a.venueStyle, options: [ { label: __( 'Name and address with map link', 'cle-ai' ), value: 'full' }, { label: __( 'Name only', 'cle-ai' ), value: 'name' } ], onChange: set( 'venueStyle' ) } ),
						el( c.ToggleControl, { label: __( 'RSVP button (upcoming events only)', 'cle-ai' ), checked: a.showRsvp, onChange: set( 'showRsvp' ) } ),
						el( c.TextControl, { label: __( 'RSVP text', 'cle-ai' ), value: a.rsvpLabel, onChange: set( 'rsvpLabel' ) } ),
						el( c.ToggleControl, { label: __( 'Organizer', 'cle-ai' ), checked: a.showOrganizer, onChange: set( 'showOrganizer' ) } ),
						el( c.ToggleControl, { label: __( 'Link back to all events', 'cle-ai' ), checked: a.showBackLink, onChange: set( 'showBackLink' ) } )
					)
				),
				postId
					? el( wp.serverSideRender, { block: 'cle/event-meta', attributes: a, urlQueryArgs: { post_id: postId } } )
					: el( 'p', { className: 'cle-event-meta__when' }, __( 'Event date · venue · RSVP button (filled in on each event page)', 'cle-ai' ) )
			);
		},
	} );
} )( window.wp );
