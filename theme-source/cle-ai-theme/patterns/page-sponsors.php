<?php
/**
 * Title: Sponsors page
 * Slug: cle-ai/page-sponsors
 * Categories: cle-ai
 * Post Types: page
 * Block Types: core/post-content
 * Viewport Width: 1280
 * Description: The current sponsors as acknowledgment only, why sponsoring works, how it works, other ways for companies to help, and an inquiry form (paste your Google Form address into the Embedded form block). Use with the "Landing page (no title)" template. Only list organizations that have signed.
 */
// Clay illustrations bundled with the theme (decorative, so alt="" ).
$cle_art = function ( string $name, int $width = 0, string $align = 'center' ): string {
	$src = esc_url( get_theme_file_uri( "assets/illustrations/$name.webp" ) );
	if ( $width ) {
		return "<!-- wp:image {\"width\":\"{$width}px\",\"sizeSlug\":\"full\",\"linkDestination\":\"none\",\"align\":\"$align\",\"className\":\"cle-art\"} -->\n<figure class=\"wp-block-image align$align size-full is-resized cle-art\"><img src=\"$src\" alt=\"\" style=\"width:{$width}px\"/></figure>\n<!-- /wp:image -->";
	}
	return "<!-- wp:image {\"sizeSlug\":\"full\",\"linkDestination\":\"none\",\"align\":\"wide\",\"className\":\"cle-art\"} -->\n<figure class=\"wp-block-image alignwide size-full cle-art\"><img src=\"$src\" alt=\"\"/></figure>\n<!-- /wp:image -->";
};
$sponsors = [ 'AWS', 'OpenAI', 'Nutanix', 'Arista Networks', 'Further', 'Splunk', 'JobsOhio', 'Progressive', 'CBTS', 'ETA', 'velera', 'Atomic Industries', 'EOX Vantage', 'SkillSpout', 'Gauntlet', 'CrossComm' ];
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|section","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--section);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">Sponsors</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":1,"className":"is-style-light","fontSize":"xxxl"} -->
<h1 class="wp-block-heading is-style-light has-xxxl-font-size">Sixteen sponsors kept 2026 <strong>free</strong>.</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"fontSize":"m"} -->
<p class="has-m-font-size">Every talk, social and workshop is free to attend because these organizations cover the costs. We list sponsors as acknowledgment, not endorsement. CLE AI &amp; DATA is a 501(c)(3) nonprofit.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:heading -->
<h2 class="wp-block-heading">2026 sponsors</h2>
<!-- /wp:heading -->

<!-- wp:list {"className":"cle-sponsors","align":"wide"} -->
<ul class="wp-block-list alignwide cle-sponsors"><?php foreach ( $sponsors as $name ) : ?><!-- wp:list-item -->
<li><?php echo esc_html( $name ); ?></li>
<!-- /wp:list-item -->
<?php endforeach; ?></ul>
<!-- /wp:list -->

<!-- wp:paragraph {"textColor":"ink-soft","fontSize":"s"} -->
<p class="has-ink-soft-color has-text-color has-s-font-size">Replace any name with the sponsor's logo by swapping the list item for an Image block.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">Why sponsor</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">The room you want to reach.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Sponsors reach the people who build and buy AI and data systems in Northeast Ohio, in person, several times a year.</p>
<!-- /wp:paragraph -->

<!-- wp:columns {"align":"wide","style":{"spacing":{"margin":{"top":"var:preset|spacing|m"}}}} -->
<div class="wp-block-columns alignwide" style="margin-top:var(--wp--preset--spacing--m)"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"cle-figure","layout":{"type":"default"}} -->
<div class="wp-block-group cle-figure"><!-- wp:paragraph -->
<p>4,284</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>members</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"cle-figure","layout":{"type":"default"}} -->
<div class="wp-block-group cle-figure"><!-- wp:paragraph -->
<p>58.4%</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>are developers and engineering leads</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"cle-figure","layout":{"type":"default"}} -->
<div class="wp-block-group cle-figure"><!-- wp:paragraph -->
<p>~400</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>at Bytes &amp; Bones 2026</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:group {"className":"cle-figure","layout":{"type":"default"}} -->
<div class="wp-block-group cle-figure"><!-- wp:paragraph -->
<p>4.8</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>rating from 1,465 reviews</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">How it works</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Build your sponsorship.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Pick what you'd like. We'll show which tier it adds up to, and send it to us in one click.</p>
<!-- /wp:paragraph -->

<!-- wp:cle/sponsor-builder {"align":"wide"} /-->

<!-- wp:paragraph {"textColor":"ink-soft","fontSize":"s"} -->
<p class="has-ink-soft-color has-text-color has-s-font-size">Figures in brackets are being finalized. Sponsorship covers venue, food and platform costs; it never buys a say in the program.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--l);padding-bottom:var(--wp--preset--spacing--l)"><!-- wp:columns {"verticalAlignment":"center","className":"cle-art-row"} -->
<div class="wp-block-columns are-vertically-aligned-center cle-art-row"><!-- wp:column {"verticalAlignment":"center","width":"64%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:64%"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">Corporate partners</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">More ways for a company to help.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Not every company has a sponsorship budget. These count just as much, and some are easier to approve.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"center","width":"36%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:36%"><?php echo $cle_art( 'corporate-partners', 360 ); ?></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:list {"className":"is-style-chapters"} -->
<ul class="wp-block-list is-style-chapters"><!-- wp:list-item -->
<li><strong>Give in kind</strong><br>Host a night in your space, cover the pizza, or lend a training room for a workshop.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><strong>Match your employees' gifts</strong><br>CLE AI &amp; DATA is a 501(c)(3), so gifts from your staff can qualify for your matching program. Tell your team we're on the list.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><strong>Run a workshop</strong><br>Send someone who has done the work to teach a hands-on session. Laptops open, real problems.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><strong>Hire from here</strong><br>Share your data and AI openings with our members, and meet candidates at the next big night.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list --></div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"indigo","textColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|xl","bottom":"var:preset|spacing|xl"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-paper-color has-indigo-background-color has-text-color has-background" style="padding-top:var(--wp--preset--spacing--xl);padding-bottom:var(--wp--preset--spacing--xl)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">Start a conversation</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"textColor":"paper"} -->
<h2 class="wp-block-heading has-paper-color has-text-color">Tell us how you'd like to help.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>A few questions about your company and what you have in mind. We reply within a week.</p>
<!-- /wp:paragraph -->

<!-- wp:cle/embed-form {"title":"Sponsor and partner inquiry","height":1300,"linkLabel":"Open the form in a new tab"} /-->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="mailto:info@cle-ai.com?subject=Sponsoring%20or%20partnering%20with%20CLE%20AI%20%26%20DATA">Or email info@cle-ai.com</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->
