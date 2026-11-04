<?php
t_assert( str_contains( cle_find_event( 'social' )->post_title, 'Social' ), 'finds the next Social, case-insensitively' );
t_assert( str_contains( cle_find_event( 'Mega' )->post_title, 'Mega' ), 'finds the next Mega Meetup' );
t_assert( null === cle_find_event( 'Nonexistent' ), 'no match gives null' );
t_assert( null !== cle_find_event( 'Nonexistent', true ), 'fallback gives the next event of any kind' );
t_assert( cle_find_event( '' )->ID === cle_events( 'upcoming', 1 )[0]->ID, 'an empty needle means the next event' );
$html = t_render( '<!-- wp:cle/next-event {"match":"Social","showExcerpt":false} /-->' );
t_assert( str_contains( $html, 'Monthly Social' ), 'next-event honours match' );
$none = t_render( '<!-- wp:cle/next-event {"match":"Nonexistent","emptyText":"Check Meetup for the next date."} /-->' );
t_assert( str_contains( $none, 'Check Meetup for the next date.' ), 'next-event shows its empty text when nothing matches' );
