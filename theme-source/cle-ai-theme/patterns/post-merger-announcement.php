<?php
/**
 * Title: Announcement: Data in the Land joins CLE AI & DATA (do not publish before Nov 4)
 * Slug: cle-ai/post-merger-announcement
 * Categories: cle-ai
 * Post Types: post
 * Block Types: core/post-content
 * Viewport Width: 960
 * Description: The long announcement for the blog, from the merger comms plan. Replace the [QUOTE] and [NAME] brackets, then schedule it for Wednesday, November 4, 2026. Keep it as a draft until then.
 */
// Clay illustrations bundled with the theme (decorative, so alt="" ).
$cle_art = function ( string $name, int $width = 0, string $align = 'center' ): string {
	$src = esc_url( get_theme_file_uri( "assets/illustrations/$name.webp" ) );
	if ( $width ) {
		return "<!-- wp:image {\"width\":\"{$width}px\",\"sizeSlug\":\"full\",\"linkDestination\":\"none\",\"align\":\"$align\",\"className\":\"cle-art\"} -->\n<figure class=\"wp-block-image align$align size-full is-resized cle-art\"><img src=\"$src\" alt=\"\" style=\"width:{$width}px\"/></figure>\n<!-- /wp:image -->";
	}
	return "<!-- wp:image {\"sizeSlug\":\"full\",\"linkDestination\":\"none\",\"align\":\"wide\",\"className\":\"cle-art\"} -->\n<figure class=\"wp-block-image alignwide size-full cle-art\"><img src=\"$src\" alt=\"\"/></figure>\n<!-- /wp:image -->";
};
?>
<?php echo $cle_art( 'merger-beads' ); ?>

<!-- wp:paragraph {"fontSize":"m"} -->
<p class="has-m-font-size">Two Cleveland volunteer communities come together to give Northeast Ohio's data and AI professionals more ways to connect, learn and grow.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>CLEVELAND, November 4, 2026: CLE AI &amp; DATA and Data in the Land are joining forces. Data in the Land, a community for analytics, data science and data engineering professionals across Northeast Ohio, will dissolve and fold into CLE AI &amp; DATA, bringing its members into a volunteer-run community of more than 4,000 people.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Both groups started with the same idea: people learn faster and go further when they learn together. Data in the Land was founded in 2025 to help data professionals at every career stage network, share skills and grow in Cleveland's evolving data landscape. CLE AI &amp; DATA traces its roots to a Hadoop user group started in 2010 and has hosted 183 events since, from monthly socials to auditorium talks with speakers from across the industry.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>This is not the first time Cleveland's data community has grown by coming together. In 2024, the original Hadoop group and Cleveland AI merged to form CLE AI &amp; DATA. Welcoming Data in the Land is the natural next step, and it moves CLE AI &amp; DATA closer to its mission: making AI accessible to everyone, and seeing Cleveland's AI and data jobs filled by Cleveland professionals.</p>
<!-- /wp:paragraph -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>[QUOTE FROM A CLE AI &amp; DATA LEADER: why this matters for Cleveland's data and AI community, and what Data in the Land members can expect.]</p>
<!-- /wp:paragraph --><cite>[NAME], [TITLE], CLE AI &amp; DATA</cite></blockquote>
<!-- /wp:quote -->

<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>[QUOTE FROM A DATA IN THE LAND FOUNDER: why they chose to fold Data in the Land into CLE AI &amp; DATA, and what their members gain.]</p>
<!-- /wp:paragraph --><cite>[NAME], [TITLE], Data in the Land</cite></blockquote>
<!-- /wp:quote -->

<!-- wp:heading -->
<h2 class="wp-block-heading">What this means for Data in the Land members</h2>
<!-- /wp:heading -->

<!-- wp:columns {"verticalAlignment":"center","className":"cle-art-row"} -->
<div class="wp-block-columns are-vertically-aligned-center cle-art-row"><!-- wp:column {"verticalAlignment":"center","width":"64%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:64%"><!-- wp:list {"className":"is-style-chapters"} -->
<ul class="wp-block-list is-style-chapters"><!-- wp:list-item -->
<li><strong>New: weekly job postings</strong><br>Data and AI job openings posted every week on the CLE AI &amp; DATA LinkedIn page.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><strong>New: east side meetups</strong><br>Regular meetups on Cleveland's east side, in addition to monthly socials at Happy Dog, big-night speaker events, hands-on workshops, hikes and volunteer days. All free.</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><strong>A bigger network</strong><br>More than 4,000 members across data, AI and the businesses that use them.</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list --></div>
<!-- /wp:column -->

<!-- wp:column {"verticalAlignment":"center","width":"36%"} -->
<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:36%"><?php echo $cle_art( 'job-board', 260 ); ?></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<?php echo $cle_art( 'east-side-taproom' ); ?>

<!-- wp:heading -->
<h2 class="wp-block-heading">What this means for CLE AI &amp; DATA members</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>More data practitioners in the room, more technical depth in our programming, weekly job postings and new east side meetups. Same welcome as always.</p>
<!-- /wp:paragraph -->

<!-- wp:cle/mascot {"pose":"welcome","width":240,"align":"center"} /-->

<!-- wp:heading -->
<h2 class="wp-block-heading">Come say hello</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Join us Tuesday, November 17, from 6 to 8 PM at Happy Dog (5801 Detroit Avenue, Gordon Square) for a Data in the Land welcome night. No slides, no agenda. Just good conversation.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://www.meetup.com/cleveland-ai-data/">RSVP on Meetup</a></div>
<!-- /wp:button -->

<!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="#">[CLE AI &amp; DATA LinkedIn page]</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:paragraph -->
<p>Questions? Reach us at <a href="mailto:info@cle-ai.com">info@cle-ai.com</a>.</p>
<!-- /wp:paragraph -->
