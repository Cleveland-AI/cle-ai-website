<?php
/**
 * CLE AI & DATA theme: setup, assets, blocks and Meetup event helpers.
 */

defined( 'ABSPATH' ) || exit;

require __DIR__ . '/inc/icons.php';
require __DIR__ . '/inc/story.php';
require __DIR__ . '/inc/hotspots.php';
require __DIR__ . '/inc/art.php';

add_action( 'after_setup_theme', function () {
	add_theme_support( 'editor-styles' );
	add_editor_style( 'style.css' );
	register_nav_menus( [
		'primary' => __( 'Primary', 'cle-ai' ),
		'social'  => __( 'Social', 'cle-ai' ),
	] );
} );

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( 'cle-ai', get_stylesheet_uri(), [], filemtime( get_theme_file_path( 'style.css' ) ) );
	wp_enqueue_script( 'cle-figures' );
} );

// Runs before first paint: html.cle-js tells CSS that scripts run (the story stage needs it),
// and html.cle-logo-seen skips the logo's drop-in after the first page of a visit.
add_action( 'wp_head', function () {
	wp_print_inline_script_tag(
		"(function(d){d.classList.add('cle-js');try{if(sessionStorage.getItem('cle-logo-seen'))d.classList.add('cle-logo-seen')}catch(e){}})(document.documentElement);"
	);
}, 1 );

add_action( 'init', function () {
	// Shared by cle/hotspot-scene and cle/story; registered before the blocks that list them.
	wp_register_script( 'cle-hotspots', get_theme_file_uri( 'assets/js/hotspots.js' ), [], filemtime( get_theme_file_path( 'assets/js/hotspots.js' ) ), true );
	wp_register_style( 'cle-hotspots', get_theme_file_uri( 'assets/css/hotspots.css' ), [], filemtime( get_theme_file_path( 'assets/css/hotspots.css' ) ) );
	// Big figures (About tiles, the homepage figures line) count up as they scroll into view.
	wp_register_script( 'cle-figures', get_theme_file_uri( 'assets/js/figures.js' ), [], filemtime( get_theme_file_path( 'assets/js/figures.js' ) ), true );
	// Confetti for small celebrations (sponsor builder, way-finder, Dot).
	wp_register_script( 'cle-confetti', get_theme_file_uri( 'assets/js/confetti.js' ), [], filemtime( get_theme_file_path( 'assets/js/confetti.js' ) ), true );
	wp_register_style( 'cle-confetti', get_theme_file_uri( 'assets/css/confetti.css' ), [], filemtime( get_theme_file_path( 'assets/css/confetti.css' ) ) );
	// Sidebar list editor shared by the interactive page blocks (sponsor builder, gift slider, ...).
	wp_register_script( 'cle-array-panel', get_theme_file_uri( 'assets/js/array-panel.js' ), [ 'wp-element', 'wp-components', 'wp-i18n', 'wp-block-editor', 'wp-server-side-render' ], filemtime( get_theme_file_path( 'assets/js/array-panel.js' ) ), true );
	foreach ( glob( __DIR__ . '/blocks/*', GLOB_ONLYDIR ) as $dir ) {
		register_block_type( $dir );
	}
	foreach ( [ 'core/paragraph', 'core/heading' ] as $block ) {
		register_block_style( $block, [ 'name' => 'eyebrow', 'label' => __( 'Eyebrow', 'cle-ai' ) ] );
	}
	// Brand kit text styles: a light headline with one bold ink-blue word, and numbered chapter lists.
	register_block_style( 'core/heading', [ 'name' => 'light', 'label' => __( 'Light (bold one word)', 'cle-ai' ) ] );
	register_block_style( 'core/list', [ 'name' => 'chapters', 'label' => __( 'Numbered chapters', 'cle-ai' ) ] );
	// Pictures get a soft clay frame; "Plain" drops it, for illustrations on a transparent background.
	register_block_style( 'core/image', [ 'name' => 'plain', 'label' => __( 'Plain (no frame)', 'cle-ai' ) ] );
	register_block_pattern_category( 'cle-ai', [ 'label' => __( 'CLE AI & DATA', 'cle-ai' ) ] );
} );

add_action( 'enqueue_block_editor_assets', function () {
	$file = 'assets/js/editor.js';
	wp_enqueue_script( 'cle-ai-editor', get_theme_file_uri( $file ), [ 'wp-blocks', 'wp-i18n' ], filemtime( get_theme_file_path( $file ) ), true );
	wp_add_inline_script( 'cle-ai-editor', 'window.cleTheme = ' . wp_json_encode( [ 'icons' => cle_icons_all(), 'story' => cle_story_asset_urls() ] ) . ';', 'before' );
} );

// Upcoming/past event query loops: a core/query block whose query has "cleWhen" set.
add_filter( 'query_loop_block_query_vars', function ( $vars, $block ) {
	$when = $block->context['query']['cleWhen'] ?? '';
	if ( ! in_array( $when, [ 'upcoming', 'past' ], true ) ) {
		return $vars;
	}
	$vars = array_merge( $vars, cle_event_query_args( $when ) );
	if ( 'upcoming' === $when ) {
		$vars['posts_per_page'] = -1; // every upcoming event; only the past list pages
	}
	return $vars;
}, 10, 2 );

// The site has served upload URLs as http:// while running on https://. Always emit https.
if ( 'https' === wp_parse_url( home_url(), PHP_URL_SCHEME ) ) {
	add_filter( 'wp_get_attachment_url', fn( $url ) => set_url_scheme( $url, 'https' ) );
	add_filter( 'wp_calculate_image_srcset', function ( $sources ) {
		foreach ( (array) $sources as $i => $source ) {
			$sources[ $i ]['url'] = set_url_scheme( $source['url'], 'https' );
		}
		return $sources;
	} );
}

/*
 * Meetup events. Meta comes from the Meetup Import plugin and is not in the REST API,
 * so everything is rendered server-side. Times are split over four 12-hour fields.
 */

/** Today in the site's timezone (Settings → General), as Y-m-d. */
function cle_today(): string {
	return wp_date( 'Y-m-d' );
}

/**
 * The one place event date/time fields are parsed. $which is 'start' or 'end'. Times are split
 * over four 12-hour fields; wp_timezone() follows Settings → General and handles DST.
 */
function cle_event_datetime( int $post_id, string $which = 'start' ): ?DateTimeImmutable {
	$date = get_post_meta( $post_id, "event_{$which}_date", true );
	if ( ! $date ) {
		return null;
	}
	$hour = get_post_meta( $post_id, "event_{$which}_hour", true ) ?: '12';
	$min  = get_post_meta( $post_id, "event_{$which}_minute", true ) ?: '00';
	$mer  = get_post_meta( $post_id, "event_{$which}_meridian", true ) ?: 'pm';

	$dt = DateTimeImmutable::createFromFormat( '!Y-m-d h:i a', "{$date} {$hour}:{$min} {$mer}", wp_timezone() );
	return $dt ?: null;
}

/** Past once the event has ended (or, with no end time, started). */
function cle_event_is_past( int $post_id ): bool {
	$end = cle_event_datetime( $post_id, 'end' ) ?: cle_event_datetime( $post_id, 'start' );
	return $end ? $end < new DateTimeImmutable( 'now', wp_timezone() ) : false;
}

/** Short form for cards: "Monday, September 28 · 5:00 pm – 8:00 pm". */
function cle_event_when( int $post_id, string $date_format = 'l, F j' ): string {
	$start = cle_event_datetime( $post_id );
	if ( ! $start ) {
		return '';
	}
	$tz  = $start->getTimezone();
	$out = wp_date( $date_format . ' · g:i a', $start->getTimestamp(), $tz );
	$end = cle_event_datetime( $post_id, 'end' );
	if ( $end && $end > $start && $end->format( 'Ymd' ) === $start->format( 'Ymd' ) ) {
		$out .= ' – ' . wp_date( 'g:i a', $end->getTimestamp(), $tz );
	}
	return $out;
}

/**
 * Event page form: "Monday, 28 September 2026, 5:00 – 8:30 PM". The date shows once when start
 * and end share a day (AM/PM once too when they share it); start only when there is no end.
 */
function cle_event_when_long( int $post_id ): string {
	$start = cle_event_datetime( $post_id );
	if ( ! $start ) {
		return '';
	}
	$tz   = $start->getTimezone();
	$f    = fn( DateTimeImmutable $d, string $format ) => wp_date( $format, $d->getTimestamp(), $tz );
	$date = $f( $start, 'l, j F Y' );
	$end  = cle_event_datetime( $post_id, 'end' );
	if ( ! $end || $end <= $start ) {
		return $date . ', ' . $f( $start, 'g:i A' );
	}
	if ( $end->format( 'Ymd' ) !== $start->format( 'Ymd' ) ) {
		return $date . ', ' . $f( $start, 'g:i A' ) . ' – ' . $f( $end, 'l, j F Y, g:i A' );
	}
	$from = $start->format( 'A' ) === $end->format( 'A' ) ? $f( $start, 'g:i' ) : $f( $start, 'g:i A' );
	return $date . ', ' . $from . ' – ' . $f( $end, 'g:i A' );
}

/** Name plus full address on one line, for cards and the next-event blocks. */
function cle_event_venue( int $post_id ): string {
	return implode( ', ', array_unique( array_filter( [ cle_event_meta( $post_id, 'venue_name' ), cle_event_address( $post_id ) ] ) ) );
}

/** "1 Wade Oval Drive, Cleveland, OH 44106"; '' when there is no address data. */
function cle_event_address( int $post_id ): string {
	$state_zip = trim( cle_event_meta( $post_id, 'venue_state' ) . ' ' . cle_event_meta( $post_id, 'venue_zipcode' ) );
	return implode( ', ', array_filter( [ cle_event_meta( $post_id, 'venue_address' ), cle_event_meta( $post_id, 'venue_city' ), $state_zip ] ) );
}

/** Trimmed string meta; every event field can be empty. */
function cle_event_meta( int $post_id, string $key ): string {
	return trim( (string) get_post_meta( $post_id, $key, true ) );
}

/** Google Maps link: lat/lon when both are set, else the URL-encoded address (or venue name). */
function cle_event_map_url( int $post_id ): string {
	$lat = cle_event_meta( $post_id, 'venue_lat' );
	$lon = cle_event_meta( $post_id, 'venue_lon' );
	if ( is_numeric( $lat ) && is_numeric( $lon ) ) {
		return "https://www.google.com/maps/search/?api=1&query={$lat},{$lon}";
	}
	$q = cle_event_address( $post_id ) ?: cle_event_meta( $post_id, 'venue_name' );
	return '' !== $q ? 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode( $q ) : '';
}

function cle_event_rsvp_url( int $post_id ): string {
	return set_url_scheme( (string) get_post_meta( $post_id, 'ime_event_link', true ), 'https' );
}

/** event_start_date is a zero-padded Y-m-d string, so it sorts correctly as a string. */
function cle_event_query_args( string $when ): array {
	$upcoming = 'upcoming' === $when;
	return [
		'post_type'   => 'meetup_events',
		'post_status' => 'publish',
		'meta_key'    => 'event_start_date',
		'orderby'     => 'meta_value',
		'meta_type'   => 'DATE',
		'order'       => $upcoming ? 'ASC' : 'DESC',
		'meta_query' => [ [
			'key'     => 'event_start_date',
			'value'   => cle_today(),
			'compare' => $upcoming ? '>=' : '<',
			'type'    => 'DATE',
		] ],
	];
}

/** @return WP_Post[] */
function cle_events( string $when, int $count ): array {
	if ( ! post_type_exists( 'meetup_events' ) ) {
		return [];
	}
	return get_posts( cle_event_query_args( $when ) + [ 'posts_per_page' => $count, 'no_found_rows' => true ] );
}

/** Soonest upcoming event whose title contains $needle (case-insensitive); optionally any event if none match. */
function cle_find_event( string $needle, bool $fallback = false ): ?WP_Post {
	$events = cle_events( 'upcoming', 50 );
	foreach ( $events as $event ) {
		if ( '' === $needle || false !== stripos( $event->post_title, $needle ) ) {
			return $event;
		}
	}
	return $fallback ? ( $events[0] ?? null ) : null;
}

// A page built from one of the theme's page patterns brings its own headline (an h1), so the
// page title isn't repeated above it, whichever template the page uses. The section padding the
// default template adds at the top is dropped too, since the pattern brings its own.
add_filter( 'render_block_core/post-title', function ( string $html, array $block, WP_Block $instance ) {
	$id = (int) ( $instance->context['postId'] ?? 0 );
	if ( $id && is_page( $id ) && $id === get_queried_object_id() && str_contains( (string) get_post_field( 'post_content', $id ), '<h1' ) ) {
		return '';
	}
	return $html;
}, 10, 3 );
add_filter( 'body_class', function ( array $classes ) {
	if ( is_page() && str_contains( (string) get_post_field( 'post_content', get_queried_object_id() ), '<h1' ) ) {
		$classes[] = 'cle-has-own-headline';
	}
	return $classes;
} );

// Event structured data on single event pages (AIOSEO does not generate Event schema).
// Empty meta is left out rather than sent as empty strings.
add_action( 'wp_head', function () {
	if ( ! is_singular( 'meetup_events' ) ) {
		return;
	}
	$id    = get_queried_object_id();
	$start = cle_event_datetime( $id );
	if ( ! $start ) {
		return;
	}
	$meta  = fn( $key ) => cle_event_meta( $id, $key );
	$clean = fn( array $a ) => array_filter( $a, fn( $v ) => '' !== $v && [] !== $v && null !== $v );
	$data  = [
		'@context'            => 'https://schema.org',
		'@type'               => 'Event',
		'name'                => wp_strip_all_tags( get_the_title( $id ) ),
		'startDate'           => $start->format( DATE_ATOM ),
		'eventStatus'         => 'https://schema.org/EventScheduled',
		'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
		'url'                 => cle_event_rsvp_url( $id ) ?: get_permalink( $id ),
		'description'         => wp_strip_all_tags( get_the_excerpt( $id ) ),
	];
	$end = cle_event_datetime( $id, 'end' );
	if ( $end && $end >= $start ) {
		$data['endDate'] = $end->format( DATE_ATOM );
	}

	$address = $clean( [
		'@type'           => 'PostalAddress',
		'streetAddress'   => $meta( 'venue_address' ),
		'addressLocality' => $meta( 'venue_city' ),
		'addressRegion'   => $meta( 'venue_state' ),
		'postalCode'      => $meta( 'venue_zipcode' ),
		'addressCountry'  => $meta( 'venue_country' ),
	] );
	$place = $clean( [
		'@type'   => 'Place',
		'name'    => $meta( 'venue_name' ),
		'address' => count( $address ) > 1 ? $address : [],
		'url'     => $meta( 'venue_url' ),
	] );
	if ( is_numeric( $meta( 'venue_lat' ) ) && is_numeric( $meta( 'venue_lon' ) ) ) {
		$place['geo'] = [ '@type' => 'GeoCoordinates', 'latitude' => (float) $meta( 'venue_lat' ), 'longitude' => (float) $meta( 'venue_lon' ) ];
	}
	if ( count( $place ) > 1 ) {
		$data['location'] = $place;
	}

	$data['organizer'] = '' !== $meta( 'organizer_name' )
		? $clean( [ '@type' => 'Organization', 'name' => $meta( 'organizer_name' ), 'url' => $meta( 'organizer_url' ), 'email' => $meta( 'organizer_email' ) ] )
		: [ '@type' => 'Organization', 'name' => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ), 'url' => home_url( '/' ) ];
	// The group itself is a 501(c)(3); say so whenever it is the organizer.
	if ( wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) === ( $data['organizer']['name'] ?? '' ) ) {
		$data['organizer']['nonprofitStatus'] = 'https://schema.org/Nonprofit501c3';
	}

	if ( has_post_thumbnail( $id ) ) {
		$data['image'] = get_the_post_thumbnail_url( $id, 'full' );
	}
	wp_print_inline_script_tag( wp_json_encode( $clean( $data ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ), [ 'type' => 'application/ld+json' ] );
} );
