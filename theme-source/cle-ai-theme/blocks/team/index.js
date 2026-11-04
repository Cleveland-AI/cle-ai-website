( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	wp.blocks.registerBlockType( 'cle/team', {
		edit: window.cleServerEdit( 'cle/team', function ( props ) {
			return [
				el( c.PanelBody, { key: 'opts', title: __( 'Settings', 'cle-ai' ) },
					el( c.TextControl, { label: __( 'Label for leadership', 'cle-ai' ), value: props.attributes.leadLabel, onChange: function ( v ) { props.setAttributes( { leadLabel: v } ); } } )
				),
				window.cleArrayPanel( props, 'members', { title: __( 'People', 'cle-ai' ), itemLabel: __( 'Person', 'cle-ai' ), blank: { photo: '', name: '', role: '', lead: false, bio: '', linkedin: '', site: '', hidden: false }, fields: [
					{ key: 'name', label: __( 'Name', 'cle-ai' ) },
					{ key: 'role', label: __( 'Role', 'cle-ai' ) },
					{ key: 'lead', label: __( 'On the leadership team', 'cle-ai' ), type: 'toggle' },
					{ key: 'bio', label: __( 'Bio (two or three sentences). With a bio, LinkedIn or website, tapping the photo opens a card', 'cle-ai' ), type: 'textarea' },
					{ key: 'linkedin', label: __( 'LinkedIn URL', 'cle-ai' ) },
					{ key: 'site', label: __( 'Personal website (optional)', 'cle-ai' ) },
					{ key: 'photo', label: __( 'Photo file name (assets/team)', 'cle-ai' ) },
					{ key: 'hidden', label: __( 'Hide this person for now', 'cle-ai' ), type: 'toggle' },
				] } ),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
