<?php
/**
 * Helpers for cle/story and cle/story-chapter.
 */

defined( 'ABSPATH' ) || exit;

/** URL of a theme-bundled story image (assets/story/<slug>.webp), or '' if there is none. */
function cle_story_asset_url( string $slug ): string {
	$rel = 'assets/story/' . sanitize_file_name( $slug ) . '.webp';
	return file_exists( get_theme_file_path( $rel ) ) ? get_theme_file_uri( $rel ) : '';
}

/** slug => URL for every bundled story image, for the editor. */
function cle_story_asset_urls(): array {
	$urls = [];
	foreach ( glob( get_theme_file_path( 'assets/story/*.webp' ) ) ?: [] as $file ) {
		$slug          = basename( $file, '.webp' );
		$urls[ $slug ] = get_theme_file_uri( "assets/story/$slug.webp" );
	}
	return $urls;
}

/**
 * <img> for a story image: the Media Library attachment when set, else the theme default.
 * Always has width and height so nothing shifts while it loads.
 */
function cle_story_image( int $id, string $slug, array $attr = [] ): string {
	if ( $id ) {
		$img = wp_get_attachment_image( $id, 'full', false, $attr );
		if ( $img ) {
			return $img;
		}
	}
	$url = cle_story_asset_url( $slug );
	if ( '' === $url ) {
		return '';
	}
	$size = wp_getimagesize( get_theme_file_path( 'assets/story/' . sanitize_file_name( $slug ) . '.webp' ) );
	$attr = array_merge(
		[ 'alt' => '', 'loading' => 'lazy', 'decoding' => 'async' ],
		$attr,
		[ 'src' => $url, 'width' => $size[0] ?? 2000, 'height' => $size[1] ?? 1116 ]
	);
	// A bundled <slug>-2x.webp (twice the width) goes to laptops and up, where the camera zooms
	// the picture well past its normal size. The picture is laid out at its own pixel size and
	// scaled by the camera, so `sizes` can't come from the layout: it names the large file's
	// width from 1024px up, and a third of the normal width below, so phones up to 3x density
	// keep the smaller download.
	$big = cle_story_asset_url( $slug . '-2x' );
	if ( '' !== $big && ! isset( $attr['srcset'] ) ) {
		$big_size        = wp_getimagesize( get_theme_file_path( 'assets/story/' . sanitize_file_name( $slug . '-2x' ) . '.webp' ) );
		$attr['srcset']  = sprintf( '%s %dw, %s %dw', $url, $attr['width'], $big, $big_size[0] ?? 2 * $attr['width'] );
		$attr['sizes']   = sprintf( '(min-width: 1024px) %dpx, %dpx', $big_size[0] ?? 2 * $attr['width'], round( $attr['width'] / 3 ) );
	}
	$html = '<img';
	foreach ( $attr as $name => $value ) {
		if ( false !== $value ) {
			$html .= ' ' . $name . '="' . esc_attr( (string) $value ) . '"';
		}
	}
	return $html . '>';
}

/** Anchor id for a chapter, from its title: "chapter-just-conversation". */
function cle_chapter_anchor( array $attrs ): string {
	$slug = sanitize_title( (string) ( $attrs['title'] ?? '' ) );
	return '' === $slug ? '' : "chapter-$slug";
}

/** The part of a chapter's attributes the front end needs, normalised. */
function cle_chapter_state( array $attrs ): array {
	$cam = (array) ( $attrs['camera'] ?? [] );
	return [
		'icon'       => (string) ( $attrs['icon'] ?? '' ),
		'layers'     => array_values( array_map( 'strval', (array) ( $attrs['layers'] ?? [] ) ) ),
		'camera'     => [
			'x'    => (float) ( $cam['x'] ?? 50 ),
			'y'    => (float) ( $cam['y'] ?? 50 ),
			'zoom' => (float) ( $cam['zoom'] ?? 1 ),
		],
		'reveal'     => ! empty( $attrs['reveal'] ),
		'night'      => ! empty( $attrs['night'] ),
		'foreground' => (string) ( $attrs['foreground'] ?? '' ),
		'hotspots'   => ! empty( $attrs['hotspots'] ),
		'pattern'    => ! empty( $attrs['pattern'] ),
	];
}

/**
 * Camera for a chapter's stacked crop. A crop can only zoom in, so a zoomed-out camera
 * becomes the whole scene, and the focus point is clamped so the image always fills its box.
 */
function cle_chapter_crop_camera( array $cam ): array {
	$zoom  = max( 1.0, (float) $cam['zoom'] );
	$reach = 50 * ( $zoom - 1 ) / $zoom;
	$clamp = fn( $v ) => round( min( 50 + $reach, max( 50 - $reach, (float) $v ) ), 2 );
	return [
		'x'    => $clamp( $cam['x'] ),
		'y'    => $clamp( $cam['y'] ),
		'zoom' => $zoom,
	];
}
