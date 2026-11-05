<?php
/**
 * Marker + popover markup shared by cle/hotspot-scene and cle/story.
 */

defined( 'ABSPATH' ) || exit;

/**
 * @param array  $spots Items { id?, x, y, title, body, icon? } with x/y in percent of the image box.
 * @param string $style numbered | dot | question | icon.
 * @param string $uid   Unique prefix for element ids.
 */
function cle_render_hotspots( array $spots, string $style, string $uid ): string {
	$out = '';
	foreach ( array_values( $spots ) as $i => $spot ) {
		$id     = esc_attr( "$uid-$i" );
		$x      = max( 0, min( 100, (float) ( $spot['x'] ?? 50 ) ) );
		$y      = max( 0, min( 100, (float) ( $spot['y'] ?? 50 ) ) );
		$pos    = esc_attr( "--x:$x%;--y:$y%" );
		$marker = match ( $style ) {
			'numbered' => (string) ( $i + 1 ),
			'question' => '?',
			'icon'     => cle_icon( (string) ( $spot['icon'] ?? '' ) ) ?: cle_icon( 'chat' ),
			default    => '',
		};
		$out .= sprintf(
			'<button type="button" class="cle-scene__pin" style="%1$s" id="%2$s-btn" aria-expanded="false" aria-controls="%2$s" aria-describedby="%2$s-body">' .
			'<span class="screen-reader-text">%3$s</span><span aria-hidden="true">%4$s</span></button>' .
			'<div class="cle-scene__pop %5$s" style="%1$s" id="%2$s" role="dialog" aria-labelledby="%2$s-title" hidden>' .
			'<h3 id="%2$s-title">%6$s</h3><p id="%2$s-body">%7$s</p></div>',
			$pos,
			$id,
			esc_html( wp_strip_all_tags( $spot['title'] ?? '' ) ),
			$marker,
			$y < 50 ? 'is-below' : 'is-above',
			wp_kses_post( $spot['title'] ?? '' ),
			wp_kses_post( $spot['body'] ?? '' )
		);
	}
	return $out;
}
