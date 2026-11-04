<?php
/**
 * cle/story: the chapter rail, the pinned stage, and the chapters.
 * Each chapter carries its own scene state; view.js applies the one on screen.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

$uid      = wp_unique_id( 'cle-story-' );
$chapters = [];
foreach ( $block->inner_blocks as $inner ) {
	if ( 'cle/story-chapter' === $inner->name ) {
		$chapters[] = $inner->attributes;
	}
}
// A deleted pattern attachment falls back to the bundled pattern.
$pattern = ( $attributes['patternId'] ? (string) wp_get_attachment_image_url( $attributes['patternId'], 'full' ) : '' ) ?: cle_story_asset_url( 'pattern' );
$tv      = (array) $attributes['tv'];
$event   = cle_find_event( $attributes['tvMatch'], true );
$pct     = fn( $v ) => (float) $v . '%';
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'is-mode-' . $attributes['mode'], 'style' => $pattern ? '--cle-pattern:url("' . esc_url( $pattern ) . '")' : '' ] ); ?>>
	<nav class="cle-story__rail" aria-label="<?php echo esc_attr( $attributes['railLabel'] ); ?>">
		<ol>
			<?php foreach ( $chapters as $i => $ch ) : ?>
				<?php if ( '' === cle_chapter_anchor( $ch ) ) { continue; } // Untitled: no anchor, no accessible name. ?>
				<li><a href="#<?php echo esc_attr( cle_chapter_anchor( $ch ) ); ?>" data-index="<?php echo (int) $i; ?>"><?php echo cle_icon( (string) ( $ch['icon'] ?? '' ) ); ?><span class="screen-reader-text"><?php echo esc_html( $ch['title'] ?? '' ); ?></span></a></li>
			<?php endforeach; ?>
		</ol>
	</nav>

	<div class="cle-story__stage">
		<div class="cle-story__camera">
			<div class="cle-story__layers" aria-hidden="true">
				<?php foreach ( array_values( (array) $attributes['layers'] ) as $i => $layer ) : ?>
					<div class="cle-story__layer" data-layer="<?php echo esc_attr( $layer['slug'] ); ?>"><?php echo cle_story_image( (int) ( $layer['imageId'] ?? 0 ), (string) $layer['slug'], $i < 2 ? [ 'loading' => false, 'fetchpriority' => 'high' ] : [] ); ?></div>
				<?php endforeach; ?>
				<div class="cle-story__layer cle-story__layer--night" data-layer="neon"><?php echo cle_story_image( (int) $attributes['nightId'], 'neon' ); ?></div>
			</div>

			<?php foreach ( $chapters as $i => $ch ) : ?>
				<?php foreach ( array_values( (array) ( $ch['bubbles'] ?? [] ) ) as $j => $bubble ) : ?>
					<p class="cle-story__bubble" data-chapter="<?php echo (int) $i; ?>" aria-hidden="true" style="<?php echo esc_attr( '--x:' . $pct( $bubble['x'] ?? 50 ) . ';--y:' . $pct( $bubble['y'] ?? 50 ) . ';--i:' . (int) $j ); ?>"><?php echo cle_icon( 'chat' ); ?><span><?php echo esc_html( $bubble['text'] ?? '' ); ?></span></p>
				<?php endforeach; ?>
				<?php if ( ! empty( $ch['pin'] ) ) : ?>
					<span class="cle-story__pin" data-chapter="<?php echo (int) $i; ?>" aria-hidden="true" style="<?php echo esc_attr( '--x:' . $pct( $ch['pin']['x'] ?? 50 ) . ';--y:' . $pct( $ch['pin']['y'] ?? 50 ) ); ?>"><?php echo cle_icon( 'pin' ); ?></span>
				<?php endif; ?>
			<?php endforeach; ?>

			<?php if ( $attributes['hotspots'] ) : ?>
				<div class="cle-story__hotspots cle-hotspots" inert><?php echo cle_render_hotspots( (array) $attributes['hotspots'], $attributes['markerStyle'], "$uid-hs" ); ?></div>
			<?php endif; ?>

			<?php if ( $event ) : ?>
				<div class="cle-story__tv" aria-hidden="true" style="<?php echo esc_attr( 'left:' . $pct( $tv['x'] ?? 0 ) . ';top:' . $pct( $tv['y'] ?? 0 ) . ';width:' . $pct( $tv['w'] ?? 0 ) . ';height:' . $pct( $tv['h'] ?? 0 ) ); ?>">
					<p class="cle-story__tv-label"><?php echo esc_html( $attributes['tvLabel'] ); ?></p>
					<p class="cle-story__tv-title"><?php echo esc_html( get_the_title( $event ) ); ?></p>
					<p class="cle-story__tv-date"><?php echo esc_html( cle_event_when( $event->ID, 'D, M j' ) ); ?></p>
					<?php if ( $attributes['sponsors'] ) : ?>
						<div class="cle-story__crawl"><div class="cle-story__crawl-track"><span><?php echo esc_html( $attributes['sponsors'] ); ?></span><span><?php echo esc_html( $attributes['sponsors'] ); ?></span></div></div>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>

		<div class="cle-story__horizon" aria-hidden="true"></div>

		<?php foreach ( (array) $attributes['foregrounds'] as $fg ) : ?>
			<div class="cle-story__fg" data-foreground="<?php echo esc_attr( $fg['slug'] ); ?>" aria-hidden="true"><?php echo cle_story_image( (int) ( $fg['imageId'] ?? 0 ), (string) $fg['slug'] ); ?></div>
		<?php endforeach; ?>
	</div>

	<div class="cle-story__chapters"><?php echo $content; ?></div>
</div>
