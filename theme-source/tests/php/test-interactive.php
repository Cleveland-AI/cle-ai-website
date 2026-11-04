<?php
// The six interactive page blocks, rendered from their defaults and with edge cases.

// Stand-ins: a missing illustration falls back to a brand shape, marked so it can be styled.
t_assert( str_contains( cle_art_img( 'no-such-illustration', 1 ), 'assets/shapes/coral.webp' ) && str_contains( cle_art_img( 'no-such-illustration', 1 ), 'is-stand-in' ), 'missing illustrations fall back to a brand shape' );
t_assert( str_contains( cle_art_img( 'microphone' ), 'assets/illustrations/microphone.webp' ) && ! str_contains( cle_art_img( 'microphone' ), 'is-stand-in' ), 'existing illustrations are used as is' );

// 1. Sponsorship builder
$b = t_render( '<!-- wp:cle/sponsor-builder /-->' );
t_assert( 5 === substr_count( $b, 'class="cle-builder__perk"' ) && 5 === substr_count( $b, 'aria-pressed="false"' ), 'builder: five toggle buttons, none pressed' );
t_assert( str_contains( $b, 'href="mailto:info@cle-ai.com?subject=Sponsoring%20CLE%20AI%20%26%20DATA"' ), 'builder: without a form link, the button emails' );
$f = t_render( '<!-- wp:cle/sponsor-builder {"formUrl":"https://docs.google.com/forms/d/e/x/viewform?usp=pp_url&entry.1=PACKAGE"} /-->' );
t_assert( str_contains( $f, 'data-form="https://docs.google.com/forms/d/e/x/viewform?usp=pp_url&#038;entry.1=PACKAGE"' ), 'builder: a pre-filled form link is handed to the script' );
t_assert( ! str_contains( t_render( '<!-- wp:cle/sponsor-builder {"formUrl":"javascript:alert(1)"} /-->' ), 'javascript:' ), 'builder: only https form links are accepted' );

// 2. Gift slider
$g = t_render( '<!-- wp:cle/gift-slider /-->' );
t_assert( str_contains( $g, 'type="range" min="0" max="5"' ) && str_contains( $g, 'value="2"' ) && str_contains( $g, 'aria-valuetext="$100: Pizza for a monthly social"' ), 'gift: six steps, starting at $100, with screen-reader text' );
t_assert( 6 === substr_count( $g, '<li><strong>$' ), 'gift: the no-script list shows every amount' );
t_assert( 3 === substr_count( $g, 'cle-gift__piece is-on' ), 'gift: the pile starts with the first three objects' );
$g2 = t_render( '<!-- wp:cle/gift-slider {"steps":[{"amount":500,"label":"B"},{"amount":20,"label":"A"}],"start":9} /-->' );
t_assert( strpos( $g2, '$20' ) < strpos( $g2, '$500' ) && str_contains( $g2, 'max="1"' ) && str_contains( $g2, 'value="1"' ), 'gift: steps sort by amount and the start is clamped' );

// 3. Story beads
$s = t_render( '<!-- wp:cle/bead-timeline /-->' );
t_assert( 4 === substr_count( $s, 'class="cle-beads__bead"' ) && 1 === substr_count( $s, 'aria-expanded="true"' ) && 3 === substr_count( $s, ' data-closed' ), 'beads: four beads, only the latest open' );
t_assert( 4 === substr_count( $s, '<h3 id=' ), 'beads: every story is in the page for search and no-script readers' );

// 4. Team
$t = t_render( '<!-- wp:cle/team /-->' );
t_assert( 7 === substr_count( $t, '<li class="cle-team-card' ) && 7 === substr_count( $t, '<dialog' ) && 7 === substr_count( $t, 'class="cle-team-card__open"' ), 'team: seven cards, each opening a bio card' );
t_assert( 7 === substr_count( $t, 'class="cle-team-card__in"' ) && str_contains( $t, 'href="https://www.linkedin.com/in/juliana-novic/"' ) && str_contains( $t, 'Julie Novic on LinkedIn' ), 'team: a clickable LinkedIn logo on each card that has a LinkedIn' );
t_assert( ! str_contains( t_render( '<!-- wp:cle/team {"members":[{"name":"A","hidden":true},{"name":"B"}]} /-->' ), '>A<' ), 'team: a person marked hidden is not shown' );
$t2 = t_render( '<!-- wp:cle/team {"members":[{"photo":"ted-troxell","name":"Ted Troxell","role":"Operations","lead":true,"bio":"Runs the nights.","linkedin":"https://www.linkedin.com/in/x","site":"https://ted.example.com"},{"photo":"will-tatz","name":"Will Tatz","role":"Community","bio":"Says hello."},{"photo":"julie-novic","name":"Julie Novic","role":"Finance"}]} /-->' );
t_assert( 2 === substr_count( $t2, '<dialog class="cle-team-modal"' ) && 2 === substr_count( $t2, 'class="cle-team-card__open"' ), 'team: a modal card for each person with a bio, LinkedIn or website, opened from their photo' );
t_assert( str_contains( $t2, 'Runs the nights.' ) && str_contains( $t2, 'href="https://www.linkedin.com/in/x"' ) && str_contains( $t2, 'href="https://ted.example.com"' ) && str_contains( $t2, '>Website' ), 'team: the card has the bio, LinkedIn and personal website' );
t_assert( str_contains( $t2, 'Meet Will' ) && str_contains( $t2, 'Meet Ted' ) && ! str_contains( $t2, 'Meet Julie' ), 'team: "Meet …" moves between the people who have cards' );
$bad = t_render( '<!-- wp:cle/team {"members":[{"name":"X","linkedin":"javascript:alert(1)"}]} /-->' );
t_assert( ! str_contains( $bad, 'javascript:' ), 'team: unsafe links are dropped' );

// 5. Way finder
$w = t_render( '<!-- wp:cle/way-finder /-->' );
t_assert( 3 === substr_count( $w, '<fieldset' ) && 11 === substr_count( $w, 'type="radio"' ) && str_contains( $w, 'aria-live="polite" hidden' ), 'finder: three questions, eleven answers, a hidden live result' );
t_assert( ! str_contains( $w, 'onsubmit' ), 'finder: no inline script in the markup' );

// 6. Venue map
$m = t_render( '<!-- wp:cle/venue-map {"art":"no-such-map"} /-->' );
t_assert( ! str_contains( $m, 'cle-map__frame' ) && str_contains( $m, 'cle-map__list is-only' ), 'map: without its image, it shows just the list' );
t_assert( str_contains( $m, 'Next: <a href=' ) && str_contains( $m, 'Monthly Social at Happy Dog' ), 'map: a venue shows its next event, linked' );
t_assert( str_contains( t_render( '<!-- wp:cle/venue-map {"pins":[{"title":"Nowhere","match":"zzz-none"}]} /-->' ), 'Nothing on the calendar here yet.' ), 'map: a venue with no upcoming event says so' );


// Dot, the mascot.
foreach ( [ 'peek', 'lost', 'sleep' ] as $pose ) {
	$d = t_render( '<!-- wp:cle/mascot {"pose":"' . $pose . '"} /-->' );
	t_assert( str_contains( $d, "cle-dot--$pose" ) && str_contains( $d, "assets/illustrations/dot-$pose.webp" ) && str_contains( $d, 'alt=""' ), "Dot renders the $pose pose as a decorative image" );
}
t_assert( str_contains( t_render( '<!-- wp:cle/mascot {"pose":"bogus"} /-->' ), 'cle-dot--peek' ), 'an unknown pose falls back to peeking' );
t_assert( str_contains( do_blocks( file_get_contents( get_theme_file_path( 'parts/footer.html' ) ) ), 'cle-dot--peek' ), 'Dot peeks over the footer' );
t_assert( str_contains( do_blocks( file_get_contents( get_theme_file_path( 'templates/404.html' ) ) ), 'cle-dot--lost' ), 'the 404 page has lost Dot' );
$none = t_render( '<!-- wp:cle/coming-up {"events":[],"showPost":false} /-->' );
t_assert( str_contains( $none, 'dot-sleep.webp' ) && str_contains( $none, 'Nothing on the calendar right now.' ), 'coming-up with nothing to show: sleeping Dot and a Meetup link' );
// The map image now exists, so venues become pins on it.
$map = t_render( '<!-- wp:cle/venue-map /-->' );
t_assert( str_contains( $map, 'venue-map.webp' ) && 3 === substr_count( $map, 'class="cle-scene__pin"' ) && str_contains( $map, '--x:25%;--y:41%' ), 'the clay map shows with three pins' );

// Dot's role poses, winter hat, the walking Dot, the first night.
foreach ( [ 'stage', 'social', 'workshop', 'hike', 'search', 'welcome' ] as $pose ) {
	t_assert( str_contains( t_render( '<!-- wp:cle/mascot {"pose":"' . $pose . '"} /-->' ), "dot-$pose.webp" ), "Dot has the $pose pose" );
}
$about = do_blocks( WP_Block_Patterns_Registry::get_instance()->get_registered( 'cle-ai/page-about' )['content'] );
t_assert( 4 === substr_count( $about, 'wp-block-cle-mascot"' ) && str_contains( $about, 'dot-stage.webp' ) && str_contains( $about, 'dot-hike.webp' ), 'About: Dot shows each of the four ways to show up' );
t_assert( str_contains( do_blocks( file_get_contents( get_theme_file_path( 'templates/search.html' ) ) ), 'cle-dot--search' ), 'search: Dot searches when nothing is found' );
$winter = fn( $month ) => ( function () use ( $month ) {
	$f = fn( $date, $format ) => 'n' === $format ? (string) $month : $date;
	add_filter( 'wp_date', $f, 10, 2 );
	$html = t_render( '<!-- wp:cle/mascot {"pose":"peek"} /-->' );
	remove_filter( 'wp_date', $f, 10 );
	return $html;
} )();
t_assert( str_contains( $winter( 12 ), 'dot-peek-winter.webp' ) && str_contains( $winter( 2 ), 'dot-peek-winter.webp' ), 'December to February, the peeking Dot wears his hat' );
t_assert( str_contains( $winter( 6 ), 'dot-peek.webp' ) && ! str_contains( $winter( 6 ), 'winter' ), 'the rest of the year he does not' );
$front = do_blocks( file_get_contents( get_theme_file_path( 'templates/front-page.html' ) ) );
t_assert( ! str_contains( $front, 'cle-world__walker' ) && ! str_contains( $front, 'cle-world__spot' ), 'the homepage city has no Dot in it: no walker (no chapter sets a stop) and no hidden Dots' );
t_assert( str_contains( t_render( '<!-- wp:cle/world --><!-- wp:cle/world-chapter {"title":"A","stop":{"x":10,"y":20}} /--><!-- /wp:cle/world -->' ), 'cle-world__walker' ), 'a chapter with a stop brings the walking Dot back' );
t_assert( wp_script_is( 'cle-figures', 'registered' ), 'the count-up figures script is registered' );
$night = t_render( '<!-- wp:cle/first-night /-->' );
t_assert( 5 === substr_count( $night, 'class="cle-night__step"' ) && 5 === substr_count( $night, 'class="cle-night__frame"' ) && str_contains( $night, 'data-on="0"' ), 'Your first night: five moments, a frame for each, the first on show' );
t_assert( 1 === substr_count( $night, 'wp-block-cle-next-event' ) && str_contains( $night, '5801 Detroit Avenue' ), 'the last moment carries the next social' );
t_assert( str_contains( file_get_contents( get_theme_file_path( 'templates/front-page.html' ) ), '<!-- wp:cle/first-night {"visible":false} /-->' ) && ! str_contains( $front, 'wp-block-cle-first-night' ), 'the first night is on the homepage but hidden for now' );
t_assert( '' === t_render( '<!-- wp:cle/first-night {"visible":false} /-->' ), 'a hidden first night renders nothing' );
$peek = t_render( '<!-- wp:cle/mascot {"pose":"peek"} /-->' );
t_assert( ! str_contains( $peek, '<picture>' ) && ! str_contains( $peek, '-anim.webp' ), 'the site ships still Dots only: no animated loop is bundled, so the footer Dot is a plain image' );
t_assert( ! str_contains( t_render( '<!-- wp:cle/mascot {"pose":"lost"} /-->' ), '<picture>' ), 'poses without an animation stay a plain image' );
