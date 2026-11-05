<?php
/**
 * cle/embed-form: an iframe to a form hosted elsewhere, with a plain link underneath.
 * The iframe is sandboxed to what a form needs (scripts, its own origin, submitting, popups),
 * and only https URLs are accepted. allowPayment lets a donation form offer Apple/Google Pay;
 * linkUrl sends the fallback link somewhere friendlier than a bare embed address.
 *
 * @var array $attributes
 */

$url = (string) $attributes['url'];
if ( '' === $url || 'https' !== wp_parse_url( $url, PHP_URL_SCHEME ) ) {
	return;
}
$height = max( 200, (int) $attributes['height'] );
$label  = trim( (string) $attributes['title'] ) ?: __( 'Form', 'cle-ai' );
$link   = (string) $attributes['linkUrl'];
$link   = '' !== $link && 'https' === wp_parse_url( $link, PHP_URL_SCHEME ) ? $link : $url;
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
	<iframe class="cle-embed-form__frame" src="<?php echo esc_url( $url ); ?>" title="<?php echo esc_attr( $label ); ?>" height="<?php echo (int) $height; ?>" loading="lazy"<?php echo $attributes['allowPayment'] ? ' allow="payment"' : ''; ?> referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
	<p class="cle-embed-form__link"><a href="<?php echo esc_url( $link ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $attributes['linkLabel'] ); ?></a></p>
</div>
