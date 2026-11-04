<?php
$winter = get_page_by_path( 'winter-meetup-est-check', OBJECT, 'meetup_events' );
t_assert( (bool) $winter, 'seeded winter event exists' );
t_assert( '-05:00' === cle_event_datetime( $winter->ID )->format( 'P' ), 'February event time is EST' );
$up = cle_events( 'upcoming', 10 );
t_assert( count( $up ) >= 2, 'at least two upcoming events' );
t_assert(
	get_post_meta( $up[0]->ID, 'event_start_date', true ) <= get_post_meta( $up[1]->ID, 'event_start_date', true ),
	'upcoming events are sorted soonest first'
);
