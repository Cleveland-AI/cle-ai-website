<?php
$html = t_render( '<!-- wp:cle/logo /-->' );
t_assert( str_contains( $html, 'class="wp-block-cle-logo"' ) && str_contains( $html, 'href="' . esc_url( home_url( '/' ) ) . '"' ), 'the logo links home' );
t_assert( str_contains( $html, 'aria-label="CLE AI &amp; DATA home"' ) && str_contains( $html, 'aria-hidden="true"' ), 'the link is labelled and the dots are hidden from screen readers' );
t_assert( 4 === substr_count( $html, 'class="cle-logo__dot"' ), 'four dots' );
foreach ( [ 'blue', 'yellow', 'coral', 'green' ] as $slug ) {
	t_assert( str_contains( $html, "--c:var(--wp--preset--color--$slug)" ), "the $slug dot uses the palette colour" );
}
$header = do_blocks( file_get_contents( get_theme_file_path( 'parts/header.html' ) ) );
t_assert( str_contains( $header, 'wp-block-cle-logo' ) && ! str_contains( $header, 'wp-block-site-logo' ), 'the header uses the animated logo' );
