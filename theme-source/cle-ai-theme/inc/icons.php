<?php
/**
 * The six story icons, inlined so their strokes can be animated with CSS.
 */

defined( 'ABSPATH' ) || exit;

function cle_icon_slugs(): array {
	return [ 'chat', 'beer', 'hotdog', 'calendar', 'pin', 'headphones' ];
}

/** Inline SVG for one icon, or '' for an unknown slug. */
function cle_icon( string $slug, string $class = '' ): string {
	static $cache = [];
	if ( ! in_array( $slug, cle_icon_slugs(), true ) ) {
		return '';
	}
	if ( ! isset( $cache[ $slug ] ) ) {
		$cache[ $slug ] = trim( (string) file_get_contents( get_theme_file_path( "assets/icons/$slug.svg" ) ) );
	}
	if ( '' === $class ) {
		return $cache[ $slug ];
	}
	return str_replace( 'class="cle-icon', 'class="' . esc_attr( $class ) . ' cle-icon', $cache[ $slug ] );
}

/** slug => inline SVG, for handing to the editor. */
function cle_icons_all(): array {
	$all = [];
	foreach ( cle_icon_slugs() as $slug ) {
		$all[ $slug ] = cle_icon( $slug );
	}
	return $all;
}
