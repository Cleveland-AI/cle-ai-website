<?php
/**
 * cle/logo: the four-dot mark as CSS shapes inside a home link. Animation lives in
 * style.css (drop-in, hover jiggle) and view.js (lean towards the pointer).
 *
 * @var array $attributes
 */

$dots = require __DIR__ . '/dots.php';
?>
<a href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( $attributes['label'] ); ?>" <?php echo get_block_wrapper_attributes(); ?>>
	<span class="cle-logo__mark" aria-hidden="true">
		<?php foreach ( $dots as $dot ) : ?>
			<span class="cle-logo__dot" style="<?php echo esc_attr( sprintf( '--x:%s%%;--y:%s%%;--r:%s%%;--c:var(--wp--preset--color--%s);--i:%d', $dot['x'], $dot['y'], $dot['r'], $dot['slug'], $dot['order'] ) ); ?>"></span>
		<?php endforeach; ?>
	</span>
</a>
