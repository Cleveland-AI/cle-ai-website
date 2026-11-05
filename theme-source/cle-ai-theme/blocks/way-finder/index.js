( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	wp.blocks.registerBlockType( 'cle/way-finder', {
		edit: window.cleServerEdit( 'cle/way-finder', function ( props ) {
			var a = props.attributes;
			var set = function ( k ) { return function ( v ) { var o = {}; o[ k ] = v; props.setAttributes( o ); }; };
			return [
				el( c.PanelBody, { key: 'text', title: __( 'Text', 'cle-ai' ) },
					el( c.TextControl, { label: __( 'Heading', 'cle-ai' ), value: a.heading, onChange: set( 'heading' ) } ),
					el( c.TextControl, { label: __( 'Intro', 'cle-ai' ), value: a.intro, onChange: set( 'intro' ) } ),
					el( 'p', null, __( 'The answers point to sections with these anchors on the same page: events, newsletter, speak, volunteer, sponsor, donate.', 'cle-ai' ) )
				),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
