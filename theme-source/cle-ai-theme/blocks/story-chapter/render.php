<?php
/**
 * cle/story-chapter: one beat of the story. Its scene state rides along as data-chapter JSON.
 *
 * @var array    $attributes
 * @var string   $content
 * @var WP_Block $block
 */

$state = cle_chapter_state( $attributes );
$cam   = cle_chapter_crop_camera( $state['camera'] );
$crop  = $state['night']
	? cle_story_image( (int) ( $block->context['cle/nightId'] ?? 0 ), 'neon' )
	: cle_story_image( (int) ( $block->context['cle/compositeId'] ?? 0 ), 'composite' );
$wrap  = [
	'class'        => 'cle-chapter' . ( $state['night'] ? ' is-night-chapter' : '' ) . ( $state['pattern'] ? ' is-pattern-chapter' : '' ),
	'data-chapter' => wp_json_encode( $state ),
];
if ( cle_chapter_anchor( $attributes ) ) {
	$wrap['id'] = cle_chapter_anchor( $attributes );
}
?>
<article <?php echo get_block_wrapper_attributes( $wrap ); ?>>
	<?php if ( $crop && ! $state['pattern'] ) : ?>
		<div class="cle-chapter__crop" aria-hidden="true" style="<?php echo esc_attr( sprintf( '--cam-x:%s%%;--cam-y:%s%%;--cam-z:%s', $cam['x'], $cam['y'], $cam['zoom'] ) ); ?>"><?php echo $crop; ?></div>
	<?php endif; ?>
	<?php if ( $state['icon'] ) : ?>
		<span class="cle-chapter__icon"><?php echo cle_icon( $state['icon'] ); ?></span>
	<?php endif; ?>
	<div class="cle-chapter__body"><?php echo $content; ?></div>
</article>
