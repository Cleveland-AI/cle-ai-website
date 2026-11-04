<?php
/**
 * cle/hotspot-scene: intro, an image with percentage-positioned markers, and inner blocks.
 * Nothing venue-specific lives here; it is all block attributes.
 *
 * @var array  $attributes
 * @var string $content
 */

$spots = array_values( (array) $attributes['hotspots'] );
$image = empty( $attributes['imageId'] ) ? '' : wp_get_attachment_image(
	$attributes['imageId'],
	'full',
	false,
	[ 'class' => 'cle-scene__img', 'sizes' => '(min-width: 1140px) 1140px, 100vw', 'decoding' => 'async' ]
	+ ( '' !== $attributes['imageAlt'] ? [ 'alt' => $attributes['imageAlt'] ] : [] )
);
?>
<section <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-scene cle-scene--' . $attributes['markerStyle'] ] ); ?>>
	<?php if ( $attributes['heading'] || $attributes['intro'] ) : ?>
		<div class="cle-scene__intro">
			<?php if ( $attributes['heading'] ) : ?>
				<h2><?php echo wp_kses_post( $attributes['heading'] ); ?></h2>
			<?php endif; ?>
			<?php if ( $attributes['intro'] ) : ?>
				<p><?php echo wp_kses_post( $attributes['intro'] ); ?></p>
			<?php endif; ?>
		</div>
	<?php endif; ?>

	<?php if ( $image ) : ?>
		<figure class="cle-scene__frame cle-hotspots">
			<?php echo $image; ?>
			<?php echo cle_render_hotspots( $spots, $attributes['markerStyle'], wp_unique_id( 'cle-scene-' ) ); ?>
		</figure>

		<?php if ( $spots ) : ?>
			<ol class="cle-scene__list">
				<?php foreach ( $spots as $spot ) : ?>
					<li><strong><?php echo wp_kses_post( $spot['title'] ?? '' ); ?></strong> <?php echo wp_kses_post( $spot['body'] ?? '' ); ?></li>
				<?php endforeach; ?>
			</ol>
		<?php endif; ?>
	<?php endif; ?>

	<?php if ( trim( $content ) ) : ?>
		<div class="cle-scene__actions"><?php echo $content; ?></div>
	<?php endif; ?>
</section>
