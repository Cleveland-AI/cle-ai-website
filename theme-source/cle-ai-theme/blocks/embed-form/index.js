( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/embed-form', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = function ( key ) { return function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); }; };
			var ok = /^https:\/\//.test( a.url || '' );
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Form', 'cle-ai' ) },
						el( c.TextControl, {
							label: __( 'Form URL (https)', 'cle-ai' ),
							help: __( 'Google Forms: Send → the <> tab → copy the src address. Substack: Settings → Publication details → Embed.', 'cle-ai' ),
							value: a.url, onChange: set( 'url' ),
						} ),
						el( c.TextControl, { label: __( 'Title for screen readers', 'cle-ai' ), value: a.title, onChange: set( 'title' ) } ),
						el( c.RangeControl, { label: __( 'Height (px)', 'cle-ai' ), min: 200, max: 2000, step: 10, value: a.height, onChange: set( 'height' ) } ),
						el( c.TextControl, { label: __( 'Fallback link text', 'cle-ai' ), value: a.linkLabel, onChange: set( 'linkLabel' ) } ),
						el( c.TextControl, { label: __( 'Fallback link address (optional)', 'cle-ai' ), help: __( 'Where the fallback link goes. Leave empty to use the form address.', 'cle-ai' ), value: a.linkUrl, onChange: set( 'linkUrl' ) } ),
						el( c.ToggleControl, { label: __( 'Allow payments (donation forms)', 'cle-ai' ), help: __( 'Lets Apple Pay and Google Pay work inside the form.', 'cle-ai' ), checked: a.allowPayment, onChange: set( 'allowPayment' ) } )
					)
				),
				ok
					? el( 'iframe', { className: 'cle-embed-form__frame', src: a.url, title: a.title, height: a.height, style: { pointerEvents: 'none' } } )
					: el( 'div', { className: 'cle-embed-form__placeholder' }, __( 'Embedded form: paste the form’s https address in the sidebar.', 'cle-ai' ) ),
				el( 'p', { className: 'cle-embed-form__link' }, a.linkLabel )
			);
		},
		save: function () { return null; },
	} );
} )( window.wp );
