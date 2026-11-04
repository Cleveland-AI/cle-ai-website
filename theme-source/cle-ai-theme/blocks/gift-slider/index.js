( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	wp.blocks.registerBlockType( 'cle/gift-slider', {
		edit: window.cleServerEdit( 'cle/gift-slider', function ( props ) {
			var a = props.attributes;
			return [
				el( c.PanelBody, { key: 'opts', title: __( 'Settings', 'cle-ai' ) },
					el( c.TextControl, { label: __( 'Starting step (0 = first)', 'cle-ai' ), type: 'number', value: a.start, onChange: function ( v ) { props.setAttributes( { start: parseInt( v, 10 ) || 0 } ); } } ),
					el( c.TextControl, { label: __( 'Button goes to', 'cle-ai' ), help: __( 'The Donate section on this page (#donate) or a link.', 'cle-ai' ), value: a.target, onChange: function ( v ) { props.setAttributes( { target: v } ); } } ),
					el( c.TextControl, { label: __( 'Button text (%s is the amount)', 'cle-ai' ), value: a.buttonLabel, onChange: function ( v ) { props.setAttributes( { buttonLabel: v } ); } } )
				),
				window.cleArrayPanel( props, 'steps', { title: __( 'Amounts', 'cle-ai' ), itemLabel: __( 'Amount', 'cle-ai' ), blank: { amount: 0, label: '', art: '' }, fields: [
					{ key: 'amount', label: __( 'Amount ($)', 'cle-ai' ), type: 'number' },
					{ key: 'label', label: __( 'What it covers', 'cle-ai' ) },
					{ key: 'art', label: __( 'Illustration name (assets/illustrations)', 'cle-ai' ) },
				] } ),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
