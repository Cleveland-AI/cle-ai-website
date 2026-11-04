<?php
/**
 * cle/event-meta: details for the current meetup_events post, each part optional and each
 * meta field guarded (imported events often have partial venue data). "Past" means the event
 * has ended (cle_event_is_past); past events never show an RSVP button.
 *
 * @var array    $attributes
 * @var WP_Block $block
 */

$id = (int) ( $block->context['postId'] ?? get_the_ID() );
if ( ! $id || 'meetup_events' !== get_post_type( $id ) ) {
	return;
}

$past  = cle_event_is_past( $id );
$start = cle_event_datetime( $id );
$parts = [];

if ( $attributes['showStatus'] ) {
	$parts[] = sprintf( '<p class="cle-event-meta__status"><span class="cle-eyebrow">%s</span></p>', esc_html( $past ? $attributes['statusPast'] : $attributes['statusUpcoming'] ) );
}

if ( $attributes['showDate'] && $start ) {
	$when    = 'long' === $attributes['dateStyle'] ? cle_event_when_long( $id ) : cle_event_when( $id, 'l, F j, Y' );
	$parts[] = sprintf( '<p class="cle-event-meta__when"><time datetime="%s">%s</time></p>', esc_attr( $start->format( DATE_ATOM ) ), esc_html( $when ) );
}

if ( $attributes['showVenue'] ) {
	$name    = cle_event_meta( $id, 'venue_name' );
	$address = cle_event_address( $id );
	if ( 'name' === $attributes['venueStyle'] ) {
		$label = $name ?: cle_event_meta( $id, 'venue_city' );
		if ( '' !== $label ) {
			$parts[] = sprintf( '<p class="cle-event-meta__where">%s</p>', esc_html( $label ) );
		}
	} elseif ( '' !== $name || '' !== $address ) {
		$map  = cle_event_map_url( $id );
		$line = '' !== $address ? $address : $name;
		$html = '<div class="cle-event-meta__where">';
		if ( '' !== $name && '' !== $address ) {
			$html .= sprintf( '<p class="cle-event-meta__venue">%s</p>', esc_html( $name ) );
		}
		$html   .= sprintf(
			'<p class="cle-event-meta__address">%s</p></div>',
			$map ? sprintf( '<a href="%s">%s</a>', esc_url( $map ), esc_html( $line ) ) : esc_html( $line )
		);
		$parts[] = $html;
	}
}

$rsvp = cle_event_rsvp_url( $id );
if ( $attributes['showRsvp'] && ! $past && $rsvp ) {
	$parts[] = sprintf( '<p class="cle-event-meta__rsvp"><a class="wp-element-button" href="%s">%s</a></p>', esc_url( $rsvp ), esc_html( $attributes['rsvpLabel'] ) );
}

$organizer = cle_event_meta( $id, 'organizer_name' );
if ( $attributes['showOrganizer'] && '' !== $organizer ) {
	$org_url = cle_event_meta( $id, 'organizer_url' );
	$parts[] = sprintf(
		'<p class="cle-event-meta__organizer">%s %s</p>',
		esc_html( $attributes['organizerLabel'] ),
		$org_url ? sprintf( '<a href="%s">%s</a>', esc_url( $org_url ), esc_html( $organizer ) ) : esc_html( $organizer )
	);
}

$archive = get_post_type_archive_link( 'meetup_events' );
if ( $attributes['showBackLink'] && $archive ) {
	$parts[] = sprintf( '<p class="cle-event-meta__back"><a href="%s">%s</a></p>', esc_url( $archive ), esc_html( $attributes['backLabel'] ) );
}

if ( ! $parts ) {
	return;
}
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => $past ? 'is-past' : 'is-upcoming' ] ); ?>>
	<?php echo implode( "\n\t", $parts ); ?>
</div>
