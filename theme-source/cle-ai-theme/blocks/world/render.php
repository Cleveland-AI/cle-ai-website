<?php
/**
 * cle/world: one illustration pinned behind the chapters; view.js moves a camera across it.
 * Hotspots are grouped by chapter, and finale tags lead back to each chapter. view.js
 * positions both over the stage. Dot himself walks through the picture from one chapter's
 * "stop" to the next; he lives inside the view, so he moves and zooms with it.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

$chapters = [];
foreach ( $block->inner_blocks as $inner ) {
	if ( 'cle/world-chapter' === $inner->name ) {
		$chapters[] = $inner->attributes;
	}
}
// Finale tags: one per chapter that has a tag position, labelled with the chapter title.
$tags = [];
$pos  = function ( $p ) {
	return is_array( $p ) && isset( $p['x'], $p['y'] ) ? (float) $p['x'] . ',' . (float) $p['y'] : '';
};
foreach ( $chapters as $i => $ch ) {
	$at = $pos( $ch['tag'] ?? null );
	if ( '' === $at || '' === trim( (string) ( $ch['title'] ?? '' ) ) ) {
		continue;
	}
	$phone  = $pos( $ch['tagPhone'] ?? null );
	$tags[] = [
		'i'     => $i,
		'at'    => $at,
		'phone' => '' !== $phone ? $phone : $at,
		'long'  => $ch['title'],
		'short' => '' !== trim( (string) ( $ch['tagShort'] ?? '' ) ) ? $ch['tagShort'] : $ch['title'],
	];
}
// Dot walks the city: he stands at each chapter's "stop" and hops to the next one while the
// camera flies there (view.js). Needs at least one chapter with a stop and the walker pictures.
$walks = cle_art_exists( 'dot-walker' ) && cle_art_exists( 'dot-walker-wave' )
	&& array_filter( $chapters, fn( $ch ) => isset( $ch['stop']['x'], $ch['stop']['y'] ) && is_numeric( $ch['stop']['x'] ) && is_numeric( $ch['stop']['y'] ) );
$uid  = wp_unique_id( 'cle-world-' );
$image = cle_story_image( (int) $attributes['imageId'], 'world', [
	'class'         => 'cle-world__img',
	'alt'           => $attributes['alt'],
	'loading'       => false,
	'fetchpriority' => 'high',
] );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'is-mode-' . $attributes['mode'] ] ); ?>>
	<div class="cle-world__stage">
		<div class="cle-world__view"><?php echo $image; ?><?php if ( $walks ) : ?><div class="cle-world__walker" aria-hidden="true"><?php echo cle_art_img( 'dot-walker', 0, 'cle-world__walker-side' ); ?><?php echo cle_art_img( 'dot-walker-wave', 0, 'cle-world__walker-front' ); ?></div><?php endif; ?></div>
		<div class="cle-world__cut" aria-hidden="true"></div>
		<?php foreach ( $chapters as $i => $ch ) : ?>
			<?php if ( ! empty( $ch['hotspots'] ) ) : ?>
				<div class="cle-world__hotspots cle-hotspots" data-chapter="<?php echo (int) $i; ?>" inert><?php echo cle_render_hotspots( (array) $ch['hotspots'], 'numbered', "$uid-$i" ); ?></div>
			<?php endif; ?>
		<?php endforeach; ?>
		<?php if ( $tags ) : ?>
			<div class="cle-world__tags" aria-label="<?php esc_attr_e( 'Places in the story', 'cle-ai' ); ?>" role="group" inert>
				<?php foreach ( $tags as $tag ) : ?>
					<button type="button" class="cle-world__tag" data-chapter="<?php echo (int) $tag['i']; ?>" data-at="<?php echo esc_attr( $tag['at'] ); ?>" data-at-phone="<?php echo esc_attr( $tag['phone'] ); ?>"><span class="cle-world__tag-long"><?php echo esc_html( $tag['long'] ); ?></span><span class="cle-world__tag-short"><?php echo esc_html( $tag['short'] ); ?></span></button>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</div>
	<div class="cle-world__chapters"><?php echo $content; ?></div>
</div>
