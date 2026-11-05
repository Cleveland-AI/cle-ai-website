( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	wp.blocks.registerBlockType( 'cle/sponsor-builder', {
		edit: window.cleServerEdit( 'cle/sponsor-builder', function ( props ) {
			var a = props.attributes;
			return [
				el( c.PanelBody, { key: 'send', title: __( 'Sending the package', 'cle-ai' ) },
					el( c.TextControl, { label: __( 'Google Form pre-filled link (optional)', 'cle-ai' ), help: __( 'In the form: ⋮ → Get pre-filled link, type PACKAGE in the package question, then Get link. Without it the button opens an email.', 'cle-ai' ), value: a.formUrl, onChange: function ( v ) { props.setAttributes( { formUrl: v } ); } } ),
					el( c.TextControl, { label: __( 'Email', 'cle-ai' ), value: a.email, onChange: function ( v ) { props.setAttributes( { email: v } ); } } ),
					el( c.TextControl, { label: __( 'Button text', 'cle-ai' ), value: a.buttonLabel, onChange: function ( v ) { props.setAttributes( { buttonLabel: v } ); } } )
				),
				window.cleArrayPanel( props, 'perks', { title: __( 'Perks', 'cle-ai' ), itemLabel: __( 'Perk', 'cle-ai' ), blank: { label: '', desc: '', art: '', weight: 1 }, fields: [
					{ key: 'label', label: __( 'Perk', 'cle-ai' ) },
					{ key: 'desc', label: __( 'One-line description', 'cle-ai' ) },
					{ key: 'weight', label: __( 'Weight (how much it counts toward a tier)', 'cle-ai' ), type: 'number' },
					{ key: 'art', label: __( 'Illustration name (assets/illustrations)', 'cle-ai' ) },
				] } ),
				window.cleArrayPanel( props, 'tiers', { title: __( 'Tiers', 'cle-ai' ), itemLabel: __( 'Tier', 'cle-ai' ), blank: { name: '', min: 1, price: '' }, fields: [
					{ key: 'name', label: __( 'Tier name', 'cle-ai' ) },
					{ key: 'min', label: __( 'Reached at total weight', 'cle-ai' ), type: 'number' },
					{ key: 'price', label: __( 'Price', 'cle-ai' ) },
				] } ),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
