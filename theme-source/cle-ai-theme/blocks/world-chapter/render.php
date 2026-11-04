<?php
/**
 * cle/world-chapter: text for one beat, with its camera as data-cam JSON and a static crop
 * of the world image for the stacked (reduced-motion / no-JS) layout.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

$cam   = (array) $attributes['camera'];
$state = [
	'x'    => (float) ( $cam['x'] ?? 50 ),
	'y'    => (float) ( $cam['y'] ?? 50 ),
	'zoom' => (float) ( $cam['zoom'] ?? 1 ),
];
// Everything below this line of the picture (percent from the top) fades into the page; 0 = off.
$fade = (float) ( $attributes['fadeBelow'] ?? 0 );
$cam_data = $fade > 0 && $fade < 100 ? $state + [ 'cut' => $fade ] : $state;
$crop_cam = cle_chapter_crop_camera( $state );
$crop     = cle_story_image( (int) ( $block->context['cle/worldImageId'] ?? 0 ), 'world' );
$wrap     = [
	'class'    => 'cle-wchapter',
	'data-cam' => wp_json_encode( $cam_data ),
];
// Where Dot stands in this chapter (percent of the picture); he walks here from the last stop.
if ( isset( $attributes['stop']['x'], $attributes['stop']['y'] ) && is_numeric( $attributes['stop']['x'] ) && is_numeric( $attributes['stop']['y'] ) ) {
	$wrap['data-stop'] = (float) $attributes['stop']['x'] . ',' . (float) $attributes['stop']['y'];
}
if ( cle_chapter_anchor( $attributes ) ) {
	$wrap['id'] = cle_chapter_anchor( $attributes );
}
?>
<article <?php echo get_block_wrapper_attributes( $wrap ); ?>>
	<?php if ( $crop ) : ?>
		<div class="cle-wchapter__crop" aria-hidden="true" style="<?php echo esc_attr( sprintf( '--cam-x:%s%%;--cam-y:%s%%;--cam-z:%s', $crop_cam['x'], $crop_cam['y'], $crop_cam['zoom'] ) ); ?>"><?php echo $crop; ?></div>
	<?php endif; ?>
	<div class="cle-wchapter__body"><?php echo $content; ?></div>
</article>
