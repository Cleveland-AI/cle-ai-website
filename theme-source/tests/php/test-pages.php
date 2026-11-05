<?php
// The About, Sponsors and Get involved page patterns, the merger kit, and the brand styles.
$reg = WP_Block_Patterns_Registry::get_instance();
foreach ( [ 'page-about', 'page-sponsors', 'page-get-involved', 'page-code-of-conduct', 'page-privacy', 'post-merger-announcement', 'story-after-merger' ] as $slug ) {
	t_assert( $reg->is_registered( "cle-ai/$slug" ), "pattern cle-ai/$slug is registered" );
}
$render = fn( string $slug ) => do_blocks( $reg->get_registered( "cle-ai/$slug" )['content'] );

$about = $render( 'page-about' );
t_assert( 1 === substr_count( $about, '<h1' ) && str_contains( $about, 'Making AI accessible to <strong>everyone</strong>.' ), 'About has one light-style h1' );
t_assert( 7 === substr_count( $about, 'class="cle-team-card__photo"' ) && 7 === substr_count( $about, '<li class="cle-team-card' ) && str_contains( $about, 'assets/team/helen-shere.webp' ), 'About shows seven team cards, each with a headshot' );
t_assert( (bool) preg_match( '#assets/team/ted-troxell\.webp\?v=\d+"#', $about ), 'team photos carry their modified time, so a replaced photo shows right away' );
t_assert( 3 === substr_count( $about, 'class="cle-team-card__lead"' ), 'exactly three people carry the Leadership label' );
t_assert( str_contains( $about, 'registered 501(c)(3) nonprofit' ) && str_contains( $about, 'info@cle-ai.com' ) && str_contains( $about, 'cle-ways' ), 'nonprofit note, contact and the four ways to show up' );
t_assert( 4 === substr_count( $about, 'class="cle-beads__bead"' ) && str_contains( $about, 'A nonprofit, officially' ) && ! str_contains( t_render( '<!-- wp:cle/bead-timeline /-->' ), 'Data in the Land' ) && ! str_contains( $about, 'Data in the Land joins' ), 'the About story has four beads, the last the 2026 501(c)(3); the merger itself is not announced (Nov 4)' );
t_assert( 4 === substr_count( $about, 'class="wp-block-group cle-figure' ), 'four big figures' );
t_assert( str_contains( $about, 'Cleveland AI and Data' ) && str_contains( $about, 'EIN 42-2843242' ) && ! str_contains( $about, '[Legal' ), 'About gives the legal name and EIN' );
t_assert( str_contains( $about, 'Ted Troxell is President of CLE AI &amp; DATA' ) && str_contains( $about, 'Nicole McCaffrey is Head of Marketing and Strategy' ) && str_contains( $about, 'Will Tatz is Chief Operating Officer' ) && str_contains( $about, 'Tim Nash is Community Liaison' ) && str_contains( $about, 'Curtis O’Neal is an AI solutions architect' ) && 7 === substr_count( $about, '<dialog class="cle-team-modal"' ), 'everyone with a bio or LinkedIn opens a card' );
t_assert( str_contains( $about, 'Helen Shere is Head of Mentorship and Education' ) && ! str_contains( $about, 'cle-team-card__initials' ) && str_contains( $about, 'Seven volunteers' ), 'Helen is on the team with her headshot; the heading says seven' );
t_assert( str_contains( t_render( '<!-- wp:cle/team {"members":[{"name":"New Person","photo":"nobody","bio":"Hi."}]} /-->' ), '>NP<' ), 'team: someone without a headshot yet shows their initials' );
$coc = $render( 'page-code-of-conduct' );
foreach ( [ 'What we expect', 'What isn\'t OK', 'If something happens', 'What we\'ll do', 'info@cle-ai.com', 'call 911' ] as $part ) {
	t_assert( str_contains( $coc, $part ), "code of conduct: $part" );
}
$coc_page = get_page_by_path( 'code-of-conduct' );
t_assert( $coc_page && str_contains( $about, 'href="' . esc_url( get_permalink( $coc_page ) ) . '"' ), 'the About page links to the code of conduct page, which exists' );
t_assert( ! str_contains( do_blocks( file_get_contents( get_theme_file_path( 'parts/header.html' ) ) ), 'cle/member-link' ) && ! str_contains( file_get_contents( get_theme_file_path( 'parts/header.html' ) ), 'member-link' ), 'the header has no members sign-in link while the members area is parked' );

$sponsors = $render( 'page-sponsors' );
preg_match( '/<ul class="wp-block-list alignwide cle-sponsors">(.*?)<\/ul>/s', $sponsors, $m );
t_assert( ! empty( $m[1] ) && 16 === substr_count( $m[1], '<li>' ), 'sixteen sponsor tiles' );
t_assert( ! str_contains( $sponsors, 'Cloudera' ) && ! str_contains( $sponsors, 'IBM' ), 'only signed 2026 sponsors are named' );
t_assert( str_contains( $sponsors, '<span class="cle-builder__price">$800</span>' ) && str_contains( $sponsors, '<span class="cle-builder__price">$1,800</span>' ) && str_contains( $sponsors, '<span class="cle-builder__price">$2,500</span>' ) && ! str_contains( $sponsors, '[$__]' ) && str_contains( $sponsors, 'acknowledgment, not endorsement' ), 'tiers show their prices; acknowledgment stance stated' );

$gi = $render( 'page-get-involved' );
t_assert( str_contains( $gi, 'src="https://timcleaidata.substack.com/embed"' ) && str_contains( $gi, 'sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"' ) && str_contains( $gi, 'title="Newsletter signup"' ), 'the newsletter signup is embedded, sandboxed and titled' );
t_assert( 2 === substr_count( $gi, '<iframe' ), 'newsletter and donation embeds render; the speaker form stays empty until its URL is set' );
t_assert( str_contains( $gi, 'cle-finder' ) && str_contains( $gi, 'cle-gift' ), 'Get involved has the way-finder and the gift slider' );
foreach ( [ 'events', 'newsletter', 'speak', 'volunteer', 'sponsor', 'donate' ] as $anchor ) {
	t_assert( str_contains( $gi, "id=\"$anchor\"" ), "Get involved has the #$anchor section the way-finder points to" );
}
t_assert( str_contains( $gi, 'wp-block-cle-coming-up' ) && str_contains( $gi, 'givebutter.com/cle-ai' ) && str_contains( $gi, 'href="' . esc_url( get_permalink( get_page_by_path( 'sponsors' ) ) ) . '"' ) && str_contains( $gi, '/index.php/sponsors/' ), 'events, donate and sponsor links present' );
t_assert( '' === do_blocks( '<!-- wp:cle/embed-form {"url":"http://example.com/form"} /-->' ), 'embed-form refuses non-https URLs' );
t_assert( str_contains( do_blocks( '<!-- wp:cle/embed-form {"url":"https://example.com/f","height":50} /-->' ), 'height="200"' ), 'embed-form enforces a minimum height' );

$post = $render( 'post-merger-announcement' );
t_assert( 2 === substr_count( $post, '[QUOTE FROM' ) && str_contains( $post, 'November 17' ) && str_contains( $post, 'is-style-chapters' ), 'announcement keeps its quote placeholders and the welcome night' );
$story = $render( 'story-after-merger' );
t_assert( 5 === substr_count( $story, 'class="cle-beads__bead"' ) && str_contains( $story, 'A nonprofit, officially' ) && str_contains( $story, 'Data in the Land joins' ), 'post-merger story keeps the nonprofit bead and adds the merger bead' );

t_assert( null !== get_posts( [ 'name' => 'data-in-the-land-joins-cle-ai-data', 'post_status' => 'draft', 'posts_per_page' => 1 ] )[0] ?? null && ! get_page_by_path( 'data-in-the-land-joins-cle-ai-data', OBJECT, 'post' ), 'on the test site the announcement exists only as a draft' );
$templates = wp_get_theme()->get_page_templates( null, 'page' );
t_assert( isset( $templates['page-landing'] ), 'the Landing page (no title) template is offered for pages' );
foreach ( [ 'about', 'sponsors', 'get-involved' ] as $slug ) {
	$pg = get_page_by_path( $slug, OBJECT, 'page' );
	t_assert( $pg && 'page-landing' === get_page_template_slug( $pg ), "/$slug/ uses the landing template" );
}
$styles = WP_Block_Styles_Registry::get_instance();
t_assert( $styles->is_registered( 'core/heading', 'light' ) && $styles->is_registered( 'core/list', 'chapters' ), 'brand text styles registered' );
$tj = wp_get_global_settings( [ 'typography', 'fontFamilies', 'theme' ] );
t_assert( 'Lexend' === ( $tj[0]['name'] ?? '' ) && 3 === count( $tj[0]['fontFace'] ?? [] ), 'Lexend is the theme font with three weights' );
$pal = wp_list_pluck( wp_get_global_settings( [ 'color', 'palette', 'theme' ] ), 'color', 'slug' );
t_assert( '#1670AA' === $pal['ink-blue'] && '#D3EFFF' === $pal['pale-blue'] && '#4A5568' === $pal['ink-soft'] && '#2F9AD8' === $pal['accent-deep'], 'brand kit colours in the palette' );
t_assert( ! preg_match( '#href="/(about|sponsors|get-involved|code-of-conduct)/"#', $about . $gi ), 'no hand-typed page paths that skip /index.php/' );
foreach ( [ 'About' => $about, 'Sponsors' => $sponsors, 'Get involved' => $gi ] as $name => $html ) {
	t_assert( str_contains( $html, '501(c)(3)' ), "$name states the 501(c)(3) status" );
}
t_assert( str_contains( $gi, 'tax-deductible as allowed by law' ) && str_contains( $about, 'tax-deductible as allowed by law' ), 'donation copy says tax-deductible as allowed by law' );
t_assert( str_contains( do_blocks( file_get_contents( get_theme_file_path( 'parts/footer.html' ) ) ), '501(c)(3) nonprofit' ), 'the footer states the 501(c)(3) status on every page' );
t_assert( (bool) preg_match( '#<iframe[^>]*src="https://givebutter.com/embed/c/cle-ai"[^>]*allow="payment"#', $gi ) && str_contains( $gi, 'href="https://givebutter.com/cle-ai"' ), 'GiveButter is embedded with payments allowed; the fallback opens the normal page' );
t_assert( str_contains( $gi, 'Does your employer match gifts?' ), 'the donate section asks about employer matching' );
t_assert( str_contains( $sponsors, 'Corporate partners' ) && 4 === substr_count( substr( $sponsors, strpos( $sponsors, 'Corporate partners' ) ), '<li><strong>' ), 'Sponsors lists four other ways for companies to help' );
t_assert( 0 === substr_count( $sponsors, '<iframe' ) && str_contains( $sponsors, 'Or email info@cle-ai.com' ), 'the inquiry form waits for its Google Form URL; email works meanwhile' );
t_assert( str_contains( $sponsors, 'cle-builder' ) && ! str_contains( $sponsors, 'Three ways to sponsor' ), 'Sponsors uses the builder instead of the static tier list' );
t_assert( str_contains( do_blocks( '<!-- wp:cle/embed-form {"url":"https://example.com/f","linkUrl":"http://insecure.example"} /-->' ), 'href="https://example.com/f"' ), 'a non-https fallback link is ignored' );
foreach ( [ 'mailbox', 'microphone', 'sprout' ] as $img ) {
	t_assert( str_contains( $gi, "assets/illustrations/$img.webp" ) && file_exists( get_theme_file_path( "assets/illustrations/$img.webp" ) ), "Get involved shows the $img illustration" );
}
t_assert( str_contains( $sponsors, 'assets/illustrations/corporate-partners.webp' ), 'Sponsors shows the corporate partners illustration' );
foreach ( [ 'merger-beads', 'job-board', 'east-side-taproom' ] as $img ) {
	t_assert( str_contains( $post, "assets/illustrations/$img.webp" ), "the merger post carries the $img image" );
}
// Embargo: nothing public before Nov 4 may announce the merger or its two new offerings. Ted chose
// (Oct 25) to show Helen Shere's bio, which names Data in the Land as the community she co-founded;
// that one mention is allowed, nothing else.
$helen = 'co-founder of Data in the Land, a Cleveland community for data professionals';
foreach ( [ 'About' => str_replace( $helen, '', $about ), 'Sponsors' => $sponsors, 'Get involved' => $gi ] as $name => $html ) {
	t_assert( ! preg_match( '/Data in the Land|weekly job|east side/i', $html ), "$name keeps the merger embargo" );
}

// Pattern pages work on either template: the default page template lets full-width sections span
// the page, and a page that brings its own h1 doesn't get the page title repeated above it.
$tpl = file_get_contents( get_theme_file_path( 'templates/page.html' ) );
t_assert( str_contains( $tpl, '<!-- wp:post-content {"align":"full","layout":{"type":"constrained"}} /-->' ), 'default page template: content is full width, text constrained' );
// The title behaviour (pattern pages: no repeated title; ordinary pages: title) is checked over HTTP in tests/bin/spec-check.

// Privacy policy (draft of Oct 26): the public sections only, tables for the data and retention.
$pp = $render( 'page-privacy' );
foreach ( [ 'Who we are and what this covers', 'What we collect', 'Photos, video and recordings at events', 'Your choices', 'How long we keep things', 'Changes and contact', '6545 Market Ave N' ] as $part ) {
	t_assert( str_contains( $pp, $part ), "privacy: $part" );
}
t_assert( 3 === substr_count( $pp, '<table' ) && 1 === substr_count( $pp, '<h1' ), 'privacy: three tables and one headline' );
t_assert( ! str_contains( $pp, 'Not yet adopted' ) && ! str_contains( $pp, 'SPEAKER RELEASE' ) && ! str_contains( $pp, 'counsel' ), 'privacy: no draft note, appendix or counsel notes on the public page' );
$footer = do_blocks( file_get_contents( get_theme_file_path( 'parts/footer.html' ) ) );
t_assert( str_contains( $footer, 'href="' . esc_url( get_permalink( get_page_by_path( 'privacy' ) ) ) . '">Privacy policy' ) && str_contains( $footer, '>Code of conduct</a>' ), 'the footer links the privacy policy and code of conduct' );
