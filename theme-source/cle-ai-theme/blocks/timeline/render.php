<?php
/**
 * cle/timeline: milestones (block attributes) plus meetup_events, placed by real date.
 * The axis runs from startYear to next year; sparse stretches stay visibly empty.
 *
 * @var array $attributes
 */

$tz    = wp_timezone();
$first = (int) $attributes['startYear'];
$last  = (int) wp_date( 'Y', null, $tz ) + 1;
$from  = ( new DateTimeImmutable( "$first-01-01", $tz ) )->getTimestamp();
$span  = ( new DateTimeImmutable( ( $last + 1 ) . '-01-01', $tz ) )->getTimestamp() - $from;

$items = [];
foreach ( (array) $attributes['milestones'] as $m ) {
	$date = DateTimeImmutable::createFromFormat( '!Y-m-d', (string) ( $m['date'] ?? '' ), $tz );
	if ( $date ) {
		$items[ $date->format( 'Y-m-d' ) ] = $m + [ 'time' => $date ];
	}
}
if ( $attributes['includeEvents'] ) {
	foreach ( array_merge( cle_events( 'past', 200 ), cle_events( 'upcoming', 20 ) ) as $p ) {
		$start = cle_event_datetime( $p->ID );
		$key   = $start ? $start->format( 'Y-m-d' ) : '';
		if ( $key && ! isset( $items[ $key ] ) ) {
			$items[ $key ] = [
				'time'  => $start,
				'label' => wp_date( 'F Y', $start->getTimestamp(), $tz ),
				'title' => get_the_title( $p ),
				'tag'   => $attributes['eventLabel'],
				'url'   => get_permalink( $p ),
				'event' => true,
			];
		}
	}
}
ksort( $items );

$pos = fn( int $ts ) => round( max( 0, min( 1, ( $ts - $from ) / $span ) ), 5 );
?>
<section <?php echo get_block_wrapper_attributes( [ 'style' => '--cle-tl-years:' . ( $last - $first + 1 ) ] ); ?>>
	<div class="cle-timeline__pin">
		<div class="cle-timeline__playhead" aria-hidden="true"></div>
		<div class="cle-timeline__track">
			<ol class="cle-timeline__axis" aria-hidden="true">
				<?php for ( $y = $first; $y <= $last; $y++ ) : ?>
					<li style="--x:<?php echo esc_attr( $pos( ( new DateTimeImmutable( "$y-01-01", $tz ) )->getTimestamp() ) ); ?>"><?php echo (int) $y; ?></li>
				<?php endfor; ?>
			</ol>
			<ol class="cle-timeline__items">
				<?php foreach ( $items as $item ) : ?>
					<?php
					$classes = 'cle-timeline__item' . ( ! empty( $item['major'] ) ? ' is-major' : '' ) . ( ! empty( $item['next'] ) ? ' is-next' : '' ) . ( ! empty( $item['event'] ) ? ' is-event' : '' );
					$x       = $pos( $item['time']->getTimestamp() );
					?>
					<li class="<?php echo esc_attr( $classes ); ?>" data-x="<?php echo esc_attr( $x ); ?>" style="--x:<?php echo esc_attr( $x ); ?>">
						<span class="cle-timeline__marker"></span>
						<div class="cle-timeline__card">
							<p class="cle-timeline__date">
								<time datetime="<?php echo esc_attr( $item['time']->format( 'Y-m-d' ) ); ?>"><?php echo esc_html( $item['label'] ?? '' ); ?></time>
								<?php if ( ! empty( $item['tag'] ) ) : ?>
									<span class="cle-timeline__tag"><?php echo esc_html( $item['tag'] ); ?></span>
								<?php endif; ?>
							</p>
							<h3 class="cle-timeline__title">
								<?php if ( ! empty( $item['url'] ) ) : ?>
									<a href="<?php echo esc_url( $item['url'] ); ?>"><?php echo esc_html( $item['title'] ); ?></a>
								<?php else : ?>
									<?php echo wp_kses_post( $item['title'] ?? '' ); ?>
								<?php endif; ?>
							</h3>
							<?php if ( ! empty( $item['body'] ) ) : ?>
								<p class="cle-timeline__body"><?php echo wp_kses_post( $item['body'] ); ?></p>
							<?php endif; ?>
						</div>
					</li>
				<?php endforeach; ?>
			</ol>
		</div>
	</div>
</section>
