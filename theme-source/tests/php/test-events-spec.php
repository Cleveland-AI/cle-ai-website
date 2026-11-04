<?php
// cle-posts-events-spec.md: the event helpers and archive queries. Uses events from seed.php.
$id = fn( string $slug ) => get_page_by_path( $slug, OBJECT, 'meetup_events' )->ID ?? 0;

t_assert( function_exists( 'cle_event_datetime' ) && function_exists( 'cle_event_is_past' ), 'the spec helpers exist' );
t_assert( 'America/New_York' === wp_timezone()->getName(), 'the test site runs in Cleveland time (Settings → General)' );

// DST: October is EDT (-04:00), December is EST (-05:00), from the same 12-hour fields.
$oct = cle_event_datetime( $id( 'october-workshop' ) );
$dec = cle_event_datetime( $id( 'cle-ai-and-data-monthly-social-at-happy-dog-december' ) );
t_assert( $oct && '2026-10-22T10:00:00-04:00' === $oct->format( DATE_ATOM ), 'an October event is 10:00 EDT' );
t_assert( $dec && '2026-12-10T18:00:00-05:00' === $dec->format( DATE_ATOM ), 'a December event is 6:00 PM EST' );
t_assert( null === cle_event_datetime( $id( 'pop-up-coffee-chat' ), 'end' ), 'a missing end time gives null, not a bogus date' );

// Long date format from the spec.
t_assert( 'Monday, 28 September 2026, 5:00 – 8:30 PM' === ( function () use ( $id ) {
	$e = $id( 'mega-meetup-at-the-museum' );
	$old = get_post_meta( $e, 'event_start_date', true );
	update_post_meta( $e, 'event_start_date', '2026-09-28' );
	update_post_meta( $e, 'event_end_date', '2026-09-28' );
	$out = cle_event_when_long( $e );
	update_post_meta( $e, 'event_start_date', $old );
	update_post_meta( $e, 'event_end_date', $old );
	return $out;
} )(), 'same-day events show the date once and PM once' );
t_assert( 'Thursday, 22 October 2026, 10:00 AM – 1:00 PM' === cle_event_when_long( $id( 'october-workshop' ) ), 'AM and PM both show when they differ' );
t_assert( str_ends_with( cle_event_when_long( $id( 'pop-up-coffee-chat' ) ), ', 5:00 PM' ) && ! str_contains( cle_event_when_long( $id( 'pop-up-coffee-chat' ) ), '–' ), 'no end time shows the start only' );

// Past = ended; today's late event is not past yet, and sits in the Upcoming query.
t_assert( ! cle_event_is_past( $id( 'tonight-lightning-talks' ) ), 'an event later today is not past' );
t_assert( cle_event_is_past( $id( 'summer-in-the-flats' ) ), 'an event from two months ago is past' );
$up   = wp_list_pluck( get_posts( cle_event_query_args( 'upcoming' ) + [ 'posts_per_page' => -1 ] ), 'post_name' );
$past = wp_list_pluck( get_posts( cle_event_query_args( 'past' ) + [ 'posts_per_page' => -1 ] ), 'post_name' );
t_assert( 'tonight-lightning-talks' === ( $up[0] ?? '' ), 'Upcoming is soonest first, starting with today' );
t_assert( ! in_array( 'tonight-lightning-talks', $past, true ), 'today is never under Past' );
$dates = array_map( fn( $p ) => get_post_meta( $p->ID, 'event_start_date', true ), get_posts( cle_event_query_args( 'past' ) + [ 'posts_per_page' => -1 ] ) );
$sorted = $dates;
rsort( $sorted );
t_assert( $dates === $sorted && count( $dates ) > 12, 'Past is most recent first, with more than one page of events' );

// Maps: lat/lon verbatim when both set, otherwise the encoded address.
t_assert( 'https://www.google.com/maps/search/?api=1&query=41.51152,-81.612877' === cle_event_map_url( $id( 'mega-meetup-at-the-museum' ) ), 'the map link uses lat,lon' );
t_assert( str_ends_with( cle_event_map_url( $id( 'hike-north-chagrin' ) ), rawurlencode( '3037 SOM Center Road, Willoughby Hills, OH 44094' ) ), 'without coordinates the map link uses the address' );
t_assert( '' === cle_event_map_url( $id( 'online-reading-group' ) ), 'no venue data, no map link' );

// Event details block, as used on the event page.
$render = function ( int $post_id, array $attrs ) {
	$GLOBALS['post'] = get_post( $post_id );
	setup_postdata( $GLOBALS['post'] );
	return do_blocks( '<!-- wp:cle/event-meta ' . wp_json_encode( $attrs ) . ' /-->' );
};
$page = [ 'showStatus' => true, 'dateStyle' => 'long' ];
$mega = $render( $id( 'mega-meetup-at-the-museum' ), $page );
t_assert( str_contains( $mega, '>Upcoming<' ) && str_contains( $mega, 'RSVP on Meetup' ), 'an upcoming event shows its status and RSVP' );
t_assert( strpos( $mega, 'cle-event-meta__status' ) < strpos( $mega, 'cle-event-meta__when' ) && strpos( $mega, 'cle-event-meta__when' ) < strpos( $mega, 'cle-event-meta__where' ) && strpos( $mega, 'cle-event-meta__where' ) < strpos( $mega, 'cle-event-meta__rsvp' ), 'status, date, venue, RSVP, in that order' );
t_assert( str_contains( $mega, '>Cleveland Museum of Natural History<' ) && str_contains( $mega, 'query=41.51152,-81.612877">1 Wade Oval Drive, Cleveland, OH 44106</a>' ), 'venue name, then the address linked to the map' );
$old = $render( $id( 'summer-in-the-flats' ), $page );
t_assert( str_contains( $old, '>Past<' ) && ! str_contains( $old, 'wp-element-button' ) && ! str_contains( $old, 'meetup.com' ), 'a past event shows Past and no RSVP button at all' );
$bare = $render( $id( 'online-reading-group' ), $page );
t_assert( ! str_contains( $bare, 'cle-event-meta__where' ), 'no venue data, no venue block' );
$foot = [ 'showDate' => false, 'showVenue' => false, 'showRsvp' => false, 'showOrganizer' => true, 'showBackLink' => true ];
t_assert( str_contains( $render( $id( 'mega-meetup-at-the-museum' ), $foot ), 'Organized by <a href="https://www.meetup.com/cleveland-ai-data/">CLE AI &amp; DATA</a>' ), 'the organizer shows when set' );
$nofoot = $render( $id( 'monthly-social-at-happy-dog' ), $foot );
t_assert( ! str_contains( $nofoot, 'Organized by' ) && str_contains( $nofoot, 'href="' . esc_url( get_post_type_archive_link( 'meetup_events' ) ) . '"' ), 'no organizer label without a name; the back link uses the archive URL' );
t_assert( str_contains( get_post_type_archive_link( 'meetup_events' ), '/index.php/meetup-event/' ), 'the archive link keeps /index.php/meetup-event/' );
wp_reset_postdata();
