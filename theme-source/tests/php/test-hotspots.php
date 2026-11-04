<?php
$spots = [
	[ 'x' => 21, 'y' => 36, 'title' => 'Just conversation', 'body' => 'No slides.', 'icon' => 'hotdog' ],
	[ 'x' => 76, 'y' => 70, 'title' => 'New here?', 'body' => 'Say hi.' ],
];
$html = cle_render_hotspots( $spots, 'numbered', 'hs' );
t_assert( 2 === substr_count( $html, 'class="cle-scene__pin"' ), 'one button per spot' );
t_assert( str_contains( $html, 'aria-controls="hs-0"' ) && str_contains( $html, 'id="hs-0"' ), 'each button controls its popover' );
t_assert( str_contains( $html, 'aria-describedby="hs-0-body"' ), 'the note is the button description' );
t_assert( str_contains( $html, 'is-below' ) && str_contains( $html, 'is-above' ), 'popover side follows y' );
t_assert( str_contains( $html, '<span aria-hidden="true">2</span>' ), 'numbered markers count from 1' );
$icons = cle_render_hotspots( $spots, 'icon', 'hs' );
t_assert( str_contains( $icons, 'cle-icon--hotdog' ), 'icon marker uses the spot icon' );
t_assert( str_contains( $icons, 'cle-icon--chat' ), 'a missing icon falls back to chat' );
$id    = t_attachment( 'assets/story/composite.webp' );
$block = t_render( '<!-- wp:cle/hotspot-scene {"imageId":' . $id . ',"heading":"Scene","markerStyle":"icon","hotspots":[{"x":10,"y":10,"title":"A","body":"B","icon":"pin"}]} /-->' );
t_assert( str_contains( $block, 'cle-scene__frame cle-hotspots' ), 'the scene frame is a hotspots root' );
t_assert( str_contains( $block, 'cle-icon--pin' ), 'hotspot-scene renders icon markers' );
t_assert( wp_script_is( 'cle-hotspots', 'registered' ) && wp_style_is( 'cle-hotspots', 'registered' ), 'shared handles are registered' );
