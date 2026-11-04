<?php
t_assert( 6 === count( cle_icon_slugs() ), 'six icons' );
foreach ( cle_icon_slugs() as $slug ) {
	$svg = cle_icon( $slug );
	t_assert( str_starts_with( $svg, '<svg' ), "$slug is inline SVG" );
	t_assert( str_contains( $svg, 'aria-hidden="true"' ), "$slug is decorative" );
	t_assert( str_contains( $svg, "cle-icon--$slug" ), "$slug has its modifier class" );
	$shapes = preg_match_all( '/<(path|rect|circle|ellipse|line)\b/', $svg );
	t_assert( $shapes > 0 && $shapes === substr_count( $svg, 'pathLength="1"' ), "every $slug shape is normalised for draw-in" );
}
t_assert( '' === cle_icon( 'nope' ), 'unknown slug gives an empty string' );
t_assert( '' === cle_icon( '../functions' ), 'no path traversal' );
t_assert( str_contains( cle_icon( 'pin', 'cle-extra' ), 'class="cle-extra cle-icon' ), 'an extra class is prepended' );
t_assert( array_keys( cle_icons_all() ) === cle_icon_slugs(), 'cle_icons_all covers every slug' );
