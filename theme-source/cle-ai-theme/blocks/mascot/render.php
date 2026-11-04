<?php
/**
 * cle/mascot: Dot in one of his poses (assets/illustrations/dot-<pose>.webp). Decorative, so
 * the image has empty alt text; whatever Dot "says" belongs in the text next to him.
 * The peek pose slides up into view when it scrolls in (view.js). A pose with an animated
 * version (dot-<pose>-anim.webp) plays it, unless the visitor prefers reduced motion.
 *
 * @var array $attributes
 */

$poses = [ 'peek', 'lost', 'sleep', 'stage', 'social', 'workshop', 'hike', 'search', 'welcome' ];
$pose  = in_array( $attributes['pose'], $poses, true ) ? $attributes['pose'] : 'peek';
$art   = "dot-$pose";
// Winter: from December to February the peeking Dot wears his hat and scarf.
if ( 'peek' === $pose && in_array( (int) wp_date( 'n' ), [ 12, 1, 2 ], true ) && cle_art_exists( 'dot-peek-winter' ) ) {
	$art = 'dot-peek-winter';
}
if ( ! cle_art_exists( $art ) ) {
	return;
}
$width = max( 80, min( 600, (int) $attributes['width'] ) );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => "cle-dot cle-dot--$pose" ] ); ?> style="--dot-w:<?php echo (int) $width; ?>px">
	<?php if ( cle_art_exists( "$art-anim" ) ) : ?>
		<?php // Animated loop (dot-<pose>-anim.webp) for everyone except visitors who prefer reduced motion, who get the still. ?>
		<picture>
			<source srcset="<?php echo esc_url( cle_art_url( "$art-anim" ) ); ?>" media="(prefers-reduced-motion: no-preference)" type="image/webp">
			<?php echo cle_art_img( $art, 0, 'cle-dot__img' ); ?>
		</picture>
	<?php else : ?>
		<?php echo cle_art_img( $art, 0, 'cle-dot__img' ); ?>
	<?php endif; ?>
</div>
