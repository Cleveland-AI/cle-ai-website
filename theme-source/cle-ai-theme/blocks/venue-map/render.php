<?php
/**
 * cle/venue-map: pins on a clay map (assets/illustrations/<art>.webp), each with the next
 * upcoming event whose title contains the pin's "match" word. The list underneath carries the
 * same text for everyone, and is all that shows until the map image ships.
 *
 * @var array $attributes
 */

$pins = array_values( array_filter( (array) $attributes['pins'], fn( $p ) => '' !== trim( (string) ( $p['title'] ?? '' ) ) ) );
if ( ! $pins ) {
	return;
}
$spots = [];
foreach ( $pins as $pin ) {
	$event = '' !== trim( (string) ( $pin['match'] ?? '' ) ) ? cle_find_event( (string) $pin['match'] ) : null;
	$next  = $event
		/* translators: 1: event link, 2: date. */
		? sprintf( __( 'Next: %1$s, %2$s.', 'cle-ai' ), sprintf( '<a href="%s">%s</a>', esc_url( get_permalink( $event ) ), esc_html( get_the_title( $event ) ) ), esc_html( cle_event_when( $event->ID, 'D, M j' ) ) )
		: esc_html__( 'Nothing on the calendar here yet.', 'cle-ai' );
	$spots[] = [
		'x'     => (float) ( $pin['x'] ?? 50 ),
		'y'     => (float) ( $pin['y'] ?? 50 ),
		'title' => esc_html( $pin['title'] ),
		'body'  => esc_html( (string) ( $pin['place'] ?? '' ) ) . ' ' . $next,
	];
}
$has_map = cle_art_exists( (string) $attributes['art'] );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-map' ] ); ?>>
	<?php if ( $has_map ) : ?>
		<figure class="cle-map__frame cle-hotspots">
			<?php echo cle_art_img( (string) $attributes['art'], 0, 'cle-map__img', (string) $attributes['alt'] ); ?>
			<?php echo cle_render_hotspots( $spots, 'numbered', wp_unique_id( 'cle-map-' ) ); ?>
		</figure>
	<?php endif; ?>
	<ol class="cle-map__list<?php echo $has_map ? '' : ' is-only'; ?>">
		<?php foreach ( $spots as $spot ) : ?>
			<li><strong><?php echo $spot['title']; ?></strong> <span><?php echo wp_kses_post( $spot['body'] ); ?></span></li>
		<?php endforeach; ?>
	</ol>
</div>
