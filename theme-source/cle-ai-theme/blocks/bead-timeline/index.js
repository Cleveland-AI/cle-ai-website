( function ( wp ) {
	var __ = wp.i18n.__;
	wp.blocks.registerBlockType( 'cle/bead-timeline', {
		edit: window.cleServerEdit( 'cle/bead-timeline', function ( props ) {
			return [
				window.cleArrayPanel( props, 'milestones', { title: __( 'Milestones', 'cle-ai' ), itemLabel: __( 'Milestone', 'cle-ai' ), blank: { year: '', title: '', body: '' }, fields: [
					{ key: 'year', label: __( 'Year (shown under the bead)', 'cle-ai' ) },
					{ key: 'title', label: __( 'Title', 'cle-ai' ) },
					{ key: 'body', label: __( 'Story', 'cle-ai' ), type: 'textarea' },
				] } ),
			];
		} ),
		save: function () { return null; },
	} );
} )( window.wp );
