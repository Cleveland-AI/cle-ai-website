<?php
/**
 * cle/sponsor-builder: tap perks, watch the package fill, see the tier it adds up to, and
 * send it. Each perk has a weight; the tier is the highest one whose "min" the total reaches.
 * Without JavaScript the perks are a plain list and the button is a plain email link.
 *
 * The button goes to formUrl when set: a Google Form pre-filled link in which the package
 * answer reads PACKAGE (replaced with the visitor's picks). Otherwise it opens an email.
 *
 * @var array $attributes
 */

$perks = array_values( array_filter( (array) $attributes['perks'], fn( $p ) => '' !== trim( (string) ( $p['label'] ?? '' ) ) ) );
$tiers = array_values( array_filter( (array) $attributes['tiers'], fn( $t ) => '' !== trim( (string) ( $t['name'] ?? '' ) ) ) );
if ( ! $perks ) {
	return;
}
usort( $tiers, fn( $a, $b ) => (float) ( $a['min'] ?? 0 ) <=> (float) ( $b['min'] ?? 0 ) );
$email  = sanitize_email( $attributes['email'] ) ?: 'info@cle-ai.com';
$mailto = 'mailto:' . $email . '?subject=' . rawurlencode( 'Sponsoring CLE AI & DATA' );
$form   = 'https' === wp_parse_url( (string) $attributes['formUrl'], PHP_URL_SCHEME ) ? (string) $attributes['formUrl'] : '';
$uid    = wp_unique_id( 'cle-builder-' );
$data   = wp_json_encode( array_map( fn( $t ) => [ 'name' => (string) $t['name'], 'min' => (float) ( $t['min'] ?? 0 ), 'price' => (string) ( $t['price'] ?? '' ) ], $tiers ) );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-builder' ] ); ?> data-tiers="<?php echo esc_attr( $data ); ?>" data-form="<?php echo esc_url( $form ); ?>" data-mailto="<?php echo esc_attr( $mailto ); ?>">
	<div class="cle-builder__picks" role="group" aria-labelledby="<?php echo esc_attr( $uid ); ?>-label">
		<p class="cle-builder__label" id="<?php echo esc_attr( $uid ); ?>-label"><?php esc_html_e( 'Pick what you would like', 'cle-ai' ); ?></p>
		<?php foreach ( $perks as $i => $perk ) : ?>
			<button type="button" class="cle-builder__perk" aria-pressed="false" data-weight="<?php echo esc_attr( (string) (float) ( $perk['weight'] ?? 1 ) ); ?>" data-label="<?php echo esc_attr( $perk['label'] ); ?>">
				<?php echo cle_art_img( (string) ( $perk['art'] ?? '' ), $i, 'cle-builder__icon' ); ?>
				<span class="cle-builder__text">
					<strong><?php echo esc_html( $perk['label'] ); ?></strong>
					<?php if ( ! empty( $perk['desc'] ) ) : ?>
						<span><?php echo esc_html( $perk['desc'] ); ?></span>
					<?php endif; ?>
				</span>
				<span class="cle-builder__check" aria-hidden="true"></span>
			</button>
		<?php endforeach; ?>
	</div>

	<div class="cle-builder__summary">
		<div class="cle-builder__pile" aria-hidden="true">
			<?php foreach ( $perks as $i => $perk ) : ?>
				<?php echo cle_art_img( (string) ( $perk['art'] ?? '' ), $i, 'cle-builder__piece' ); ?>
			<?php endforeach; ?>
		</div>
		<p class="cle-builder__result" aria-live="polite"><?php esc_html_e( 'Pick one or more and we will suggest a package.', 'cle-ai' ); ?></p>
		<?php if ( $tiers ) : ?>
			<ol class="cle-builder__tiers">
				<?php foreach ( $tiers as $tier ) : ?>
					<li><span><?php echo esc_html( $tier['name'] ); ?></span> <span class="cle-builder__price"><?php echo esc_html( (string) ( $tier['price'] ?? '' ) ); ?></span></li>
				<?php endforeach; ?>
			</ol>
		<?php endif; ?>
		<p><a class="wp-element-button cle-builder__cta" href="<?php echo esc_url( $form ?: $mailto ); ?>"><?php echo esc_html( $attributes['buttonLabel'] ); ?></a></p>
	</div>
</div>
