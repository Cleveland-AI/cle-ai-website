<?php
/**
 * Title: Get involved page
 * Slug: cle-ai/page-get-involved
 * Categories: cle-ai
 * Post Types: page
 * Block Types: core/post-content
 * Viewport Width: 1280
 * Description: Six ways in: events, the newsletter (embedded signup), speaking (embedded pitch form), volunteering, sponsoring and donating (embedded GiveButter form). Use with the "Landing page (no title)" template. Paste your form addresses into the two Embedded form blocks.
 */
// Clay illustrations bundled with the theme (decorative, so alt="" ).
$cle_art = function ( string $name, int $width = 0, string $align = 'center' ): string {
	$src = esc_url( get_theme_file_uri( "assets/illustrations/$name.webp" ) );
	if ( $width ) {
		return "<!-- wp:image {\"width\":\"{$width}px\",\"sizeSlug\":\"full\",\"linkDestination\":\"none\",\"align\":\"$align\",\"className\":\"cle-art\"} -->\n<figure class=\"wp-block-image align$align size-full is-resized cle-art\"><img src=\"$src\" alt=\"\" style=\"width:{$width}px\"/></figure>\n<!-- /wp:image -->";
	}
	return "<!-- wp:image {\"sizeSlug\":\"full\",\"linkDestination\":\"none\",\"align\":\"wide\",\"className\":\"cle-art\"} -->\n<figure class=\"wp-block-image alignwide size-full cle-art\"><img src=\"$src\" alt=\"\"/></figure>\n<!-- /wp:image -->";
};
// Page links follow the site's permalink structure (cle-ai.com keeps /index.php/ in every URL).
$cle_page_url = fn( string $slug ) => ( $p = get_page_by_path( $slug ) ) ? get_permalink( $p ) : home_url( $GLOBALS['wp_rewrite']->root . "$slug/" );
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|section","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--section);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">Get involved</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":1,"className":"is-style-light","fontSize":"xxxl"} -->
<h1 class="wp-block-heading is-style-light has-xxxl-font-size">It starts <strong>here</strong>.</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"fontSize":"m"} -->
<p class="has-m-font-size">Six ways in, from a Tuesday night at Happy Dog to sponsoring a season. All of them welcome first-timers.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:0;padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:cle/way-finder /--></div>
<!-- /wp:group -->

<!-- wp:group {"anchor":"events","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div id="events" class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">01 · Come to an event</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Show up once. That's the whole trick.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Everything is free and on Meetup: big nights, monthly socials, workshops, hikes. Say hello to whoever is nearest.</p>
<!-- /wp:paragraph -->

<!-- wp:cle/coming-up /-->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://www.meetup.com/cleveland-ai-data/">Join on Meetup</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->

<!-- wp:group {"anchor":"newsletter","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div id="newsletter" class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:columns {"verticalAlignment":"center","className":"cle-art-row"} -->
<div class="wp-block-columns are-vertically-aligned-center cle-art-row"><!-- wp:column {"verticalAlignment":"center","width":"64%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:64%"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">02 · Get the newsletter</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">One email a month. Dates, recaps, jobs.</h2>
<!-- /wp:heading --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"center","width":"36%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:36%"><?php echo $cle_art( 'mailbox', 220 ); ?></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:cle/embed-form {"url":"https://timcleaidata.substack.com/embed","title":"Newsletter signup","height":320,"linkLabel":"Sign up on Substack instead"} /--></div>
<!-- /wp:group -->

<!-- wp:group {"anchor":"speak","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div id="speak" class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:columns {"verticalAlignment":"center","className":"cle-art-row"} -->
<div class="wp-block-columns are-vertically-aligned-center cle-art-row"><!-- wp:column {"verticalAlignment":"center","width":"64%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:64%"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">03 · Speak</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Tell the room what you built.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>A real project, what broke, what you'd do differently. Twenty to forty minutes, questions after. First-time speakers welcome; we'll help you shape it.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"center","width":"36%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:36%"><?php echo $cle_art( 'microphone', 220 ); ?></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:cle/embed-form {"title":"Pitch a talk","height":900,"linkLabel":"Open the speaker form in a new tab"} /-->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="mailto:info@cle-ai.com?subject=Talk%20pitch">Or pitch by email</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->

<!-- wp:group {"anchor":"volunteer","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div id="volunteer" class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">04 · Volunteer</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">An evening a month keeps it running.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Door, name tags, photos, a hand with the room. No long-term commitment; tell us what you're good at and when you're free.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="mailto:info@cle-ai.com?subject=Volunteering">Email to volunteer</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->

<!-- wp:group {"anchor":"sponsor","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div id="sponsor" class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">05 · Sponsor</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Keep it free for everyone.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Sixteen organizations covered 2026. Companies can also give in kind, match their employees' gifts, run a workshop, or share job openings.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( $cle_page_url( 'sponsors' ) ); ?>">Sponsor or partner with us</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->

<!-- wp:group {"anchor":"donate","align":"full","backgroundColor":"indigo","textColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|xl","bottom":"var:preset|spacing|xl"}}},"layout":{"type":"constrained"}} -->
<div id="donate" class="wp-block-group alignfull has-paper-color has-indigo-background-color has-text-color has-background" style="padding-top:var(--wp--preset--spacing--xl);padding-bottom:var(--wp--preset--spacing--xl)"><!-- wp:columns {"verticalAlignment":"center","className":"cle-art-row"} -->
<div class="wp-block-columns are-vertically-aligned-center cle-art-row"><!-- wp:column {"verticalAlignment":"center","width":"64%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:64%"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">06 · Donate</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"textColor":"paper"} -->
<h2 class="wp-block-heading has-paper-color has-text-color">Twenty dollars covers a night's Meetup fees.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Donations pay the platform and venue costs that sponsors don't. Every dollar goes to events; nobody here is paid. CLE AI &amp; DATA is a 501(c)(3) nonprofit, so donations are tax-deductible as allowed by law.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><strong>Does your employer match gifts?</strong> Many do for a 501(c)(3). Ask HR and your donation can count twice. They'll want our legal name, Cleveland AI and Data, and our EIN, 42-2843242.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"center","width":"36%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:36%"><?php echo $cle_art( 'sprout', 220 ); ?></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:cle/gift-slider /-->

<!-- wp:cle/embed-form {"url":"https://givebutter.com/embed/c/cle-ai","title":"Donation form","height":640,"linkLabel":"Open the donation page in a new tab","linkUrl":"https://givebutter.com/cle-ai","allowPayment":true} /--></div>
<!-- /wp:group -->
