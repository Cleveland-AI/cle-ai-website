// "Upcoming events" and "Past events" query loop variations. The cleWhen flag is read by
// the query_loop_block_query_vars filter in functions.php, which adds the date meta query.
// (The editor preview lists events unfiltered; the front end is split correctly.)
( function ( wp ) {
	var __ = wp.i18n.__;

	[
		{ when: 'upcoming', title: __( 'Upcoming events', 'cle-ai' ), order: 'asc' },
		{ when: 'past', title: __( 'Past events', 'cle-ai' ), order: 'desc' },
	].forEach( function ( v ) {
		wp.blocks.registerBlockVariation( 'core/query', {
			name: 'cle-events-' + v.when,
			title: v.title,
			icon: 'calendar-alt',
			scope: [ 'inserter' ],
			isActive: function ( attrs ) {
				return !! attrs.query ? attrs.query.cleWhen === v.when : false;
			},
			attributes: {
				namespace: 'cle/events-' + v.when,
				query: { postType: 'meetup_events', perPage: 12, pages: 0, offset: 0, order: v.order, orderBy: 'date', inherit: false, cleWhen: v.when },
			},
			innerBlocks: [
				[ 'core/post-template', {}, [
					[ 'core/post-title', { isLink: true, level: 3 } ],
					[ 'cle/event-meta', { showRsvp: false } ],
				] ],
				[ 'core/query-no-results', {}, [ [ 'core/paragraph', { content: __( 'No events here yet.', 'cle-ai' ) } ] ] ],
			],
		} );
	} );
} )( window.wp );
