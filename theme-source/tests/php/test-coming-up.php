<?php
$html = t_render( '<!-- wp:cle/coming-up /-->' );
t_assert( 3 === substr_count( $html, '<li class="cle-coming__card"' ), 'two event cards and the latest post' );
preg_match_all( '/cle-coming__title">([^<]*)</', $html, $titles );
t_assert( false !== stripos( $titles[1][0] ?? '', 'Mega' ) && false !== stripos( $titles[1][1] ?? '', 'Social' ), 'cards follow their match words, in order' );
t_assert( str_contains( $html, '>Next big night<' ) && str_contains( $html, '>Next social<' ) && str_contains( $html, '>Latest post<' ), 'cards carry their labels' );
t_assert( 3 === preg_match_all( '/<time class="cle-coming__date" datetime="\d{4}-\d{2}-\d{2}">/', $html ), 'every card has a machine-readable date tile' );
t_assert( str_contains( $html, '--chip:var(--wp--preset--color--blue)' ) && str_contains( $html, '--chip:var(--wp--preset--color--coral)' ), 'date tiles use the logo colours' );

$twice = t_render( '<!-- wp:cle/coming-up {"events":[{"match":"Social","label":"A"},{"match":"Social","label":"B"}],"showPost":false} /-->' );
preg_match_all( '/cle-coming__title">([^<]*)</', $twice, $t2 );
t_assert( 2 === count( $t2[1] ) && $t2[1][0] !== $t2[1][1], 'a second card for the same word falls back to a different event' );
t_assert( ! str_contains( $twice, '>Latest post<' ), 'the post card can be turned off' );

$none = t_render( '<!-- wp:cle/coming-up {"events":[{"match":"zzz-no-such-event","label":"X"}],"showPost":false} /-->' );
t_assert( 1 === substr_count( $none, '<li class="cle-coming__card"' ), 'an unmatched word still shows the next event' );

$front = do_blocks( file_get_contents( get_theme_file_path( 'templates/front-page.html' ) ) );
t_assert( str_contains( $front, 'wp-block-cle-coming-up' ), 'the homepage opens with the coming-up cards' );
$header = file_get_contents( get_theme_file_path( 'parts/header.html' ) );
t_assert( ! str_contains( $header, 'cle/ticker' ), 'the ticker is gone from the header' );
