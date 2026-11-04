// The story world on the homepage and the story stage (page-story-test in the fixtures), in a real
// browser: a port of tests/browser/story-checks.js, which walked every chapter and reported what the
// stage did, plus the stacked fallbacks for reduced motion and no JavaScript.
import { expect, test, type Page } from "@playwright/test";

/** Scrolls chapter i of the world into its still stretch (view.js goTo) and lets the camera settle. */
async function settleOn(page: Page, i: number) {
  await page.evaluate((k) => {
    const ch = document.querySelectorAll<HTMLElement>(".wp-block-cle-world .cle-wchapter")[k];
    const line = window.matchMedia("(min-width: 1024px)").matches ? innerHeight * 0.5 : innerHeight * 0.46 + 60;
    scrollTo({ top: ch.getBoundingClientRect().top + scrollY - line + ch.offsetHeight * 0.3, behavior: "instant" });
  }, i);
}

const onGroups = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".cle-world__hotspots")].filter((g) => g.classList.contains("is-on") && !g.inert).map((g) => g.dataset.chapter),
  );

test.describe("homepage story world", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("cle-js is set by a synchronous head script, before first paint", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain("<script>(function(d){d.classList.add('cle-js')");
    // Not deferred to the Next runtime (next/script's beforeInteractive queues inline code in self.__next_s).
    expect(head).not.toContain("__next_s");
    expect(head.indexOf("d.classList.add('cle-js')")).toBeLessThan(html.indexOf("<body"));
  });

  test("hydrates without console errors, stage pinned, six chapters", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bcle-js\b/);
    const world = page.locator(".wp-block-cle-world");
    await expect(world).toHaveClass(/\bis-ready\b/);
    await expect(world.locator("article.cle-wchapter")).toHaveCount(6);
    expect(await page.locator(".cle-world__stage").evaluate((s) => getComputedStyle(s).position)).toBe("sticky");
    await expect(page.locator(".cle-wchapter__crop").first()).toBeHidden();
    await expect(page.locator("h1")).toHaveText("Making AI accessible to everyone.");
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test("walking the chapters: each settles on its markers, the finale shows the tags, nothing overflows", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".wp-block-cle-world")).toHaveClass(/\bis-ready\b/);
    const tags = page.locator(".cle-world__tags");
    for (let i = 0; i < 5; i++) {
      await settleOn(page, i);
      await expect.poll(() => onGroups(page), { timeout: 5000 }).toEqual([String(i)]);
      await expect(tags).not.toHaveClass(/\bis-on\b/);
      const transform = await page.locator(".cle-world__view").evaluate((v) => v.style.transform);
      expect(transform).toMatch(/^translate\(.+\) scale\(/);
    }
    await settleOn(page, 5);
    await expect(tags).toHaveClass(/\bis-on\b/);
    expect(await tags.evaluate((t) => (t as HTMLElement).inert)).toBe(false);
    await expect.poll(() => onGroups(page)).toEqual([]);
    await expect(tags.locator(".cle-world__tag")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test("a marker opens its popover; a finale tag flies back to its chapter", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".wp-block-cle-world")).toHaveClass(/\bis-ready\b/);
    await settleOn(page, 2);
    await expect.poll(() => onGroups(page), { timeout: 5000 }).toEqual(["2"]);
    const pin = page.locator('.cle-world__hotspots[data-chapter="2"] .cle-scene__pin').first();
    await pin.click();
    await expect(pin).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`#${await pin.getAttribute("aria-controls")}`)).toBeVisible();

    await settleOn(page, 5);
    // Tags take clicks only once the camera has settled on the finale.
    await expect(page.locator(".cle-world__tags")).toHaveClass(/\bis-on\b/);
    const tag = page.locator('.cle-world__tag[data-chapter="2"]');
    await expect(tag).toBeVisible();
    await expect(tag).toHaveText(/Once a month/);
    await tag.click();
    await expect.poll(() => onGroups(page), { timeout: 8000 }).toEqual(["2"]);
  });

  test("phone: the stage is pinned at the top and the first chapter's markers show", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator(".wp-block-cle-world")).toHaveClass(/\bis-ready\b/);
    expect(await page.locator(".cle-world__stage").evaluate((s) => getComputedStyle(s).position)).toBe("sticky");
    await expect.poll(() => onGroups(page), { timeout: 5000 }).toEqual(["0"]);
    await settleOn(page, 5);
    await expect(page.locator(".cle-world__tags")).toHaveClass(/\bis-on\b/);
    await expect(page.locator('.cle-world__tag[data-chapter="1"] .cle-world__tag-short')).toHaveText("Big nights");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test("reduced motion gives the stacked chapters: no stage, each chapter shows its own crop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".wp-block-cle-world")).toHaveClass(/\bis-ready\b/);
    await expect(page.locator(".cle-world__stage")).toBeHidden();
    await expect(page.locator(".cle-wchapter__crop")).toHaveCount(6);
    for (const crop of await page.locator(".cle-wchapter__crop").all()) await expect(crop).toBeVisible();
    await expect(page.locator(".cle-world-only")).toBeHidden();
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(300);
    expect(await page.locator(".cle-world__view").evaluate((v) => v.style.transform)).toBe("");
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });

  test("the homepage shows the stacked chapters", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\bcle-js\b/);
    await expect(page.locator(".cle-world__stage")).toBeHidden();
    await expect(page.locator("article.cle-wchapter")).toHaveCount(6);
    for (const crop of await page.locator(".cle-wchapter__crop").all()) await expect(crop).toBeVisible();
    await expect(page.locator("#chapter-how-it-started")).toContainText("Data in the Land");
  });

  test("the story stage shows the stacked chapters", async ({ page }) => {
    await page.goto("/story-test");
    await expect(page.locator(".cle-story__stage")).toBeHidden();
    await expect(page.locator(".cle-chapter__crop").first()).toBeVisible();
  });
});

test.describe("story stage (story-checks.js)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("walks every chapter: active chapter, layers, camera, night, bubbles, foreground, hotspots, rail", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/story-test");
    const story = page.locator(".wp-block-cle-story");
    await expect(story).toHaveClass(/\bis-ready\b/);
    expect(await page.locator(".cle-story__chapters .cle-chapter").count()).toBe(5);
    expect(await page.locator(".cle-story__rail a").count()).toBe(5);
    expect(await page.locator(".cle-story__stage").evaluate((s) => getComputedStyle(s).position)).toBe("sticky");

    const seen = [];
    for (let i = 0; i < 5; i++) {
      await page.locator(".cle-story__chapters .cle-chapter").nth(i).evaluate((c) => c.scrollIntoView({ block: "center" }));
      await expect(story).toHaveAttribute("data-active", String(i));
      seen.push(
        await story.evaluate((s) => [
          [...s.querySelectorAll<HTMLElement>(".cle-story__layer.is-on")].map((l) => l.dataset.layer).join(","),
          s.querySelector<HTMLElement>(".cle-story__camera")!.style.getPropertyValue("--cam-z"),
          ["is-night", "is-pattern", "is-far"].filter((c) => s.classList.contains(c)).join(" "),
          s.querySelectorAll(".cle-story__bubble.is-on").length,
          !!s.querySelector(".cle-story__fg.is-on"),
          s.querySelector<HTMLElement>(".cle-story__hotspots")!.inert,
          s.querySelector<HTMLElement>('.cle-story__rail a[aria-current="step"]')?.dataset.index,
        ]),
      );
    }
    expect(seen).toEqual([
      ["lights,room", "1", "", 0, false, true, "0"],
      ["lights,room,table-1,table-2,table-3,table-4", "2.2", "", 1, false, false, "1"],
      ["lights,room,table-1,table-2,table-3,table-4,bar-staff,counter", "1", "", 0, true, true, "2"],
      ["neon", "1", "is-night", 0, false, true, "3"],
      ["", "1", "is-pattern", 0, false, true, "4"],
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("the first night's pinned picture follows the moment in the middle of the screen", async ({ page }) => {
    await page.goto("/story-test");
    const night = page.locator(".wp-block-cle-first-night");
    await expect(night).toHaveAttribute("data-on", "0");
    await page.locator(".cle-night__step").nth(3).evaluate((s) => s.scrollIntoView({ block: "center" }));
    await expect(night).toHaveAttribute("data-on", "3");
    await expect(night.locator(".cle-night__step").last()).toContainText("Monthly Social at Happy Dog");
  });
});

// Fix round 1 (R32): the site chrome is in the served HTML itself, not in a hidden streamed segment.
test.describe("the chrome without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const path of ["/", "/about", "/sponsors", "/blog"]) {
    test(`${path}: header navigation and footer are visible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("header.cle-header nav").first()).toBeVisible();
      await expect(page.locator("footer.cle-footer")).toBeVisible();
    });
  }

  test("a shell page shows the announcement bar", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator(".cle-next-event--bar")).toBeVisible();
  });
});

test.describe("the chrome in the raw HTML", () => {
  for (const path of ["/", "/about", "/story-test", "/blog", "/events"]) {
    test(`${path}: header, footer and announcement bar are not in hidden segments`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain('<header class="wp-block-group alignfull cle-header');
      expect(html).toContain('<footer class="wp-block-group alignfull cle-footer');
      for (const segment of html.match(/<div hidden id="S:\d+">[\s\S]{0,400}/g) ?? []) {
        expect(segment).not.toContain("cle-header");
        expect(segment).not.toContain("cle-footer");
        expect(segment).not.toContain("cle-next-event--bar");
      }
    });
  }
});

test("/about with its figures in the first screen hydrates without console errors", async ({ page }) => {
  // A screen tall enough that the count-up finds the figures on its first check.
  await page.setViewportSize({ width: 1280, height: 4000 });
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/about");
  await expect(page.locator(".cle-figure .cle-count").first()).toBeAttached();
  await page.waitForTimeout(500);
  expect(errors.filter((e) => !/substack|givebutter|example\.com|ERR_|Failed to load resource/.test(e))).toEqual([]);
});
