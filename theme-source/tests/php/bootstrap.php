<?php
// Minimal assertions for tests that run inside WordPress via WP-CLI.

function t_assert( $cond, string $msg ): void {
	if ( ! $cond ) {
		echo "FAIL: $msg\n";
		exit( 1 );
	}
	echo "ok - $msg\n";
}

/** Render one block from its serialised markup. */
function t_render( string $markup ): string {
	$blocks = array_values( array_filter( parse_blocks( $markup ), fn( $b ) => null !== $b['blockName'] ) );
	return render_block( $blocks[0] );
}

/** Copy a theme file into uploads as an attachment; deleted when the test ends. */
function t_attachment( string $theme_relative ): int {
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$upload = wp_upload_bits( basename( $theme_relative ), null, file_get_contents( get_theme_file_path( $theme_relative ) ) );
	$id     = wp_insert_attachment( [ 'post_mime_type' => wp_check_filetype( $upload['file'] )['type'], 'post_title' => 'test', 'post_status' => 'inherit' ], $upload['file'] );
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );
	register_shutdown_function( fn() => wp_delete_attachment( $id, true ) );
	return $id;
}
