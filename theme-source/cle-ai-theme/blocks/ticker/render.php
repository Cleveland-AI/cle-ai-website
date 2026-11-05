<?php
/**
 * cle/ticker: recent posts and/or upcoming events on a CSS-animated, duplicated track.
 *
 * @var array $attributes
 */

$count = max( 1, min( 20, (int) $attributes['count'] ) );
$items = [];

if ( 'posts' !== $attributes['source'] ) {
	foreach ( cle_events( 'upcoming', $count ) as $p ) {
		$start   = cle_event_datetime( $p->ID );
		$items[] = [
			'url'   => get_permalink( $p ),
			'title' => trim( $attributes['eventPrefix'] . ' ' . get_the_title( $p ) ),
			'date'  => $start ? wp_date( 'M j', $start->getTimestamp(), $start->getTimezone() ) : '',
			'iso'   => $start ? $start->format( DATE_ATOM ) : '',
			'thumb' => get_post_thumbnail_id( $p ),
		];
	}
}
if ( 'events' !== $attributes['source'] ) {
	foreach ( get_posts( [ 'posts_per_page' => $count, 'no_found_rows' => true, 'ignore_sticky_posts' => true ] ) as $p ) {
		$items[] = [
			'url'   => get_permalink( $p ),
			'title' => get_the_title( $p ),
			'date'  => get_the_date( 'M j', $p ),
			'iso'   => get_the_date( DATE_ATOM, $p ),
			'thumb' => get_post_thumbnail_id( $p ),
		];
	}
}
$items = array_slice( $items, 0, $count );
if ( ! $items ) {
	return;
}

// The second copy makes the loop seamless; it is hidden from screen readers and the tab order.
$list = function ( bool $clone ) use ( $items, $attributes ): string {
	$out = '<ul class="cle-ticker__list"' . ( $clone ? ' aria-hidden="true"' : '' ) . '>';
	foreach ( $items as $item ) {
		$thumb = $attributes['showThumbnails'] && $item['thumb']
			? wp_get_attachment_image( $item['thumb'], 'thumbnail', false, [ 'class' => 'cle-ticker__thumb', 'alt' => '' ] )
			: '';
		$out  .= sprintf(
			'<li><a href="%s"%s>%s<span>%s</span> <time class="cle-ticker__date" datetime="%s">%s</time></a></li>',
			esc_url( $item['url'] ),
			$clone ? ' tabindex="-1"' : '',
			$thumb,
			esc_html( $item['title'] ),
			esc_attr( $item['iso'] ),
			esc_html( $item['date'] )
		);
	}
	return $out . '</ul>';
};

$wrapper = get_block_wrapper_attributes( [
	'role'       => 'region',
	'aria-label' => $attributes['label'] ?: __( 'Ticker', 'cle-ai' ),
	'style'      => '--cle-ticker-duration:' . max( 10, (int) $attributes['duration'] ) . 's',
] );
?>
<div <?php echo $wrapper; ?>>
	<?php if ( $attributes['label'] ) : ?>
		<p class="cle-ticker__label cle-eyebrow"><?php echo esc_html( $attributes['label'] ); ?></p>
	<?php endif; ?>
	<div class="cle-ticker__viewport">
		<div class="cle-ticker__track"><?php echo $list( false ) . $list( true ); ?></div>
	</div>
	<button type="button" class="cle-ticker__toggle" data-play="<?php echo esc_attr( $attributes['playLabel'] ); ?>"><?php echo esc_html( $attributes['pauseLabel'] ); ?></button>
</div>
