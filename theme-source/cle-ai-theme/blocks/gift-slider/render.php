<?php
/**
 * cle/gift-slider: pick an amount, see what it pays for. Each step's object joins the pile, so
 * a bigger gift shows everything the smaller ones cover too. Without JavaScript it is a plain
 * list of amounts and what each covers.
 *
 * @var array $attributes
 */

$steps = array_values( array_filter( (array) $attributes['steps'], fn( $s ) => (float) ( $s['amount'] ?? 0 ) > 0 ) );
if ( ! $steps ) {
	return;
}
usort( $steps, fn( $a, $b ) => (float) $a['amount'] <=> (float) $b['amount'] );
$start  = max( 0, min( count( $steps ) - 1, (int) $attributes['start'] ) );
$money  = fn( $n ) => '$' . number_format_i18n( (float) $n );
$uid    = wp_unique_id( 'cle-gift-' );
$label  = (string) $attributes['buttonLabel'];
$data   = wp_json_encode( array_map( fn( $s ) => [ 'amount' => $money( $s['amount'] ), 'label' => (string) ( $s['label'] ?? '' ) ], $steps ) );
$target = (string) $attributes['target'];
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-gift' ] ); ?> data-steps="<?php echo esc_attr( $data ); ?>" data-button="<?php echo esc_attr( $label ); ?>">
	<div class="cle-gift__live" hidden>
		<p class="cle-gift__amount" aria-hidden="true"><?php echo esc_html( $money( $steps[ $start ]['amount'] ) ); ?></p>
		<div class="cle-gift__pile" aria-hidden="true">
			<?php foreach ( $steps as $i => $step ) : ?>
				<?php echo cle_art_img( (string) ( $step['art'] ?? '' ), $i, 'cle-gift__piece' . ( $i <= $start ? ' is-on' : '' ) ); ?>
			<?php endforeach; ?>
		</div>
		<p class="cle-gift__covers" aria-live="polite"><?php echo esc_html( $steps[ $start ]['label'] ); ?></p>
		<label class="screen-reader-text" for="<?php echo esc_attr( $uid ); ?>"><?php esc_html_e( 'Gift amount', 'cle-ai' ); ?></label>
		<input class="cle-gift__range" id="<?php echo esc_attr( $uid ); ?>" type="range" min="0" max="<?php echo count( $steps ) - 1; ?>" step="1" value="<?php echo (int) $start; ?>" aria-valuetext="<?php echo esc_attr( $money( $steps[ $start ]['amount'] ) . ': ' . $steps[ $start ]['label'] ); ?>">
		<div class="cle-gift__ticks" aria-hidden="true">
			<?php foreach ( $steps as $step ) : ?>
				<span><?php echo esc_html( $money( $step['amount'] ) ); ?></span>
			<?php endforeach; ?>
		</div>
		<p><a class="wp-element-button cle-gift__cta" href="<?php echo esc_attr( $target ); ?>"><?php echo esc_html( sprintf( $label, $money( $steps[ $start ]['amount'] ) ) ); ?></a></p>
	</div>
	<ul class="cle-gift__list">
		<?php foreach ( $steps as $step ) : ?>
			<li><strong><?php echo esc_html( $money( $step['amount'] ) ); ?></strong> <?php echo esc_html( (string) ( $step['label'] ?? '' ) ); ?></li>
		<?php endforeach; ?>
	</ul>
</div>
