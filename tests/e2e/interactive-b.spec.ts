// Interactive blocks, part two, in a browser: the page checks of tests/php/test-pages.php and
// spec-check:122-147 that needed cle/sponsor-builder, cle/gift-slider, cle/way-finder and cle/coming-up,
// plus their behaviour. Fixture build, clock pinned to Oct 26 2026.
import { expect, test } from "@playwright/test";

const count = (s: string, needle: string) => s.split(needle).length - 1;
const mainHtml = (page: import("@playwright/test").Page) => page.locator("main").first().evaluate((m) => m.outerHTML);

test.describe("Sponsors: the builder", () => {
  test("the tiers show $800, $1,800 and $2,500 in the builder, not the static list (test-pages.php:33,74)", async ({ page }) => {
    await page.goto("/sponsors");
    const main = await mainHtml(page);
    for (const price of ["$800", "$1,800", "$2,500"]) expect(main).toContain(`<span class="cle-builder__price">${price}</span>`);
    expect(main).not.toContain("[$__]");
    expect(main).toContain("cle-builder");
    expect(main).not.toContain("Three ways to sponsor");
    expect(main).toContain("acknowledgment, not endorsement");
    await expect(page.locator(".cle-builder__perk")).toHaveCount(5);
    await expect(page.locator(".cle-builder__perk[aria-pressed=true]")).toHaveCount(0);
  });

  test("picking perks lights the matching tier, fills the pile and rewrites the email link", async ({ page }) => {
    await page.goto("/sponsors");
    const perks = page.locator(".cle-builder__perk");
    const cta = page.locator(".cle-builder__cta");
    await expect(cta).toHaveAttribute("href", "mailto:info@cle-ai.com?subject=Sponsoring%20CLE%20AI%20%26%20DATA");
    await perks.nth(0).click(); // weight 1: the event sponsor
    await expect(perks.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".cle-builder__tiers li.is-match")).toHaveText(/Event sponsor/);
    await expect(page.locator(".cle-builder__result")).toContainText("1 pick: that sounds like a event sponsor ($800).");
    await expect(page.locator(".cle-builder__piece.is-on")).toHaveCount(1);
    const href = (await cta.getAttribute("href")) ?? "";
    expect(href).toContain("&body=");
    expect(decodeURIComponent(href)).toContain("Your logo on the big screen");
    await perks.nth(1).click(); // + 2 = 3: the season sponsor
    await expect(page.locator(".cle-builder__tiers li.is-match")).toHaveText(/Season sponsor/);
    await perks.nth(0).click(); // off again
    await expect(page.locator(".cle-builder__piece.is-on")).toHaveCount(1);
  });

  test("reaching the top tier fires confetti, once", async ({ page }) => {
    await page.goto("/sponsors");
    const perks = page.locator(".cle-builder__perk");
    await expect(page.locator(".cle-confetti")).toHaveCount(0);
    for (const i of [0, 1, 2]) await perks.nth(i).click(); // 1 + 2 + 3 = 6 >= 5
    await expect(page.locator(".cle-builder__tiers li.is-match")).toHaveText(/Presenting sponsor/);
    await expect(page.locator(".cle-confetti")).toHaveCount(1);
    await page.waitForTimeout(1600);
    await perks.nth(3).click();
    await expect(page.locator(".cle-confetti")).toHaveCount(0);
  });

  test("the inquiry form is on the page; the builder button sends the package and scrolls there", async ({ page }) => {
    await page.goto("/sponsors");
    await expect(page.locator("#sponsor-inquiry")).toHaveCount(1); // the real form (Task 13)
    const perks = page.locator(".cle-builder__perk");
    await perks.nth(1).click();
    await perks.nth(3).click(); // 2 + 1 = 3: season
    await page.evaluate(() => {
      (window as unknown as { __pkg: unknown[] }).__pkg = [];
      window.addEventListener("cle:sponsor-package", (e) => (window as unknown as { __pkg: unknown[] }).__pkg.push((e as CustomEvent).detail));
      // The real inquiry form (Task 13) is already on the page at #sponsor-inquiry.
    });
    const url = page.url();
    await page.locator(".cle-builder__cta").click();
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => (window as unknown as { __pkg: unknown[] }).__pkg)).toEqual([
      { tier: "Season sponsor", perks: ["A table at a big night", "Cover the food"] },
    ]);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  });
});

test.describe("Sponsors: the package sent to the inquiry form (R26)", () => {
  const stand = async (page: import("@playwright/test").Page) => {
    await page.evaluate(() => {
      const w = window as unknown as { __pkg: unknown[] };
      w.__pkg = [];
      window.addEventListener("cle:sponsor-package", (e) => w.__pkg.push((e as CustomEvent).detail));
    });
  };
  const sent = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __pkg: unknown[] }).__pkg);

  test("the tier is always a string naming the suggested package (below-minimum picks are in the unit tests: the default minimum is 1)", async ({ page }) => {
    await page.goto("/sponsors");
    await stand(page);
    await page.locator(".cle-builder__perk").nth(3).click(); // weight 1 reaches Event sponsor (min 1)
    await page.locator(".cle-builder__cta").click();
    expect(await sent(page)).toEqual([{ tier: "Event sponsor", perks: ["Cover the food"] }]);
  });

  test("nothing picked: no event is sent, but the page still scrolls to the form", async ({ page }) => {
    await page.goto("/sponsors");
    await stand(page);
    await page.locator(".cle-builder__cta").click();
    expect(await sent(page)).toEqual([]);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  });
});

test.describe("Get involved: way-finder, gift slider, coming up", () => {
  test("the way-finder and the gift slider are on the page, with the anchors they point to (test-pages.php:38-42)", async ({ page }) => {
    await page.goto("/get-involved");
    const main = await mainHtml(page);
    expect(main).toContain("cle-finder");
    expect(main).toContain("cle-gift");
    expect(main).toContain("wp-block-cle-coming-up");
    expect(main).toContain("givebutter.com/embed/c/cle-ai");
    expect(main).toContain('href="/sponsors"');
    expect(main).toContain("Does your employer match gifts?");
    for (const a of ["events", "newsletter", "speak", "volunteer", "sponsor", "donate"]) expect(main, `#${a}`).toContain(`id="${a}"`);
  });

  test("the way-finder recommends one of the six, with confetti, and its button scrolls to that section", async ({ page }) => {
    await page.goto("/get-involved");
    const finder = page.locator(".cle-finder");
    await expect(finder.locator("fieldset")).toHaveCount(3);
    await expect(finder.locator("input[type=radio]")).toHaveCount(11);
    const result = finder.locator(".cle-finder__result");
    await expect(result).toBeHidden();
    await finder.getByText("I build things with data or AI").click();
    await finder.getByText("An evening now and then").click();
    await expect(result).toBeHidden(); // two of three
    await finder.getByText("Sharing what I know").click();
    await expect(result).toBeVisible();
    // speak 2, events 2 (speak events / events volunteer / speak): speak = 2, events = 2: the tie goes to the earlier way
    await expect(finder.locator(".cle-finder__pick")).toHaveText("Come to an event");
    await expect(page.locator(".cle-confetti")).toHaveCount(1);
    await expect(finder.locator(".cle-finder__go a")).toHaveAttribute("href", "#events");
    await finder.locator(".cle-finder__go a").click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("events");
    // changing an answer updates the pick, with no second party
    await finder.getByText("Meeting people").click();
    await expect(finder.locator(".cle-finder__pick")).toHaveText("Come to an event");
    await finder.getByText("I lead a team or a company").click();
    await finder.getByText("Making it possible for others").click();
    await finder.getByText("I'd like to put real time in").click();
    await expect(finder.locator(".cle-finder__pick")).toHaveText("Sponsor or partner");
    await expect(finder.locator(".cle-finder__go a")).toHaveAttribute("href", "#sponsor");
  });

  test("the gift slider replaces its list: every step shows what it pays for and the button follows", async ({ page }) => {
    await page.goto("/get-involved");
    const gift = page.locator(".cle-gift");
    await expect(gift.locator(".cle-gift__live")).toBeVisible();
    await expect(gift.locator(".cle-gift__list")).toBeHidden();
    await expect(gift.locator(".cle-gift__amount")).toHaveText("$100");
    await expect(gift.locator(".cle-gift__piece.is-on")).toHaveCount(3);
    await expect(gift.locator(".cle-gift__cta")).toHaveText("Give $100");
    await gift.locator(".cle-gift__range").focus();
    await page.keyboard.press("End");
    await expect(gift.locator(".cle-gift__amount")).toHaveText("$1,000");
    await expect(gift.locator(".cle-gift__covers")).toHaveText("The room for a big night");
    await expect(gift.locator(".cle-gift__piece.is-on")).toHaveCount(6);
    await expect(gift.locator(".cle-gift__cta")).toHaveText("Give $1,000");
    await expect(gift.locator(".cle-gift__cta")).toHaveAttribute("href", "#donate");
    await page.keyboard.press("Home");
    await expect(gift.locator(".cle-gift__piece.is-on")).toHaveCount(1);
    await expect(gift.locator(".cle-gift__range")).toHaveAttribute("aria-valuetext", "$25: Name tags and markers for a night");
  });

  test("the gift slider's list is what scripts-off visitors get", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/get-involved");
    await expect(page.locator(".cle-gift__list li")).toHaveCount(6);
    await expect(page.locator(".cle-gift__list")).toBeVisible();
    await expect(page.locator(".cle-gift__live")).toBeHidden();
    await expect(page.locator(".cle-finder__result")).toBeHidden();
    await ctx.close();
  });

  test("the coming-up card: the next big night, the next social and the latest post, never the scheduled one", async ({ page }) => {
    await page.goto("/get-involved");
    const cards = page.locator(".cle-coming__card");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText("Next big night");
    await expect(cards.nth(0)).toContainText("Mega Meetup at the Museum");
    await expect(cards.nth(0).locator("time")).toHaveAttribute("datetime", "2026-10-29");
    await expect(cards.nth(1)).toContainText("Next social");
    await expect(cards.nth(1)).toContainText("Monthly Social at Happy Dog");
    await expect(cards.nth(2)).toContainText("Latest post");
    const html = await page.content();
    expect(html).not.toContain("Scheduled test post");
    expect(html).not.toContain("scheduled-test-post");
    expect(count(await mainHtml(page), "cle-coming__card")).toBeGreaterThanOrEqual(3);
  });
});

test.describe("reduced motion", () => {
  test("no confetti from the builder or the way-finder", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/sponsors");
    for (const i of [0, 1, 2]) await page.locator(".cle-builder__perk").nth(i).click();
    await expect(page.locator(".cle-builder__tiers li.is-match")).toHaveText(/Presenting sponsor/);
    await expect(page.locator(".cle-confetti")).toHaveCount(0);
    await page.goto("/get-involved");
    const finder = page.locator(".cle-finder");
    for (const t of ["I'm curious about AI", "A few minutes", "Learning something new"]) await finder.getByText(t).click();
    await expect(finder.locator(".cle-finder__result")).toBeVisible();
    await expect(page.locator(".cle-confetti")).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("hydration", () => {
  for (const path of ["/sponsors", "/get-involved"]) {
    test(`${path} hydrates without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.locator(".cle-gift__live, .cle-builder__perk").first()).toBeVisible();
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }
});
