<?php
/**
 * Clay illustrations bundled in assets/illustrations, with a brand shape standing in for any
 * that haven't been made yet, so components work before their images exist.
 */

defined( 'ABSPATH' ) || exit;

/** The six brand shapes, in the order stand-ins cycle through them. */
const CLE_SHAPES = [ 'blue', 'coral', 'yellow', 'green', 'navy', 'pale' ];

/** True when assets/illustrations/<slug>.webp ships with the theme. */
function cle_art_exists( string $slug ): bool {
	return '' !== $slug && file_exists( get_theme_file_path( 'assets/illustrations/' . sanitize_file_name( $slug ) . '.webp' ) );
}

/** URL of the illustration, or of brand shape number $i as its stand-in. */
function cle_art_url( string $slug, int $i = 0 ): string {
	return cle_art_exists( $slug )
		? get_theme_file_uri( 'assets/illustrations/' . sanitize_file_name( $slug ) . '.webp' )
		: get_theme_file_uri( 'assets/shapes/' . CLE_SHAPES[ $i % count( CLE_SHAPES ) ] . '.webp' );
}

/** Decorative <img> for an illustration (alt is empty unless given), lazy and sized. */
function cle_art_img( string $slug, int $i = 0, string $class = '', string $alt = '' ): string {
	$path = cle_art_exists( $slug )
		? get_theme_file_path( 'assets/illustrations/' . sanitize_file_name( $slug ) . '.webp' )
		: get_theme_file_path( 'assets/shapes/' . CLE_SHAPES[ $i % count( CLE_SHAPES ) ] . '.webp' );
	$size = wp_getimagesize( $path );
	return sprintf(
		'<img class="%s%s" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">',
		esc_attr( $class ),
		cle_art_exists( $slug ) ? '' : ' is-stand-in',
		esc_url( cle_art_url( $slug, $i ) ),
		esc_attr( $alt ),
		(int) ( $size[0] ?? 400 ),
		(int) ( $size[1] ?? 400 )
	);
}
