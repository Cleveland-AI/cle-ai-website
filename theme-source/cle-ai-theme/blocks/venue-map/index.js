( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	wp.blocks.registerBlockType( 'cle/venue-map', {
		edit: window.cleServerEdit( 'cle/venue-map', function ( props ) {
			var a = props.attributes;
			return [
				el( c.PanelBody, { key: 'map', title: __( 'Map', 'cle-ai' ) },
					el( c.TextControl, { label: __( 'Map illustration name (assets/illustrations)', 'cle-ai' ), value: a.art, onChange: function ( v ) { props.setAttributes( { art: v } ); } } ),
					el( c.TextareaControl, { label: __( 'Map description for screen readers', 'cle-ai' ), value: a.alt, onChange: function ( v ) { props.setAttributes( { alt: v } ); } } )
				),
				window.cleArrayPanel( props, 'pins', { title: __( 'Venues', 'cle-ai' ), itemLabel: __( 'Venue', 'cle-ai' ), blank: { title: '', place: '', match: '', x: 50, y: 50 }, fields: [
					{ key: 'title', label: __( 'Venue', 'cle-ai' ) },
					{ key: 'place', label: __( 'Address and what happens there', 'cle-ai' ) },
					{ key: 'match', label: __( 'Next event: title contains', 'cle-ai' ) },
					{ key: 'x', label: __( 'Pin X % (from the left)', 'cle-ai' ), type: 'number' },
					{ key: 'y', label: __( 'Pin Y % (from the top)', 'cle-ai' ), type: 'number' },
				] } ),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
