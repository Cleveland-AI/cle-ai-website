<?php
foreach ( [ 'lights', 'room', 'table-1', 'table-2', 'table-3', 'table-4', 'bar-staff', 'counter', 'neon', 'hotdog-beer', 'pattern', 'composite' ] as $slug ) {
	t_assert( '' !== cle_story_asset_url( $slug ), "$slug.webp is bundled" );
}
$img = cle_story_image( 0, 'lights' );
t_assert( str_contains( $img, 'width="2000"' ) && str_contains( $img, 'height="1116"' ), 'theme default carries its real size' );
t_assert( str_contains( $img, 'loading="lazy"' ), 'theme default is lazy by default' );
t_assert( ! str_contains( cle_story_image( 0, 'lights', [ 'loading' => false ] ), 'loading=' ), 'loading can be switched off' );
t_assert( '' === cle_story_image( 0, 'missing-slug' ), 'unknown slug renders nothing' );
t_assert( isset( cle_story_asset_urls()['neon'] ), 'asset map lists neon' );
$id = t_attachment( 'assets/story/composite.webp' );
t_assert( str_contains( cle_story_image( $id, 'lights' ), '/uploads/' ), 'a Media Library attachment wins over the theme default' );
t_assert( str_contains( cle_story_image( 999999, 'lights' ), 'lights.webp' ), 'a missing attachment falls back to the theme default' );
