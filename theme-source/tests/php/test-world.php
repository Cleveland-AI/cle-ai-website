<?php
$markup = <<<'HTML'
<!-- wp:cle/world -->
<!-- wp:cle/world-chapter {"title":"Our goal","camera":{"x":41,"y":18,"zoom":1.3},"fadeBelow":40,"tag":{"x":30,"y":15},"tagPhone":{"x":31,"y":20},"tagShort":"Goal"} -->
<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->
<!-- /wp:cle/world-chapter -->
<!-- wp:cle/world-chapter {"title":"Once a month","camera":{"x":44,"y":62,"zoom":2.7},"tag":{"x":44,"y":47},"hotspots":[{"x":37,"y":71,"title":"Just conversation","body":"No slides."},{"x":50,"y":51,"title":"Once a month","body":"Tuesdays."}]} -->
<!-- wp:paragraph --><p>Hot dogs</p><!-- /wp:paragraph -->
<!-- /wp:cle/world-chapter -->
<!-- /wp:cle/world -->
HTML;
$html = t_render( $markup );
t_assert( str_contains( $html, 'wp-block-cle-world' ) && str_contains( $html, 'is-mode-stage' ), 'world renders in stage mode by default' );
t_assert( 2 === substr_count( $html, '<article ' ), 'two chapters render' );
t_assert( str_contains( $html, 'id="chapter-once-a-month"' ), 'chapters get anchors' );
preg_match_all( '/data-cam="([^"]*)"/', $html, $m );
$cams = array_map( fn( $c ) => json_decode( html_entity_decode( $c ), true ), $m[1] );
t_assert( 2 === count( $cams ) && 1.3 == $cams[0]['zoom'] && 44 == $cams[1]['x'], 'each chapter carries its camera as JSON' );
preg_match( '/<div class="cle-world__view">(<img [^>]*>)/', $html, $img );
t_assert( ! empty( $img[1] ) && str_contains( $img[1], 'world.webp' ), 'the stage shows the bundled world image by default' );
t_assert( str_contains( $img[1], 'width="' ) && str_contains( $img[1], 'height="' ) && ! str_contains( $img[1], 'loading=' ), 'the stage image is sized and not lazy' );
t_assert( 2 === substr_count( $html, 'class="cle-scene__pin"' ), 'hotspots render for the chapter that has them' );
t_assert( (bool) preg_match( '/cle-world__hotspots cle-hotspots" data-chapter="1" inert/', $html ), 'hotspots are grouped by chapter and start inert' );
t_assert( 2 === substr_count( $html, 'cle-wchapter__crop' ), 'each chapter has a stacked-mode crop' );
t_assert( str_contains( $html, '--cam-z:1.3' ), 'crop carries the chapter camera' );
t_assert( str_contains( $html, '<p>Hot dogs</p>' ) || str_contains( $html, '>Hot dogs</p>' ), 'chapter content renders' );
$stacked = t_render( '<!-- wp:cle/world {"mode":"stacked"} --><!-- wp:cle/world-chapter {"title":"A"} /--><!-- /wp:cle/world -->' );
t_assert( str_contains( $stacked, 'is-mode-stacked' ), 'stacked mode is selectable' );
preg_match_all( '/<button type="button" class="cle-world__tag"[^>]*>.*?<\/button>/s', $html, $tags );
t_assert( 2 === count( $tags[0] ), 'each chapter with a tag gets a finale tag' );
t_assert( str_contains( $tags[0][0], 'data-chapter="0"' ) && str_contains( $tags[0][0], 'data-at="30,15"' ) && str_contains( $tags[0][0], 'data-at-phone="31,20"' ), 'tags carry their chapter and positions' );
t_assert( str_contains( $tags[0][0], '>Our goal</span>' ) && str_contains( $tags[0][0], '>Goal</span>' ), 'tags use the title, with a short label for phones' );
t_assert( str_contains( $tags[0][1], 'data-at-phone="44,47"' ) && str_contains( $tags[0][1], '>Once a month</span><span class="cle-world__tag-short">Once a month</span>' ), 'phone position and short label fall back to the defaults' );
t_assert( (bool) preg_match( '/class="cle-world__tags"[^>]*inert/', $html ), 'tags start inert' );
t_assert( ! str_contains( $stacked, 'cle-world__tag' ), 'no tags without tag positions' );
t_assert( 40 == ( $cams[0]['cut'] ?? 0 ) && ! isset( $cams[1]['cut'] ), 'fadeBelow reaches the camera only where it is set' );
t_assert( 1 === substr_count( $html, 'class="cle-world__cut"' ), 'the stage has the fade layer' );
preg_match( '/<div class="cle-world__view">(<img [^>]*>)/', $html, $stage_img );
$has_2x = file_exists( get_theme_file_path( 'assets/story/world-2x.webp' ) );
t_assert( $has_2x === str_contains( $stage_img[1], 'world-2x.webp' ) && $has_2x === str_contains( $stage_img[1], 'sizes="(min-width: 1024px)' ), 'the 2x picture is offered to laptops exactly when world-2x.webp is bundled' );
