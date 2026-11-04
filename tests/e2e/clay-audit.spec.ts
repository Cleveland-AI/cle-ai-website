// Port of the theme's clay audit (tests/browser/clay-audit.js): on every parity route, at both widths,
// nothing breaks the clay rules beyond the leftovers the theme itself has (the audit's header
// comment names them: full-width bands are square by design, fields keep a transparent 1px border
// for Windows high-contrast mode). Plus positive checks that the raised and pressed shadows are there.
import { expect, test, type Page } from "@playwright/test";
import { routes, widths } from "../visual/routes";
import { clayAudit } from "./clayAudit";

/**
 * What the audit reports on the WordPress theme itself (the Docker test site, all parity routes,
 * both widths, Task 17). These are by design, so they are allowed here too.
 */
const THEME_LEFTOVERS = new Set([
  // Full-width bands: square by design. The header's bar shadow is the theme's --clay--bar.
  "header.wp-block-group.cle-header.wp-block-group-is-layout-constrained | heavy shadow 26px",
  "footer.wp-block-group.cle-footer.wp-block-group-is-layout-constrained | square card r=0",
  "div.cle-next-event--bar.wp-block-cle-next-event | square card r=0",
  "div.wp-block-group.wp-block-group-is-layout-constrained | square card r=0",
  "th | square card r=0",
  // The clay button lip (0 3px 0) plus its drop shadow measures just over the audit's 20px.
  "button.cle-nav__open | heavy shadow 22px",
  "a.wp-block-button__link.wp-element-button | heavy shadow 22px",
  "button.cle-builder__perk | heavy shadow 22px",
  // Unstyled buttons wrapping a card or a bead: the card or bead inside carries the clay.
  "button.cle-team-card__open | button radius 0; flat button",
  "button.cle-beads__bead | button radius 0; flat button",
]);
// Fields (and the range slider) keep a transparent 1px border for Windows high-contrast mode.
const FIELD_BORDER = /^(input|textarea|select)(\.[\w-]+)* \| hard 1\/1\/1\/1px border rgba\(0, 0, 0, 0\)$/;

// No live third-party calls (Substack, Givebutter, Turnstile, Poptin): only the test server answers.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => (new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort()));
});

async function open(page: Page, path: string) {
  await page.goto(path);
  if (path.startsWith("/search")) await page.locator("main h1.wp-block-query-title").waitFor();
  await page.evaluate(() => document.fonts.ready);
}

for (const w of widths) {
  test.describe(`clay audit @ ${w.name}`, () => {
    test.use({ viewport: { width: w.width, height: w.height }, reducedMotion: "reduce" });
    for (const route of routes) {
      test(`${route.name} has no clay breaks beyond the theme's own`, async ({ page }) => {
        await open(page, route.next);
        const issues = (await page.evaluate(clayAudit)).filter((i) => !THEME_LEFTOVERS.has(i) && !FIELD_BORDER.test(i));
        expect(issues, route.next).toEqual([]);
      });
    }
  });
}

/** The computed value of a clay token, as the browser resolves it (to compare against elements). */
const token = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement("div");
    probe.style.boxShadow = `var(${n})`;
    document.body.append(probe);
    const v = getComputedStyle(probe).boxShadow;
    probe.remove();
    return v;
  }, name);
const shadowOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).boxShadow);

test.describe("clay shadows", () => {
  test.use({ reducedMotion: "reduce" });

  test("buttons are raised and press in", async ({ page }) => {
    await open(page, "/");
    const button = ".wp-block-button:not(.is-style-outline) > .wp-block-button__link";
    expect(await shadowOf(page, button)).toBe(await token(page, "--wp--custom--clay--button"));
    // Press without following the link.
    await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), { capture: true }));
    await page.locator(button).first().scrollIntoViewIfNeeded();
    const b = (await page.locator(button).first().boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    expect(await shadowOf(page, button)).toBe(await token(page, "--wp--custom--clay--button-pressed"));
    await page.mouse.up();
    expect(await shadowOf(page, ".wp-block-button.is-style-outline > .wp-block-button__link")).toBe(await token(page, "--wp--custom--clay--raised"));
  });

  test("cards and pills are raised", async ({ page }) => {
    await open(page, "/");
    const raised = await token(page, "--wp--custom--clay--raised");
    expect(await shadowOf(page, ".wp-block-post-template.is-layout-grid > li")).toBe(raised);
    expect(await shadowOf(page, ".is-style-eyebrow")).toBe(raised);
    await open(page, "/blog/category/newsletter");
    expect(await shadowOf(page, ".cle-badges a")).not.toBe("none");
    expect(await shadowOf(page, ".wp-block-post-featured-image img")).toBe(raised);
    await open(page, "/sponsors");
    expect(await shadowOf(page, ".cle-form")).toBe(raised);
  });

  test("fields are pressed in", async ({ page }) => {
    await open(page, "/search?q=zzz");
    const pressed = await token(page, "--wp--custom--clay--pressed");
    expect(await shadowOf(page, "main .wp-block-search__input")).toBe(pressed);
    await open(page, "/sponsors");
    expect(await shadowOf(page, ".cle-form input[name=email]")).toBe(pressed);
    expect(await shadowOf(page, ".cle-form textarea")).toBe(pressed);
  });
});
