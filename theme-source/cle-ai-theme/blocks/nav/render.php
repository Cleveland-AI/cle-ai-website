<?php
/**
 * cle/nav: menu button + panel wrapping the inner blocks.
 *
 * @var array  $attributes
 * @var string $content
 */

$panel = wp_unique_id( 'cle-nav-panel-' );
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
	<button type="button" class="cle-nav__open" aria-expanded="false" aria-controls="<?php echo esc_attr( $panel ); ?>">
		<span class="cle-nav__bars" aria-hidden="true"></span>
		<span class="screen-reader-text"><?php echo esc_html( $attributes['openLabel'] ); ?></span>
	</button>
	<div class="cle-nav__panel" id="<?php echo esc_attr( $panel ); ?>">
		<button type="button" class="cle-nav__close"><?php echo esc_html( $attributes['closeLabel'] ); ?></button>
		<?php echo $content; ?>
	</div>
</div>
