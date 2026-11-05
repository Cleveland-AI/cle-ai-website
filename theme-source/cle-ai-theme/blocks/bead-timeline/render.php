<?php
/**
 * cle/bead-timeline: one clay bead per milestone on a cord. Each bead is a button that opens
 * its story below the cord; the latest is open to start (or "open", counting from 0).
 * Without JavaScript every story shows as a list.
 *
 * @var array $attributes
 */

$items = array_values( array_filter( (array) $attributes['milestones'], fn( $m ) => '' !== trim( (string) ( $m['year'] ?? '' ) ) ) );
if ( ! $items ) {
	return;
}
$colors = [ 'accent', 'coral', 'yellow', 'green', 'ink', 'pale-blue' ];
$open   = (int) $attributes['open'];
$open   = $open >= 0 && $open < count( $items ) ? $open : count( $items ) - 1;
$uid    = wp_unique_id( 'cle-beads-' );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-beads' ] ); ?>>
	<ol class="cle-beads__cord">
		<?php foreach ( $items as $i => $m ) : ?>
			<li>
				<button type="button" class="cle-beads__bead" id="<?php echo esc_attr( "$uid-b$i" ); ?>" aria-expanded="<?php echo $i === $open ? 'true' : 'false'; ?>" aria-controls="<?php echo esc_attr( "$uid-p$i" ); ?>" style="--c:var(--wp--preset--color--<?php echo esc_attr( $colors[ $i % count( $colors ) ] ); ?>)">
					<span class="cle-beads__ball" aria-hidden="true"></span>
					<span class="cle-beads__year"><?php echo esc_html( $m['year'] ); ?></span>
					<span class="screen-reader-text">: <?php echo esc_html( (string) ( $m['title'] ?? '' ) ); ?></span>
				</button>
			</li>
		<?php endforeach; ?>
	</ol>
	<div class="cle-beads__stories">
		<?php foreach ( $items as $i => $m ) : ?>
			<section class="cle-beads__story" id="<?php echo esc_attr( "$uid-p$i" ); ?>" aria-labelledby="<?php echo esc_attr( "$uid-h$i" ); ?>"<?php echo $i === $open ? '' : ' data-closed'; ?>>
				<p class="cle-beads__when"><?php echo esc_html( $m['year'] ); ?></p>
				<h3 id="<?php echo esc_attr( "$uid-h$i" ); ?>"><?php echo esc_html( (string) ( $m['title'] ?? '' ) ); ?></h3>
				<?php if ( ! empty( $m['body'] ) ) : ?>
					<p><?php echo esc_html( $m['body'] ); ?></p>
				<?php endif; ?>
			</section>
		<?php endforeach; ?>
	</div>
</div>
