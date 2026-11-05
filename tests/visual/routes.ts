/**
 * The routes `npm run visual` compares: the old WordPress URL on the Docker test site (it serves the
 * /index.php/… permalinks) against the new Next URL on the fixtures build.
 *
 * Masks: `[data-dynamic]` is masked on the Next side on every route (dates, counts, the ticker); `wpMask`
 * lists the selectors that mask the same regions on the WordPress side. `bothMask` masks a region on both
 * sides. Every mask beyond the shared dynamic regions says why: either the test site's CONTENT differs
 * from the fixtures, or the spec deliberately differs from the theme. Never mask a markup or CSS
 * difference.
 */
export type Route = {
  name: string;
  wp: string;
  next: string;
  /** Selectors masked on the WordPress side only (the WP twins of the Next `[data-dynamic]` regions). */
  wpMask?: string[];
  /** Selectors masked on both sides. */
  bothMask?: string[];
  /**
   * Masked on both sides and, where the heights differ, given the same height on both (the taller),
   * for deliberate differences.
   */
  bothMaskEqual?: string[];
  /** Selectors masked on the Next side only (beyond `[data-dynamic]`). */
  nextMask?: string[];
  /**
   * Content one side has and the other doesn't (a post or event that exists only on the test site or
   * only in the fixtures): hidden (display: none) before the screenshot, so the rest lines up.
   */
  wpHide?: string[];
  nextHide?: string[];
};

export const WP_BASE = "http://localhost:8090";
export const NEXT_BASE = "http://localhost:3100";

/** About's "Our story" band. */
const STORY = ".entry-content > .wp-block-group:has(.wp-block-cle-bead-timeline)";

export const routes: Route[] = [
  {
    name: "home",
    wp: "/",
    next: "/",
    // Spec: the "How it started" chapter shows the after-the-merger text; the test site still shows
    // the embargoed pre-merger text. Its paragraph is masked on both sides.
    bothMaskEqual: ["#chapter-how-it-started .cle-wchapter__body > p.wp-block-paragraph:not(.is-style-eyebrow)"],
    // Content: the test site's default "Hello world!" post is in its latest three; without it, the
    // fixtures' third post (What we learned...) is the one WordPress would show fourth.
    wpHide: ['li.wp-block-post:has(a[href*="/hello-world/"])'],
    nextHide: ['li.wp-block-post:has(a[href$="/what-we-learned-running-183-meetups"])'],
  },
  {
    name: "about",
    wp: "/index.php/about/",
    next: "/about",
    // Spec: the site shows the after-the-merger story (story-after-merger.php); the test site still
    // shows the embargoed pre-merger one. Only what the merger changes is masked (headline, story
    // paragraph, bead timeline); the band's padding, eyebrow pill and the headline's position are compared.
    bothMaskEqual: [
      `${STORY} > h2.wp-block-heading`,
      `${STORY} > p.wp-block-paragraph:not(.is-style-eyebrow)`,
      `${STORY} > .wp-block-cle-bead-timeline`,
    ],
  },
  {
    name: "sponsors",
    wp: "/index.php/sponsors/",
    next: "/sponsors",
    // Spec: the sponsor inquiry is a working cle/form; the theme's embed there has no form URL, so
    // WordPress renders nothing in its place. The form is hidden on the Next side (form.spec.ts and
    // the a11y and clay specs cover it).
    nextHide: [".wp-block-cle-form"],
  },
  {
    name: "get-involved",
    wp: "/index.php/get-involved/",
    next: "/get-involved",
    // Spec: the talk pitch is a working cle/form; the theme's empty embed renders nothing (as on Sponsors).
    nextHide: [".wp-block-cle-form"],
  },
  { name: "code-of-conduct", wp: "/index.php/code-of-conduct/", next: "/code-of-conduct" },
  {
    name: "privacy",
    wp: "/index.php/privacy/",
    next: "/privacy",
    // Spec (R11): the services table has its bracketed names filled in from the new setup (Vercel,
    // Substack, ...) and rows for Resend, Turnstile, Sanity and Poptin; the test site keeps the
    // brackets. That table is masked on both sides.
    bothMaskEqual: ['figure.wp-block-table:has(a[href*="meetup.com/privacy"])'],
  },
  // The test site has a static front page and no posts page; WordPress renders the theme's blog index
  // (templates/index.html) for ?post_type=post.
  {
    name: "blog",
    wp: "/?post_type=post",
    next: "/blog",
    // Content: WordPress's default "Hello world!" post exists only on the test site.
    wpHide: ['li.wp-block-post:has(a[href*="/hello-world/"])'],
  },
  {
    name: "post",
    wp: "/index.php/2026/09/19/voila-cle-ai-data-newsletter-september-2026/",
    next: "/blog/voila-cle-ai-data-newsletter-september-2026",
    // Spec: comments are dropped, so the theme's comments block (Leave a Reply form) is hidden on the
    // WordPress side.
    wpHide: [".wp-block-comments"],
  },
  { name: "category", wp: "/index.php/category/newsletter/", next: "/blog/category/newsletter" },
  {
    name: "events",
    wp: "/index.php/meetup-event/",
    next: "/events",
    // Content: two events exist only in the fixtures (tests/fixtures/extra.ndjson): "Bare event" in
    // Upcoming and "Photo night" in Past. Photo night pushes the twelfth past event (Monthly Social #8)
    // to page 2 on the Next side, so that card is hidden on the WordPress side.
    nextHide: ['li.wp-block-post:has(a[href$="/events/bare-event"])', 'li.wp-block-post:has(a[href$="/events/photo-night"])'],
    wpHide: ['li.wp-block-post:has(a[href*="/meetup-event/monthly-social-8/"])'],
  },
  // Fixed dates on both sides (Dec 10 2026, Feb 10 2026), so they are upcoming and past on both clocks.
  {
    name: "event-upcoming",
    wp: "/index.php/meetup-event/cle-ai-and-data-monthly-social-at-happy-dog-december/",
    next: "/events/cle-ai-and-data-monthly-social-at-happy-dog-december",
  },
  { name: "event-past", wp: "/index.php/meetup-event/winter-meetup-est-check/", next: "/events/winter-meetup-est-check" },
  { name: "search", wp: "/?s=zzz", next: "/search?q=zzz" },
  { name: "404", wp: "/index.php/no-such-page-zzz/", next: "/no-such-page-zzz" },
];

export const widths = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;
