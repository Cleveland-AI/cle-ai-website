<?php
// The cle-community plugin: sign-in, profiles, and the six programs. Handlers are called
// directly with what a form would post; mail is caught by tests/mu/mail-log.php.
// The members area is parked for a later release: these run only while the plugin is active.
if ( ! function_exists( 'clec_render_hub' ) ) {
	echo "ok - members area parked (cle-community inactive): skipped\n";
	return;
}
t_assert( function_exists( 'clec_render_hub' ) && is_plugin_active( 'cle-community/cle-community.php' ), 'the community plugin is active' );
foreach ( [ 'members', 'ai-map', 'build-nights', 'office-hours', 'circles', 'grants', 'perks', 'member-privacy' ] as $slug ) {
	t_assert( (bool) get_page_by_path( $slug ), "the $slug page exists" );
}
// Start with fresh rate limits: earlier runs count against the same address.
$GLOBALS['wpdb']->query( "DELETE FROM {$GLOBALS['wpdb']->options} WHERE option_name LIKE '\\_transient\\_%clec\\_rl\\_%'" );
$mail = function () {
	$m = $GLOBALS['clec_mail'] ?? [];
	return end( $m ) ?: [ 'to' => [], 'subject' => '', 'message' => '', 'headers' => [] ];
};
$cleanup = [];
register_shutdown_function( function () use ( &$cleanup ) {
	require_once ABSPATH . 'wp-admin/includes/user.php';
	foreach ( $cleanup as $id ) {
		if ( get_userdata( $id ) ) {
			do_action( 'clec_forget_user', $id );
			wp_delete_user( $id );
		}
	}
} );
$as = function ( int $uid ) {
	wp_set_current_user( $uid );
	return $uid;
};
$u = fn( string $email ) => (int) get_user_by( 'email', $email )->ID;
$maya   = $u( 'maya@example.com' );
$jordan = $u( 'jordan@example.com' );
$sam    = $u( 'sam@example.com' );

// --- Sign-in by email link
$as( 0 );
$email = 'new-' . wp_generate_password( 6, false ) . '@example.com';
t_assert( 'invalid' === clec_request_link( [ 'email' => 'nope' ], 0 ), 'a bad email address is refused' );
t_assert( 'confirm' === clec_request_link( [ 'email' => $email, 'joining' => 1, 'name' => 'Test Person' ], 0 ), 'joining needs the privacy and conduct box ticked' );
t_assert( 'check_email' === clec_request_link( [ 'email' => $email, 'joining' => 1, 'name' => 'Test Person', 'agree' => 1 ], 0 ), 'joining sends a link' );
t_assert( preg_match( '/clec_confirm=([a-f0-9]{48})/', $mail()['message'], $m ) && 'Finish joining' === substr( $mail()['subject'], -14 ), 'the joining email carries a one-time link' );
$token = $m[1];
t_assert( ! get_user_by( 'email', $email ), 'no account exists until the link is confirmed' );
t_assert( str_contains( clec_render_hub( [] ), 'clec-login' ) && ! str_contains( clec_render_hub( [] ), 'Delete my account' ), 'visitors see sign in and join, nothing of a member\'s' );
t_assert( 'welcome' === clec_confirm_link( [ 'token' => $token ], 0 ), 'confirming the link makes the account and signs in' );
$new         = (int) get_user_by( 'email', $email )->ID;
$cleanup[]   = $new;
t_assert( in_array( 'clec_member', get_userdata( $new )->roles, true ) && 'Test Person' === get_userdata( $new )->display_name && get_user_meta( $new, 'clec_agreed', true ), 'the new account is a Member, named, with the agreement recorded' );
t_assert( 'link_used' === clec_confirm_link( [ 'token' => $token ], 0 ), 'a link works once' );
$as( 0 );
clec_request_link( [ 'email' => 'nobody-' . wp_generate_password( 6, false ) . '@example.com' ], 0 );
t_assert( 'Join CLE AI & DATA' === substr( $mail()['subject'], -18 ) && ! str_contains( $mail()['message'], 'clec_confirm' ), 'signing in with an unknown address sends a join invitation, not a sign-in link' );
clec_request_link( [ 'email' => $email ], 0 );
t_assert( str_contains( $mail()['subject'], 'Your sign-in link' ), 'a member asking to sign in gets a sign-in link' );

clec_request_link( [ 'email' => get_userdata( 1 )->user_email ], 0 );
t_assert( str_contains( $mail()['message'], 'wp-login.php' ) && ! str_contains( $mail()['message'], 'clec_confirm' ), 'organizer accounts are sent to the password sign-in, never given a link' );

// --- Profile and the hub
$as( $new );
t_assert( 'saved' === clec_save_profile( [ 'name' => 'Test Person', 'headline' => 'Tester <b>bold</b>', 'can_help' => 'Testing', 'listed' => 1, 'intros' => 1, 'org' => get_posts( [ 'post_type' => 'clec_org', 'title' => 'Flats Fintech Lab', 'fields' => 'ids' ] )[0] ], $new ), 'members save their profile' );
t_assert( 'Tester bold' === clec_profile( $new )['headline'] && clec_profile( $new )['org'] > 0, 'profile text is cleaned and the workplace saved' );
$hub = clec_render_hub( [] );
foreach ( [ 'hub-profile', 'hub-build', 'hub-office-hours', 'hub-circles', 'hub-grants', 'hub-perks', 'hub-account' ] as $section ) {
	t_assert( str_contains( $hub, "id=\"$section\"" ), "the hub has the $section section" );
}

// --- The Cleveland AI map
$as( 0 );
$map = clec_render_map( [] );
t_assert( 5 === substr_count( $map, 'class="clec-card clec-org"' ) && ! str_contains( $map, 'Gordon Square Vision' ), 'visitors see the five published companies, not the pending one' );
t_assert( ! str_contains( $map, 'Maya Okafor' ) && ! str_contains( $map, 'members work here' ) && str_contains( $map, 'Sign in or join' ), 'visitors see no member names' );
$as( $new );
$map = clec_render_map( [] );
t_assert( str_contains( $map, 'Maya Okafor' ) && str_contains( $map, 'Ask for an intro' ), 'members see who works where and can ask for an introduction' );
t_assert( ! str_contains( $map, 'Sam Rivera' ), 'a member who isn\'t listed never appears' );
t_assert( 'intro_sent' === clec_intro( [ 'to' => $maya, 'note' => 'Hello Maya' ], $new ), 'an introduction is sent' );
t_assert( in_array( 'maya@example.com', $mail()['to'], true ) && in_array( 'Reply-To: ' . $email, $mail()['headers'], true ), 'it reaches Maya, with replies going to the sender' );
t_assert( 'invalid' === clec_intro( [ 'to' => $sam, 'note' => 'Hi' ], $new ), 'nobody can be contacted who didn\'t allow introductions' );
t_assert( 'org_suggested' === clec_suggest_org( [ 'name' => 'Test Suggestion Co', 'industry' => 'software' ], $new ) && 'pending' === get_post_status( get_posts( [ 'post_type' => 'clec_org', 'title' => 'Test Suggestion Co', 'post_status' => 'any', 'fields' => 'ids' ] )[0] ), 'a suggested company waits for an organizer' );

// --- Build nights
$pantry = get_posts( [ 'post_type' => 'clec_project', 'title' => 'See which donors are likely to give again', 'fields' => 'ids' ] )[0];
$as( 0 );
t_assert( str_contains( clec_render_projects( [] ), 'Bring us a problem' ) && ! str_contains( clec_render_projects( [] ), 'Jordan Lee' ), 'visitors see projects and the nonprofit form, not the team\'s names' );
t_assert( 'missing' === clec_submit_project( [ 'nonprofit' => 'X' ], 0 ), 'a nonprofit submission needs its required fields' );
t_assert( 'project_sent' === clec_submit_project( [ 'nonprofit' => 'Test Pantry', 'title' => 'Test problem', 'problem' => 'P', 'contact' => 'C', 'email' => 'c@example.org' ], 0 ), 'a nonprofit can bring a problem without an account' );
$sub = get_posts( [ 'post_type' => 'clec_project', 'title' => 'Test problem', 'post_status' => 'any', 'fields' => 'ids' ] )[0];
t_assert( 'pending' === get_post_status( $sub ) && in_array( 'c@example.org', $mail()['to'], true ), 'it waits for review, and the nonprofit gets a confirmation' );
$as( $new );
t_assert( 'joined' === clec_join_team( [ 'project' => $pantry ], $new ) && in_array( $new, clec_team( $pantry ), true ), 'a member joins a team' );
$other = get_posts( [ 'post_type' => 'clec_project', 'title' => 'Route volunteer drivers to more deliveries a day', 'fields' => 'ids' ] )[0];
t_assert( 'invalid' === clec_join_team( [ 'project' => $other ], $new ), 'a team that is already building can\'t be joined' );
t_assert( 'left' === clec_leave_team( [ 'project' => $pantry ], $new ) && ! in_array( $new, clec_team( $pantry ), true ), 'and can leave it' );
update_post_meta( $pantry, '_clec_team', [ $jordan, 9001, 9002, 9003, 9004 ] );
t_assert( 'full' === clec_join_team( [ 'project' => $pantry ], $new ), 'a full team takes nobody else' );
update_post_meta( $pantry, '_clec_team', [ $jordan ] );

// --- Office hours
$as( 0 );
$oh = clec_render_office_hours( [] );
t_assert( 2 === substr_count( $oh, 'class="clec-card clec-slot"' ), 'two of Maya\'s three slots are open (one is booked)' );
t_assert( ! str_contains( $oh, 'meet.example.com' ) && ! str_contains( $oh, 'Maya Okafor' ), 'visitors see neither where it happens nor the host\'s name' );
$as( $new );
$free = clec_upcoming_slots( [ 'free' => true ] );
t_assert( 'booked' === clec_book( [ 'slot' => $free[0]->ID, 'note' => 'Hi' ], $new ) && $new === (int) clec_get( $free[0]->ID, 'booker' ), 'a member books a slot' );
t_assert( str_contains( $mail()['message'], 'meet.example.com/maya' ) && in_array( $email, $mail()['to'], true ), 'the booker is told where it happens' );
t_assert( 'taken' === clec_book( [ 'slot' => $free[0]->ID, 'note' => 'Hi' ], $jordan ), 'a booked slot can\'t be booked again' );
t_assert( 'booked' === clec_book( [ 'slot' => $free[1]->ID, 'note' => 'Hi' ], $new ), 'a member may hold two bookings' );
$as( $maya );
clec_add_slot( [ 'date' => wp_date( 'Y-m-d', strtotime( '+21 days' ) ), 'time' => '09:00', 'topic' => 'Third slot', 'where' => 'W' ], $maya );
$third = get_posts( [ 'post_type' => 'clec_slot', 'author' => $maya, 'meta_key' => '_clec_topic', 'meta_value' => 'Third slot', 'fields' => 'ids' ] )[0];
$as( $new );
t_assert( 'too_many' === clec_book( [ 'slot' => $third, 'note' => 'Hi' ], $new ), 'but not a third, so there is room for others' );
wp_delete_post( $third, true );
t_assert( 'cancelled' === clec_cancel_slot( [ 'slot' => $free[0]->ID ], $new ) && 0 === (int) clec_get( $free[0]->ID, 'booker' ), 'the booker cancels and the slot opens again' );
clec_cancel_slot( [ 'slot' => $free[1]->ID ], $new );
t_assert( 'not_host' === clec_add_slot( [ 'date' => wp_date( 'Y-m-d', strtotime( '+2 days' ) ), 'time' => '18:00', 'topic' => 'T', 'where' => 'W' ], $new ), 'only approved hosts post office hours' );
$as( $maya );
t_assert( 'past' === clec_add_slot( [ 'date' => '2020-01-01', 'time' => '18:00', 'topic' => 'T', 'where' => 'W' ], $maya ), 'a slot in the past is refused' );
t_assert( 'slot_added' === clec_add_slot( [ 'date' => wp_date( 'Y-m-d', strtotime( '+20 days' ) ), 'time' => '18:00', 'mins' => 30, 'topic' => 'Test topic', 'where' => 'Zoom' ], $maya ), 'a host adds a slot' );
$added = get_posts( [ 'post_type' => 'clec_slot', 'author' => $maya, 'meta_key' => '_clec_topic', 'meta_value' => 'Test topic', 'fields' => 'ids' ] )[0];
t_assert( 'slot_removed' === clec_cancel_slot( [ 'slot' => $added ], $maya ), 'and removes it' );

// --- Mentorship circles
$circle = get_posts( [ 'post_type' => 'clec_circle', 'title' => 'Switching into data', 'fields' => 'ids' ] )[0];
$as( $new );
t_assert( 'confirm' === clec_apply_circle( [ 'circle' => $circle, 'goal' => 'G' ], $new ), 'applying asks for the commitment' );
t_assert( 'applied' === clec_apply_circle( [ 'circle' => $circle, 'goal' => 'Get a data job', 'commit' => 1 ], $new ) && 'applied' === clec_applicants( $circle )[ $new ]['status'], 'a member applies to a circle' );
t_assert( in_array( 'maya@example.com', $mail()['to'], true ), 'the lead hears about it' );
t_assert( 'invalid' === clec_decide_circle( [ 'circle' => $circle, 'who' => $new, 'choice' => 'accepted' ], $jordan ), 'only the lead or an organizer decides' );
$as( $maya );
t_assert( str_contains( clec_render_hub( [] ), 'Get a data job' ), 'the lead sees applications in the hub' );
t_assert( 'decided' === clec_decide_circle( [ 'circle' => $circle, 'who' => $new, 'choice' => 'accepted' ], $maya ) && 5 === clec_circle_places( $circle ), 'the lead accepts, and a place is taken' );

// --- Micro-grants
$as( $new );
t_assert( 'amount' === clec_apply_grant( [ 'title' => 'T', 'summary' => 'S', 'who' => 'W', 'budget' => 'B', 'timeline' => 'Soon', 'amount' => 5000 ], $new ), 'the amount must be within the range' );
t_assert( 'grant_sent' === clec_apply_grant( [ 'title' => 'Test grant', 'summary' => 'S', 'who' => 'W', 'budget' => 'B', 'timeline' => 'Soon', 'amount' => 500 ], $new ), 'a member applies for a grant' );
$grant = get_posts( [ 'post_type' => 'clec_grant', 'title' => 'Test grant', 'post_status' => 'any', 'fields' => 'ids' ] )[0];
t_assert( 'private' === get_post_status( $grant ) && 'submitted' === clec_get( $grant, 'stage' ), 'applications are private records' );
t_assert( 'invalid' === clec_report_grant( [ 'grant' => $grant, 'report' => 'R' ], $new ), 'only an awarded grant can report back' );
$left = clec_grant_pool()['left'];
clec_set( $grant, 'awarded', 500 );
clec_set( $grant, 'stage', 'awarded' );
do_action( 'clec_changed_clec_grant', $grant, [ 'stage' => 'submitted' ] );
t_assert( str_contains( $mail()['subject'], 'approved' ) && $left - 500 === clec_grant_pool()['left'], 'awarding tells the member and comes out of this year\'s budget' );
t_assert( 'reported' === clec_report_grant( [ 'grant' => $grant, 'report' => 'It went well' ], $new ), 'the member reports back' );
$as( 0 );
t_assert( str_contains( clec_render_grants( [] ), 'East side AI meetup at the library' ) && ! str_contains( clec_render_grants( [] ), 'A Python club for teachers' ), 'only grants marked as stories are shown publicly' );

// --- Perks
$codes = get_posts( [ 'post_type' => 'clec_perk', 'title' => '20% off a regional data conference', 'fields' => 'ids' ] )[0];
$saved = clec_get( $codes, 'codes' );
$as( 0 );
t_assert( ! str_contains( clec_render_perks( [] ), 'CLEAI' ), 'visitors never see a code' );
$as( $new );
t_assert( 'claimed' === clec_claim( [ 'perk' => $codes ], $new ), 'a member claims a perk' );
$got = clec_claims( $codes )[ $new ]['code'];
t_assert( 'CLEAI-' === substr( $got, 0, 6 ) && ! str_contains( (string) clec_get( $codes, 'codes' ), $got ) && str_contains( clec_render_perks( [] ), $got ), 'they get a unique code, taken off the list, and see it' );
t_assert( 'claimed' === clec_claim( [ 'perk' => $codes ], $new ) && $got === clec_claims( $codes )[ $new ]['code'], 'claiming again gives the same code, not another' );
clec_set( $codes, 'codes', '' );
t_assert( 'gone' === clec_claim( [ 'perk' => $codes ], $jordan ), 'when the codes run out, nobody else gets one' );
clec_set( $codes, 'codes', $saved );
$claims = clec_claims( $codes );
unset( $claims[ $new ] );
update_post_meta( $codes, '_clec_claims', $claims );

// --- Leaving
$as( $new );
t_assert( 'confirm' === clec_forget( [], $new ), 'deleting an account needs the box ticked' );
t_assert( 'invalid' === clec_forget( [ 'sure' => 1 ], 1 ), 'organizers can\'t delete themselves from the hub' );
t_assert( 'forgotten' === clec_forget( [ 'sure' => 1 ], $new ) && ! get_userdata( $new ), 'a member deletes their account' );
t_assert( ! isset( clec_applicants( $circle )[ $new ] ) && 'publish' === get_post_status( get_posts( [ 'post_type' => 'clec_org', 'title' => 'Test Suggestion Co', 'post_status' => 'any', 'fields' => 'ids' ] )[0] ?: 0 ) || 'pending' === get_post_status( get_posts( [ 'post_type' => 'clec_org', 'title' => 'Test Suggestion Co', 'post_status' => 'any', 'fields' => 'ids' ] )[0] ), 'they leave their circle; the company they suggested stays' );
t_assert( 'private' === get_post_status( $grant ) && (int) get_post_field( 'post_author', $grant ) !== $new, 'a paid grant stays as a record, no longer theirs' );

// Tidy what the test made.
foreach ( [ [ 'clec_org', 'Test Suggestion Co' ], [ 'clec_project', 'Test problem' ], [ 'clec_grant', 'Test grant' ] ] as [ $type, $title ] ) {
	foreach ( get_posts( [ 'post_type' => $type, 'title' => $title, 'post_status' => 'any', 'fields' => 'ids' ] ) as $id ) {
		wp_delete_post( $id, true );
	}
}
$apps = clec_applicants( $circle );
update_post_meta( $circle, '_clec_applicants', array_intersect_key( $apps, [ $sam => 1 ] ) );
