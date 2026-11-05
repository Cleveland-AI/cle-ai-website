<?php
/**
 * Title: Footer legal links
 * Slug: cle-ai/footer-legal
 * Inserter: no
 * Description: Privacy policy and code of conduct links for the footer. A pattern (not plain HTML in the footer) so the links follow the site's permalinks.
 */
$cle_page_url = fn( string $slug ) => ( $p = get_page_by_path( $slug ) ) ? get_permalink( $p ) : home_url( $GLOBALS['wp_rewrite']->root . "$slug/" );
?>
<!-- wp:paragraph {"className":"cle-footer__legal","fontSize":"s"} -->
<p class="cle-footer__legal has-s-font-size"><a href="<?php echo esc_url( $cle_page_url( 'privacy' ) ); ?>">Privacy policy</a> · <a href="<?php echo esc_url( $cle_page_url( 'code-of-conduct' ) ); ?>">Code of conduct</a></p>
<!-- /wp:paragraph -->
