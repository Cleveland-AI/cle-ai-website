( function ( wp ) {
	var el = wp.element.createElement;
	var c = wp.components;
	var __ = wp.i18n.__;
	wp.blocks.registerBlockType( 'cle/first-night', {
		edit: window.cleServerEdit( 'cle/first-night', function ( props ) {
			var a = props.attributes;
			return [
				el( c.PanelBody, { title: __( 'Visibility', 'cle-ai' ) },
					el( c.ToggleControl, { label: __( 'Show on the site', 'cle-ai' ), help: a.visible ? __( 'Visitors see this section.', 'cle-ai' ) : __( 'Hidden from visitors. Everything is kept; switch this on to show it.', 'cle-ai' ), checked: !! a.visible, onChange: function ( v ) { props.setAttributes( { visible: v } ); }, __nextHasNoMarginBottom: true } )
				),
				el( c.PanelBody, { title: __( 'Heading', 'cle-ai' ) },
					el( c.TextControl, { label: __( 'Eyebrow', 'cle-ai' ), value: a.eyebrow, onChange: function ( v ) { props.setAttributes( { eyebrow: v } ); }, __nextHasNoMarginBottom: true } ),
					el( c.TextControl, { label: __( 'Heading', 'cle-ai' ), value: a.heading, onChange: function ( v ) { props.setAttributes( { heading: v } ); }, __nextHasNoMarginBottom: true } ),
					el( c.TextControl, { label: __( 'Event to end on (title contains)', 'cle-ai' ), help: __( 'The last moment shows the next event whose title contains this. Empty for none.', 'cle-ai' ), value: a.match, onChange: function ( v ) { props.setAttributes( { match: v } ); }, __nextHasNoMarginBottom: true } )
				),
				window.cleArrayPanel( props, 'steps', { title: __( 'Moments', 'cle-ai' ), itemLabel: __( 'Moment', 'cle-ai' ), blank: { time: '', title: '', text: '', art: '', fallback: 'dot-social' }, fields: [
					{ key: 'time', label: __( 'Time (6:00 PM)', 'cle-ai' ) },
					{ key: 'title', label: __( 'Title', 'cle-ai' ) },
					{ key: 'text', label: __( 'One or two sentences', 'cle-ai' ), type: 'textarea' },
					{ key: 'art', label: __( 'Picture (file name in assets/illustrations, without .webp)', 'cle-ai' ) },
					{ key: 'fallback', label: __( 'Picture to use until that one exists', 'cle-ai' ) },
				] } ),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
