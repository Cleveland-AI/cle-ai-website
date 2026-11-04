<?php
/**
 * cle/next-event: the soonest upcoming meetup_events post.
 *
 * @var array $attributes
 */

$event = cle_find_event( $attributes['match'] );
$bar   = 'bar' === $attributes['layout'];
$attrs = get_block_wrapper_attributes( [ 'class' => $bar ? 'cle-next-event--bar' : 'cle-next-event--callout' ] );

if ( ! $event ) {
	printf(
		'<div %s><p class="cle-next-event__empty">%s <a href="%s">%s</a></p></div>',
		$attrs,
		esc_html( $attributes['emptyText'] ),
		esc_url( $attributes['emptyLink'] ),
		esc_html( $attributes['emptyLinkLabel'] )
	);
	return;
}

$id    = $event->ID;
$start = cle_event_datetime( $id );
$rsvp  = cle_event_rsvp_url( $id ) ?: get_permalink( $id );
$venue = get_post_meta( $id, 'venue_name', true );
$time  = sprintf( '<time datetime="%s">%s</time>', esc_attr( $start ? $start->format( DATE_ATOM ) : '' ), esc_html( cle_event_when( $id, $bar ? 'D, M j' : 'l, F j' ) ) );
?>
<div <?php echo $attrs; ?>>
<?php if ( $bar ) : ?>
	<p class="cle-next-event__line">
		<strong><?php echo esc_html( $attributes['eyebrow'] ); ?>:</strong>
		<a href="<?php echo esc_url( get_permalink( $id ) ); ?>"><?php echo esc_html( get_the_title( $id ) ); ?></a>
		<span class="cle-next-event__meta"><?php echo $time; ?><?php echo $venue ? ' · ' . esc_html( $venue ) : ''; ?></span>
		<a class="cle-next-event__rsvp" href="<?php echo esc_url( $rsvp ); ?>"><?php echo esc_html( $attributes['rsvpLabel'] ); ?></a>
	</p>
<?php else : ?>
	<p class="cle-eyebrow"><?php echo esc_html( $attributes['eyebrow'] ); ?></p>
	<h2 class="cle-next-event__title"><a href="<?php echo esc_url( get_permalink( $id ) ); ?>"><?php echo esc_html( get_the_title( $id ) ); ?></a></h2>
	<p class="cle-next-event__meta"><?php echo $time; ?></p>
	<?php if ( cle_event_venue( $id ) ) : ?>
		<p class="cle-next-event__meta"><?php echo esc_html( cle_event_venue( $id ) ); ?></p>
	<?php endif; ?>
	<?php $excerpt = $attributes['showExcerpt'] ? get_the_excerpt( $event ) : ''; ?>
	<?php if ( $excerpt ) : ?>
		<p class="cle-next-event__excerpt"><?php echo esc_html( $excerpt ); ?></p>
	<?php endif; ?>
	<p><a class="wp-element-button" href="<?php echo esc_url( $rsvp ); ?>"><?php echo esc_html( $attributes['rsvpLabel'] ); ?></a></p>
<?php endif; ?>
</div>
