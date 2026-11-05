<?php
$html = do_blocks( file_get_contents( get_theme_file_path( 'templates/front-page.html' ) ) );
t_assert( str_contains( $html, 'wp-block-cle-world' ), 'the homepage story is the world block' );
t_assert( 6 === substr_count( $html, '<article ' ), 'six chapters' );
preg_match( '/data-cam="([^"]*)"/', $html, $first );
$cam = json_decode( html_entity_decode( $first[1] ?? '' ), true );
t_assert( is_array( $cam ) && $cam['zoom'] > 1, 'the story opens zoomed in, not on the whole picture' );
t_assert( isset( $cam['cut'] ) && $cam['cut'] > 0 && $cam['cut'] < 50, 'the opening shows only the city: the lower picture is faded out' );
preg_match_all( '/data-cam="([^"]*)"/', $html, $all );
$last = json_decode( html_entity_decode( end( $all[1] ) ), true );
t_assert( 1 == $last['zoom'], 'the last chapter pulls back to the whole picture' );
t_assert( str_contains( $html, '<h1' ) && str_contains( $html, 'Making AI accessible to everyone.' ), 'chapter 1 carries the goal as the h1' );
t_assert( str_contains( $html, 'Monthly Social at Happy Dog' ), 'the next Social renders live' );
t_assert( str_contains( $html, 'Mega Meetup at the Museum' ), 'the next Mega Meetup renders live' );
t_assert( str_contains( $html, '5801 Detroit Avenue' ), 'the address is in the copy, not only in a marker' );
foreach ( [ '4,284', '183', '4.8', '1,465' ] as $figure ) {
	t_assert( str_contains( $html, $figure ), "figure $figure is present" );
}
t_assert( 16 === substr_count( $html, 'class="cle-scene__pin"' ), 'markers across five chapters (five at Happy Dog)' );
preg_match_all( '/cle-world__hotspots cle-hotspots" data-chapter="(\d)"/', $html, $groups );
t_assert( [ '0', '1', '2', '3', '4' ] === $groups[1], 'every chapter but the finale has markers' );
t_assert( ! str_contains( $html, 'wp-block-cle-timeline' ), 'the homepage no longer has the timeline' );
t_assert( 5 === substr_count( $html, 'class="cle-world__tag"' ), 'the finale has a tag for each of the five places' );
t_assert( 1 === substr_count( $html, 'class="cle-world-only' ) && ! str_contains( $html, 'what to expect' ), 'only the finale tag hint remains, and it is stage-only' );
