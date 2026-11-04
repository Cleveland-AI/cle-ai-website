<?php
/**
 * cle/way-finder: three questions; each answer adds points to some of the six ways in, and
 * the top scorer is recommended with a link to its section on the page (#events, #newsletter,
 * #speak, #volunteer, #sponsor, #donate). Ties go to the earlier way in WAYS, so a newcomer
 * who is unsure is pointed at an event first. Without JavaScript the answers do nothing and
 * the page's own sections are right below.
 *
 * @var array $attributes
 */

$ways = [
	'events'     => [ 'Come to an event', 'Start at a monthly social or a big night. Free, and no experience needed.' ],
	'newsletter' => [ 'Get the newsletter', 'One email a month with dates, recaps and jobs. The lightest way to keep in touch.' ],
	'speak'      => [ 'Give a talk', 'Tell the room what you built. First-time speakers welcome; we help you shape it.' ],
	'volunteer'  => [ 'Volunteer', 'An evening a month at the door or with a camera keeps the whole thing running.' ],
	'sponsor'    => [ 'Sponsor or partner', 'Bring your company in: sponsor a night, host us, run a workshop or share openings.' ],
	'donate'     => [ 'Donate', 'Cover a night of name tags, pizza or the room. Every dollar goes to events.' ],
];
$questions = [
	[ 'Which sounds most like you?', [
		[ "I'm curious about AI", 'events newsletter' ],
		[ 'I build things with data or AI', 'speak events' ],
		[ 'I lead a team or a company', 'sponsor events' ],
		[ 'I want to give back', 'volunteer donate' ],
	] ],
	[ 'How much time do you have?', [
		[ 'A few minutes', 'newsletter donate' ],
		[ 'An evening now and then', 'events volunteer' ],
		[ "I'd like to put real time in", 'speak volunteer sponsor' ],
	] ],
	[ 'What sounds most fun?', [
		[ 'Meeting people', 'events volunteer' ],
		[ 'Learning something new', 'events newsletter' ],
		[ 'Sharing what I know', 'speak' ],
		[ 'Making it possible for others', 'sponsor donate' ],
	] ],
];
$uid = wp_unique_id( 'cle-finder-' );
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'cle-finder' ] ); ?> data-ways="<?php echo esc_attr( wp_json_encode( $ways ) ); ?>">
	<div class="cle-finder__head">
		<?php echo cle_art_img( (string) $attributes['art'], 3, 'cle-finder__art' ); ?>
		<div>
			<h2 class="cle-finder__title"><?php echo esc_html( $attributes['heading'] ); ?></h2>
			<p><?php echo esc_html( $attributes['intro'] ); ?></p>
		</div>
	</div>
	<form class="cle-finder__form" action="#" aria-label="<?php esc_attr_e( "Find your way in", "cle-ai" ); ?>">
		<?php foreach ( $questions as $q => [ $question, $answers ] ) : ?>
			<fieldset class="cle-finder__q">
				<legend><span class="cle-finder__n"><?php echo (int) $q + 1; ?></span> <?php echo esc_html( $question ); ?></legend>
				<div class="cle-finder__options">
					<?php foreach ( $answers as $a => [ $label, $scores ] ) : ?>
						<label class="cle-finder__option">
							<input type="radio" name="<?php echo esc_attr( "$uid-q$q" ); ?>" value="<?php echo esc_attr( $scores ); ?>">
							<span><?php echo esc_html( $label ); ?></span>
						</label>
					<?php endforeach; ?>
				</div>
			</fieldset>
		<?php endforeach; ?>
	</form>
	<div class="cle-finder__result" aria-live="polite" hidden>
		<p class="cle-finder__eyebrow"><?php esc_html_e( 'We would start here', 'cle-ai' ); ?></p>
		<p class="cle-finder__pick"></p>
		<p class="cle-finder__why"></p>
		<p class="cle-finder__go"><a class="wp-element-button" href="#events"><?php esc_html_e( 'Take me there', 'cle-ai' ); ?></a></p>
	</div>
</div>
