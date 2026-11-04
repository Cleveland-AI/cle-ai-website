<?php
/**
 * cle/coming-up: small cards for the next matching events and the latest post, so the first
 * screen answers "what's on?". Each event card takes the soonest upcoming event whose title
 * contains its word, or else the soonest one not already shown.
 *
 * @var array $attributes
 */

$chips = [ 'blue', 'coral', 'yellow', 'green' ]; // logo colours, in card order
$cards = [];
$used  = [];
$next  = cle_events( 'upcoming', 50 );

foreach ( (array) $attributes['events'] as $want ) {
	$match = trim( (string) ( $want['match'] ?? '' ) );
	$event = null;
	foreach ( $next as $candidate ) {
		if ( ! isset( $used[ $candidate->ID ] ) && ( '' === $match || false !== stripos( $candidate->post_title, $match ) ) ) {
			$event = $candidate;
			break;
		}
	}
	if ( ! $event ) {
		foreach ( $next as $candidate ) {
			if ( ! isset( $used[ $candidate->ID ] ) ) {
				$event = $candidate;
				break;
			}
		}
	}
	if ( ! $event ) {
		continue;
	}
	$used[ $event->ID ] = true;
	$start              = cle_event_datetime( $event->ID );
	$venue              = trim( (string) get_post_meta( $event->ID, 'venue_name', true ) );
	$cards[]            = [
		'label' => (string) ( $want['label'] ?? '' ),
		'title' => get_the_title( $event ),
		'url'   => get_permalink( $event ),
		'ts'    => $start ? $start->getTimestamp() : 0,
		'tz'    => $start ? $start->getTimezone() : null,
		'meta'  => implode( ' · ', array_filter( [ $start ? wp_date( 'D g:i a', $start->getTimestamp(), $start->getTimezone() ) : '', $venue ] ) ),
	];
}

if ( $attributes['showPost'] ) {
	$post = get_posts( [ 'post_type' => 'post', 'posts_per_page' => 1, 'no_found_rows' => true ] )[0] ?? null;
	if ( $post ) {
		$cards[] = [
			'label' => (string) $attributes['postLabel'],
			'title' => get_the_title( $post ),
			'url'   => get_permalink( $post ),
			'ts'    => (int) get_post_timestamp( $post ),
			'tz'    => wp_timezone(),
			'meta'  => '',
		];
	}
}

if ( ! $cards ) {
	// Nothing coming up: Dot naps, and the visitor gets pointed to Meetup.
	printf(
		'<section %s aria-label="%s"><div class="cle-coming__empty">%s<p>%s <a href="https://www.meetup.com/cleveland-ai-data/">%s</a></p></div></section>',
		get_block_wrapper_attributes(),
		esc_attr__( 'Coming up', 'cle-ai' ),
		cle_art_exists( 'dot-sleep' ) ? cle_art_img( 'dot-sleep', 0, 'cle-coming__dot' ) : '',
		esc_html__( 'Nothing on the calendar right now.', 'cle-ai' ),
		esc_html__( 'Check the Meetup group.', 'cle-ai' )
	);
	return;
}
?>
<section <?php echo get_block_wrapper_attributes(); ?> aria-label="<?php esc_attr_e( 'Coming up', 'cle-ai' ); ?>">
	<ul class="cle-coming__row">
		<?php foreach ( $cards as $i => $card ) : ?>
			<li class="cle-coming__card" style="--chip:var(--wp--preset--color--<?php echo esc_attr( $chips[ $i % count( $chips ) ] ); ?>)">
				<a class="cle-coming__link" href="<?php echo esc_url( $card['url'] ); ?>">
					<?php if ( $card['ts'] ) : ?>
						<time class="cle-coming__date" datetime="<?php echo esc_attr( wp_date( 'Y-m-d', $card['ts'], $card['tz'] ) ); ?>">
							<span class="cle-coming__month"><?php echo esc_html( wp_date( 'M', $card['ts'], $card['tz'] ) ); ?></span>
							<span class="cle-coming__day"><?php echo esc_html( wp_date( 'j', $card['ts'], $card['tz'] ) ); ?></span>
						</time>
					<?php endif; ?>
					<span class="cle-coming__text">
						<?php if ( '' !== $card['label'] ) : ?>
							<span class="cle-coming__label"><?php echo esc_html( $card['label'] ); ?></span>
						<?php endif; ?>
						<span class="cle-coming__title"><?php echo esc_html( $card['title'] ); ?></span>
						<?php if ( '' !== $card['meta'] ) : ?>
							<span class="cle-coming__meta"><?php echo esc_html( $card['meta'] ); ?></span>
						<?php endif; ?>
					</span>
				</a>
			</li>
		<?php endforeach; ?>
	</ul>
</section>
