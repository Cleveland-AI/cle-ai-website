<?php
/**
 * cle/menu: a classic menu location rendered as text links.
 *
 * @var array $attributes
 */

$location = $attributes['location'];
if ( ! has_nav_menu( $location ) ) {
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		/* translators: %s: menu location name */
		printf( '<p>%s</p>', esc_html( sprintf( __( 'Assign a menu to the "%s" location in Appearance → Menus.', 'cle-ai' ), $location ) ) );
	}
	return;
}
?>
<nav <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-menu--' . $location, 'aria-label' => $attributes['label'] ] ); ?>>
	<?php
	wp_nav_menu( [
		'theme_location' => $location,
		'container'      => false,
		'menu_class'     => 'cle-menu__list',
		'depth'          => 1,
		'fallback_cb'    => false,
	] );
	?>
</nav>
