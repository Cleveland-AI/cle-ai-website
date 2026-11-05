<?php
/**
 * cle/first-night: five moments of a social, for someone who has never been. On wide screens the
 * picture is pinned beside the moments and changes as each one scrolls into view (view.js sets
 * data-on); on phones and under reduced motion each moment shows its own picture. The last
 * moment carries the next social.
 *
 * @var array $attributes
 */

// Hidden ("Show on the site" off): nothing on the page, but the block keeps its content in the
// editor, ready to switch back on.
if ( empty( $attributes['visible'] ) ) {
	return;
}
$steps = array_values( array_filter( (array) $attributes['steps'], fn( $s ) => '' !== trim( (string) ( $s['title'] ?? '' ) ) ) );
if ( ! $steps ) {
	return;
}
$art = fn( array $s, int $i, string $class ) => cle_art_img( cle_art_exists( (string) ( $s['art'] ?? '' ) ) ? $s['art'] : (string) ( $s['fallback'] ?? '' ), $i, $class );
$uid = wp_unique_id( 'cle-night-' );
?>
<section <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-night', 'aria-labelledby' => "$uid-h" ] ); ?> data-on="0">
	<div class="cle-night__head">
		<?php if ( '' !== $attributes['eyebrow'] ) : ?>
			<p class="is-style-eyebrow"><?php echo esc_html( $attributes['eyebrow'] ); ?></p>
		<?php endif; ?>
		<h2 id="<?php echo esc_attr( "$uid-h" ); ?>"><?php echo esc_html( $attributes['heading'] ); ?></h2>
	</div>
	<div class="cle-night__body">
		<div class="cle-night__stage" aria-hidden="true">
			<div class="cle-night__frames">
				<?php foreach ( $steps as $i => $s ) : ?>
					<figure class="cle-night__frame" data-step="<?php echo (int) $i; ?>"><?php echo $art( $s, $i, 'cle-night__art' ); ?><figcaption><?php echo esc_html( (string) ( $s['time'] ?? '' ) ); ?></figcaption></figure>
				<?php endforeach; ?>
			</div>
			<ol class="cle-night__dots">
				<?php foreach ( $steps as $i => $s ) : ?>
					<li data-step="<?php echo (int) $i; ?>"></li>
				<?php endforeach; ?>
			</ol>
		</div>
		<ol class="cle-night__steps">
			<?php foreach ( $steps as $i => $s ) : ?>
				<li class="cle-night__step" data-step="<?php echo (int) $i; ?>">
					<div class="cle-night__own" aria-hidden="true"><?php echo $art( $s, $i, 'cle-night__art' ); ?></div>
					<p class="cle-night__time"><?php echo esc_html( (string) ( $s['time'] ?? '' ) ); ?></p>
					<h3><?php echo esc_html( $s['title'] ); ?></h3>
					<?php if ( ! empty( $s['text'] ) ) : ?>
						<p><?php echo esc_html( $s['text'] ); ?></p>
					<?php endif; ?>
					<?php if ( $i === count( $steps ) - 1 && '' !== $attributes['match'] ) : ?>
						<?php echo do_blocks( '<!-- wp:cle/next-event {"match":"' . esc_attr( $attributes['match'] ) . '","eyebrow":"Next social","showExcerpt":false,"emptyText":"Check Meetup for the next date.","emptyLinkLabel":"See the Meetup group"} /-->' ); ?>
					<?php endif; ?>
				</li>
			<?php endforeach; ?>
		</ol>
	</div>
</section>
