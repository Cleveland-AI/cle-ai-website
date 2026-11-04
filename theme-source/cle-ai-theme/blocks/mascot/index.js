( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	wp.blocks.registerBlockType( 'cle/mascot', {
		edit: window.cleServerEdit( 'cle/mascot', function ( props ) {
			var a = props.attributes;
			return [
				el( c.PanelBody, { key: 'dot', title: __( 'Dot', 'cle-ai' ) },
					el( c.SelectControl, { label: __( 'Pose', 'cle-ai' ), value: a.pose, options: [
						{ label: __( 'Peeking and waving', 'cle-ai' ), value: 'peek' },
						{ label: __( 'Lost, with a map', 'cle-ai' ), value: 'lost' },
						{ label: __( 'Asleep', 'cle-ai' ), value: 'sleep' },
						{ label: __( 'On stage (big nights)', 'cle-ai' ), value: 'stage' },
						{ label: __( 'With a hot dog (socials)', 'cle-ai' ), value: 'social' },
						{ label: __( 'At a laptop (workshops)', 'cle-ai' ), value: 'workshop' },
						{ label: __( 'Hiking (outdoors)', 'cle-ai' ), value: 'hike' },
						{ label: __( 'Searching', 'cle-ai' ), value: 'search' },
						{ label: __( 'Welcoming, with confetti', 'cle-ai' ), value: 'welcome' },
					], onChange: function ( v ) { props.setAttributes( { pose: v } ); } } ),
					el( c.RangeControl, { label: __( 'Width (px)', 'cle-ai' ), min: 80, max: 600, step: 10, value: a.width, onChange: function ( v ) { props.setAttributes( { width: v } ); } } )
				),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
