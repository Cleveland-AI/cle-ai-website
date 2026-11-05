<?php
/**
 * Title: Code of conduct page
 * Slug: cle-ai/page-code-of-conduct
 * Categories: cle-ai
 * Post Types: page
 * Block Types: core/post-content
 * Viewport Width: 1280
 * Description: The code of conduct every event and online space runs under: what we expect, what isn't OK, how to report, and what organizers do. Use with the "Landing page (no title)" template, at the URL slug code-of-conduct (the About page links there).
 */
$cle_list = function ( array $items ): string {
	$li = implode( "\n\n", array_map( fn( $i ) => "<!-- wp:list-item -->\n<li>$i</li>\n<!-- /wp:list-item -->", $items ) );
	return "<!-- wp:list -->\n<ul class=\"wp-block-list\">$li</ul>\n<!-- /wp:list -->";
};
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|section","bottom":"var:preset|spacing|section"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--section);padding-bottom:var(--wp--preset--spacing--section)"><!-- wp:paragraph {"className":"is-style-eyebrow"} -->
<p class="is-style-eyebrow">Code of conduct</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":1,"className":"is-style-light","fontSize":"xxxl"} -->
<h1 class="wp-block-heading is-style-light has-xxxl-font-size">Be kind, be curious, make <strong>room</strong>.</h1>
<!-- /wp:heading -->

<!-- wp:paragraph {"fontSize":"m"} -->
<p class="has-m-font-size">CLE AI &amp; DATA is for everyone, from the curious to the decision makers. This code applies at everything we run or co-host: talks, socials, workshops, hikes and volunteer days. It also applies in our online spaces: Discord, Meetup, our Substack and social media. It covers everyone there, including attendees, speakers, sponsors, volunteers and organizers.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">What we expect</h2>
<!-- /wp:heading -->

<?php
echo $cle_list( [ // phpcs:ignore WordPress.Security.EscapeOutput -- static text.
	'<strong>Be welcoming.</strong> Say hello, bring the person at the edge of the circle into the conversation, and assume good intent.',
	'<strong>Share what you know, generously.</strong> Every question is a fair question here. Explain without talking down, and remember everyone in the room started somewhere.',
	'<strong>Respect people\'s time, space and "no".</strong> If someone ends a conversation, declines a follow-up or steps back, let them.',
	'<strong>Ask before you photograph, record or quote someone.</strong> Our photographers will ask too. You can always say you\'d rather not be in pictures.',
	'<strong>Keep selling low-key.</strong> Talk about your work and what your company does, but don\'t pitch people who didn\'t ask, and don\'t collect contacts for sales lists. This includes sponsors.',
	'<strong>Look out for each other.</strong> If something seems off, check in with the person, or tell an organizer.',
] );
?>


<!-- wp:heading -->
<h2 class="wp-block-heading">What isn't OK</h2>
<!-- /wp:heading -->

<?php
echo $cle_list( [ // phpcs:ignore WordPress.Security.EscapeOutput -- static text.
	'Harassment, intimidation or discrimination of any kind, including about gender, gender identity or expression, sexual orientation, disability, appearance, body size, race, ethnicity, nationality, age, religion, or how much experience someone has.',
	'Unwelcome sexual attention or physical contact, and sexual language or imagery in talks, slides or chat.',
	'Insulting or demeaning comments, in person or online, including ones passed off as jokes.',
	'Following, stalking or deliberately intimidating someone, at an event or afterwards.',
	'Sharing someone\'s personal information, photos or recordings without their consent.',
	'Using AI to make images, audio, video or text of a real person without their consent, or putting other people\'s private data into a demo.',
	'Repeatedly disrupting a talk, workshop or conversation.',
	'Getting back at anyone for reporting a concern or helping with a report.',
] );
?>


<!-- wp:paragraph -->
<p>Some of our evenings are at a bar. Drinking is never an excuse for any of the above.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">If something happens</h2>
<!-- /wp:heading -->

<?php
echo $cle_list( [ // phpcs:ignore WordPress.Security.EscapeOutput -- static text.
	'<strong>At an event:</strong> tell any organizer. You\'ll find us at the welcome table, and we\'ll step somewhere quiet with you.',
	'<strong>Any time:</strong> email <a href="mailto:info@cle-ai.com">info@cle-ai.com</a>, or message an organizer on Discord.',
	'<strong>If you or someone else is in danger,</strong> call 911 first, then tell us.',
	'You don\'t have to be sure something "counts" to tell us, and you can stay anonymous. We\'ll still act, though we may not be able to follow up with you.',
] );
?>


<!-- wp:paragraph -->
<p>We keep reports confidential and share only what we must to keep people safe. We aim to reply within two days.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">What we'll do</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Organizers will listen, ask what would help, and decide what to do. That can be a conversation, a warning, asking someone to leave an event, removing them from Discord or Meetup, or banning them from future events. The same goes for speakers and sponsors: we can stop a talk or end a sponsorship. Where we can, we'll let the person who raised the concern know it has been handled.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"textColor":"ink-soft","fontSize":"s"} -->
<p class="has-ink-soft-color has-text-color has-s-font-size">Questions about this code: <a href="mailto:info@cle-ai.com">info@cle-ai.com</a>. CLE AI &amp; DATA (Cleveland AI and Data) is a volunteer-run 501(c)(3) nonprofit. Last updated October 2026.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
