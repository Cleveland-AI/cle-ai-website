<?php
/**
 * cle/team: one card per person, photo from assets/team/<photo>.webp (the shape treatment).
 * Someone with a bio, LinkedIn or website gets a button over their photo and name that opens a
 * modal card about them (a <dialog> per person, opened by view.js). People without any of those
 * just wobble on hover, so nothing half-empty is ever shown. Without JavaScript the card's
 * contents sit under the photo instead.
 *
 * @var array $attributes
 */

// A person marked hidden (for example someone joining with an announcement) isn't shown yet.
$people = array_values( array_filter( (array) $attributes['members'], fn( $m ) => '' !== trim( (string) ( $m['name'] ?? '' ) ) && empty( $m['hidden'] ) ) );
if ( ! $people ) {
	return;
}
$uid    = wp_unique_id( 'cle-team-' );
$photo  = function ( array $p ): string {
	$file = sanitize_file_name( (string) ( $p['photo'] ?? '' ) );
	$path = get_theme_file_path( "assets/team/$file.webp" );
	// The file's modified time in the URL, so browsers and the CDN fetch a replaced photo right away.
	return $file && file_exists( $path ) ? add_query_arg( 'v', filemtime( $path ), get_theme_file_uri( "assets/team/$file.webp" ) ) : '';
};
$has    = fn( array $p ) => '' !== trim( (string) ( $p['bio'] ?? '' ) ) || '' !== esc_url( (string) ( $p['linkedin'] ?? '' ) ) || '' !== esc_url( (string) ( $p['site'] ?? '' ) );
$first  = fn( array $p ) => strtok( (string) $p['name'], ' ' );
$open   = array_keys( array_filter( $people, $has ) ); // People with a card, in order, for "Meet …".
$arrow  = '<svg class="cle-team-modal__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// The LinkedIn "in" mark, drawn inline so it takes the clay button's colour.
$in_logo = '<svg class="cle-in" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.25 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 13.4c0-3.1-1.66-4.54-3.87-4.54a3.34 3.34 0 0 0-3.03 1.67V8.5h-3.24c.04.95 0 11.5 0 11.5h3.24v-6.42c0-.34.03-.69.13-.93.27-.69.9-1.4 1.95-1.4 1.38 0 1.93 1.05 1.93 2.6V20h3.38l-.49-6.6Z"/></svg>';
?>
<ul <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-team-cards' ] ); ?>>
	<?php foreach ( $people as $i => $p ) : ?>
		<?php
		$src  = $photo( $p );
		$card = $has( $p );
		$id   = "$uid-$i";
		$init = strtoupper( implode( '', array_map( fn( $w ) => mb_substr( $w, 0, 1 ), array_slice( preg_split( '/\s+/', trim( (string) $p['name'] ) ), 0, 2 ) ) ) );
		// No headshot yet: their initials on a clay shape, so the row still lines up.
		$img  = $src
			? sprintf( '<img class="cle-team-card__photo" src="%s" alt="" width="640" height="700" loading="lazy" decoding="async">', esc_url( $src ) )
			: sprintf( '<span class="cle-team-card__photo cle-team-card__initials" aria-hidden="true" style="--c:var(--wp--preset--color--%s)"><span>%s</span></span>', esc_attr( [ 'pale-blue', 'yellow', 'green', 'coral' ][ $i % 4 ] ), esc_html( $init ) );
		$name = sprintf( '<span class="cle-team-card__name">%s</span>', esc_html( $p['name'] ) );
		?>
		<li class="cle-team-card<?php echo $card ? ' has-card' : ''; ?>">
			<?php if ( $card ) : ?>
				<button type="button" class="cle-team-card__open" aria-haspopup="dialog" aria-controls="<?php echo esc_attr( $id ); ?>">
					<?php echo $img . $name; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts above. ?>
					<span class="screen-reader-text"><?php printf( /* translators: %s: first name. */ esc_html__( ', more about %s', 'cle-ai' ), esc_html( $first( $p ) ) ); ?></span>
				</button>
			<?php else : ?>
				<?php echo $img . $name; // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<?php endif; ?>
			<p class="cle-team-card__role"><?php echo esc_html( (string) ( $p['role'] ?? '' ) ); ?></p>
			<?php $card_li = esc_url( (string) ( $p['linkedin'] ?? '' ) ); ?>
			<?php if ( $card_li ) : ?>
				<a class="cle-team-card__in" href="<?php echo $card_li; // phpcs:ignore WordPress.Security.EscapeOutput -- esc_url above. ?>" rel="noopener" target="_blank"><?php echo $in_logo; // phpcs:ignore WordPress.Security.EscapeOutput ?><span class="screen-reader-text"><?php printf( /* translators: %s: a person's name. */ esc_html__( '%s on LinkedIn (opens in a new tab)', 'cle-ai' ), esc_html( $p['name'] ) ); ?></span></a>
			<?php endif; ?>
			<?php if ( ! empty( $p['lead'] ) ) : ?>
				<p class="cle-team-card__lead"><?php echo esc_html( $attributes['leadLabel'] ); ?></p>
			<?php endif; ?>

			<?php if ( $card ) : ?>
				<?php
				$bio  = trim( (string) ( $p['bio'] ?? '' ) );
				$li   = esc_url( (string) ( $p['linkedin'] ?? '' ) );
				$site = esc_url( (string) ( $p['site'] ?? '' ) );
				$pos  = array_search( $i, $open, true );
				$next = count( $open ) > 1 ? $open[ ( $pos + 1 ) % count( $open ) ] : null;
				?>
				<dialog class="cle-team-modal" id="<?php echo esc_attr( $id ); ?>" aria-labelledby="<?php echo esc_attr( "$id-name" ); ?>">
					<div class="cle-team-modal__card">
						<button type="button" class="cle-team-modal__close" data-close><span aria-hidden="true">×</span><span class="screen-reader-text"><?php esc_html_e( 'Close', 'cle-ai' ); ?></span></button>
						<div class="cle-team-modal__photo"><?php echo $src ? '<img src="' . esc_url( $src ) . '" alt="" width="640" height="700" loading="lazy" decoding="async">' : $img; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above. ?></div>
						<div class="cle-team-modal__body">
							<?php if ( ! empty( $p['lead'] ) ) : ?>
								<p class="cle-team-modal__lead"><?php echo esc_html( $attributes['leadLabel'] ); ?></p>
							<?php endif; ?>
							<h3 class="cle-team-modal__name" id="<?php echo esc_attr( "$id-name" ); ?>" tabindex="-1" autofocus><?php echo esc_html( $p['name'] ); ?></h3>
							<?php if ( ! empty( $p['role'] ) ) : ?>
								<p class="cle-team-modal__role"><?php echo esc_html( $p['role'] ); ?></p>
							<?php endif; ?>
							<?php if ( '' !== $bio ) : ?>
								<p class="cle-team-modal__bio"><?php echo esc_html( $bio ); ?></p>
							<?php endif; ?>
							<?php if ( $li || $site ) : ?>
								<p class="cle-team-modal__links">
									<?php if ( $li ) : ?>
										<a class="cle-team-modal__link is-linkedin" href="<?php echo $li; // phpcs:ignore WordPress.Security.EscapeOutput -- esc_url above. ?>" rel="noopener" target="_blank"><?php echo $in_logo; // phpcs:ignore WordPress.Security.EscapeOutput ?><?php esc_html_e( 'LinkedIn', 'cle-ai' ); ?><?php echo $arrow; // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
									<?php endif; ?>
									<?php if ( $site ) : ?>
										<a class="cle-team-modal__link" href="<?php echo $site; // phpcs:ignore WordPress.Security.EscapeOutput ?>" rel="noopener" target="_blank"><?php esc_html_e( 'Website', 'cle-ai' ); ?><?php echo $arrow; // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
									<?php endif; ?>
								</p>
							<?php endif; ?>
							<?php if ( null !== $next ) : ?>
								<button type="button" class="cle-team-modal__next" data-next="<?php echo esc_attr( "$uid-$next" ); ?>">
									<?php printf( /* translators: %s: the next person's first name. */ esc_html__( 'Meet %s', 'cle-ai' ), esc_html( $first( $people[ $next ] ) ) ); ?> <span aria-hidden="true">→</span>
								</button>
							<?php endif; ?>
						</div>
					</div>
				</dialog>
			<?php endif; ?>
		</li>
	<?php endforeach; ?>
</ul>
