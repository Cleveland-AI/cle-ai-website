<?php
$markup = <<<'HTML'
<!-- wp:cle/story {"sponsors":"AWS · OpenAI","hotspots":[{"x":21,"y":36,"title":"Just conversation","body":"No slides.","icon":"chat"}]} -->
<!-- wp:cle/story-chapter {"title":"The door","icon":"chat","layers":["lights","room"]} -->
<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->
<!-- /wp:cle/story-chapter -->
<!-- wp:cle/story-chapter {"title":"Just conversation","icon":"chat","camera":{"x":21,"y":40,"zoom":2.2},"bubbles":[{"x":14,"y":22,"text":"What broke this week?"}]} -->
<!-- wp:paragraph --><p>Talk</p><!-- /wp:paragraph -->
<!-- /wp:cle/story-chapter -->
<!-- wp:cle/story-chapter {"title":"The big nights","icon":"headphones","night":true,"pin":{"x":50,"y":60}} -->
<!-- wp:paragraph --><p>Night</p><!-- /wp:paragraph -->
<!-- /wp:cle/story-chapter -->
<!-- /wp:cle/story -->
HTML;
$html = t_render( $markup );
t_assert( str_contains( $html, 'is-mode-stage' ), 'stage mode by default' );
t_assert( 3 === substr_count( $html, '<article ' ), 'three chapters render' );
t_assert( 3 === preg_match_all( '/<li><a href="#chapter-/', $html ), 'the rail links to each chapter' );
t_assert( str_contains( $html, 'href="#chapter-just-conversation"' ) && str_contains( $html, 'id="chapter-just-conversation"' ), 'rail anchors match chapter ids' );
t_assert( 8 === substr_count( $html, 'class="cle-story__layer"' ) && str_contains( $html, 'data-layer="neon"' ), 'eight day layers plus the night room' );
preg_match_all( '/<img [^>]*>/', $html, $imgs );
$unsized = array_filter( $imgs[0], fn( $img ) => ! str_contains( $img, 'width=' ) || ! str_contains( $img, 'height=' ) );
t_assert( count( $imgs[0] ) > 9 && 0 === count( $unsized ), 'every image has width and height' );
t_assert( str_contains( $html, 'What broke this week?' ) && str_contains( $html, 'data-chapter="1"' ), 'bubble renders for chapter 1' );
t_assert( str_contains( $html, 'cle-story__pin' ), 'pin renders' );
t_assert( str_contains( $html, 'cle-story__horizon' ), 'horizon line renders' );
t_assert( str_contains( $html, 'data-foreground="hotdog-beer"' ), 'foreground renders' );
t_assert( str_contains( $html, 'Mega Meetup' ), 'TV shows the next Mega Meetup' );
t_assert( str_contains( $html, 'AWS · OpenAI' ), 'sponsor crawl renders' );
t_assert( (bool) preg_match( '/cle-story__hotspots cle-hotspots"[^>]*inert/', $html ), 'hotspots start inert' );
t_assert( str_contains( $html, 'cle-icon--headphones' ), 'rail icons are inline SVG' );
t_assert( str_contains( $html, '--cle-pattern:url(' ), 'pattern URL is exposed to CSS' );
preg_match_all( '/<div class="cle-story__layer" data-layer="[^"]*"><img [^>]*>/', $html, $layer_imgs );
t_assert( count( $layer_imgs[0] ) > 2, 'layer images found' );
t_assert( ! str_contains( $layer_imgs[0][0], 'loading=' ) && ! str_contains( $layer_imgs[0][1], 'loading=' ), 'first two layers load eagerly (no loading attribute)' );
t_assert( str_contains( $layer_imgs[0][0], 'fetchpriority="high"' ) && str_contains( $layer_imgs[0][1], 'fetchpriority="high"' ), 'first two layers are fetched first' );
t_assert( str_contains( $layer_imgs[0][2], 'loading="lazy"' ), 'later layers load lazily' );
$stacked = t_render( '<!-- wp:cle/story {"mode":"stacked"} --><!-- wp:cle/story-chapter {"title":"One"} /--><!-- /wp:cle/story -->' );
t_assert( str_contains( $stacked, 'is-mode-stacked' ) && ! str_contains( $stacked, 'is-mode-stage' ), 'stacked mode renders is-mode-stacked' );
$untitled = t_render( '<!-- wp:cle/story --><!-- wp:cle/story-chapter {"title":"One"} /--><!-- wp:cle/story-chapter /--><!-- wp:cle/story-chapter {"title":"Three"} /--><!-- /wp:cle/story -->' );
t_assert( ! str_contains( $untitled, 'href="#"' ) && 2 === substr_count( $untitled, '<li><a ' ), 'untitled chapters get no rail link' );
t_assert( str_contains( $untitled, 'href="#chapter-three" data-index="2"' ), 'rail links keep their chapter position in data-index' );
$missing = t_render( '<!-- wp:cle/story {"patternId":999999} --><!-- wp:cle/story-chapter {"title":"One"} /--><!-- /wp:cle/story -->' );
t_assert( (bool) preg_match( '/--cle-pattern:url\(&quot;[^&]*pattern\.webp[^&]*&quot;\)/', $missing ), 'a missing pattern attachment falls back to the bundled pattern, quoted' );
