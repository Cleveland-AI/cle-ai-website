// Interactive blocks, part one, in a browser: the page checks of tests/php/test-pages.php and
// spec-check:122-147 that needed cle/team, cle/bead-timeline and cle/embed-form, and
// tests/browser/hotspots-checks.js, plus the team modal, beads, ticker, timeline, count-up and
// confetti behaviour. Fixture build, clock pinned to Oct 26 2026.
import { expect, test } from "@playwright/test";

const count = (s: string, needle: string) => s.split(needle).length - 1;
const FIGURES = ["4,284", "183", "4.8", "16"];

test.describe("About: team and beads", () => {
  test("seven team cards with headshots, three Leadership labels, bios and modals", async ({ page }) => {
    await page.goto("/about");
    const main = await page.locator("main").first().evaluate((m) => m.outerHTML);
    expect(count(main, 'class="cle-team-card__photo"')).toBe(7);
    expect(count(main, '<li class="cle-team-card')).toBe(7);
    expect(count(main, "<dialog")).toBe(7);
    expect(count(main, 'class="cle-team-card__in"')).toBe(7);
    expect(count(main, 'class="cle-team-card__lead"')).toBe(3);
    expect(main).toContain("migrated/");
    for (const bio of [
      "Ted Troxell is President of CLE AI &amp; DATA",
      "Nicole McCaffrey is Head of Marketing and Strategy",
      "Will Tatz is Chief Operating Officer",
      "Tim Nash is Community Liaison",
      "Curtis O’Neal is an AI solutions architect",
      "Helen Shere is Head of Mentorship and Education",
    ]) {
      expect(main, bio).toContain(bio);
    }
    // every headshot loads
    const broken = await page.locator("img.cle-team-card__photo").evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((i) => i.currentSrc).filter((s) => !s),
    );
    expect(broken).toEqual([]);
    await page.locator("img.cle-team-card__photo").last().scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator("img.cle-team-card__photo").evaluateAll((imgs) => (imgs as HTMLImageElement[]).every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
  });

  test("bundled headshots carry the version query and load", async ({ page }) => {
    await page.goto("/interactive-a-test");
    const srcs = await page.locator(".wp-block-cle-team img.cle-team-card__photo").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
    expect(srcs[0]).toMatch(/^\/assets\/team\/ted-troxell\.webp\?v=[0-9a-f]{8}$/);
    const res = await page.request.get(srcs[0]!);
    expect(res.status()).toBe(200);
  });

  test("a new person without a headshot shows initials", async ({ page }) => {
    await page.goto("/team-test");
    await expect(page.locator(".cle-team-card__initials")).toHaveText("NP");
    await expect(page.locator(".cle-team-card img")).toHaveCount(0);
  });

  // The site shows the "after the merger" story (global constraints): five beads (R25): the theme's four, ending on the
  // 2026 501(c)(3), plus the merger bead (test-pages.php:49). The block's own four-bead default is in the unit test.
  test("the About story has its beads, the latest open; clicking another opens it", async ({ page }) => {
    await page.goto("/about");
    const beads = page.locator(".cle-beads__bead");
    await expect(beads).toHaveCount(5);
    await expect(page.locator(".cle-beads__story h3", { hasText: "A nonprofit, officially" })).toHaveCount(1);
    await expect(page.locator(".cle-beads.is-ready")).toHaveCount(1);
    await expect(beads.nth(4)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".cle-beads__story:visible")).toHaveCount(1);
    await expect(page.locator(".cle-beads__story:visible h3")).toHaveText("Data in the Land joins");
    await beads.nth(1).click();
    await expect(beads.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(beads.nth(4)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".cle-beads__story:visible h3")).toHaveText("Cleveland AI forms");
    await beads.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(beads.nth(2)).toBeFocused();
    await expect(beads.nth(2)).toHaveAttribute("aria-expanded", "true");
  });

  test("tapping a person opens their card; Meet next swaps; Escape and the x close it", async ({ page }) => {
    await page.goto("/about");
    const opens = page.locator(".cle-team-card__open");
    await opens.first().click();
    const dlg = page.locator("dialog.cle-team-modal[open]");
    await expect(dlg).toHaveCount(1);
    await expect(dlg.locator(".cle-team-modal__name")).toHaveText("Ted Troxell");
    await dlg.locator("[data-next]").click();
    await expect(page.locator("dialog.cle-team-modal[open] .cle-team-modal__name")).toHaveText("Will Tatz");
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.locator("html.cle-modal-open")).toHaveCount(0);
    await expect(opens.nth(1)).toBeFocused();
    await opens.nth(2).click();
    await page.locator("dialog[open] [data-close]").click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });
});

test.describe("Get involved: embeds", () => {
  test("the newsletter and the donation iframes, and no others", async ({ page }) => {
    await page.goto("/get-involved");
    const main = await page.locator("main").first().evaluate((m) => m.outerHTML);
    expect(count(main, "<iframe")).toBe(2);
    const news = page.locator('iframe[src="https://timcleaidata.substack.com/embed"]');
    await expect(news).toHaveAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox");
    await expect(news).toHaveAttribute("title", "Newsletter signup");
    await expect(news).not.toHaveAttribute("allow", /.*/);
    const pay = page.locator('iframe[src="https://givebutter.com/embed/c/cle-ai"]');
    await expect(pay).toHaveAttribute("allow", "payment");
    await expect(page.locator('main a[href="https://givebutter.com/cle-ai"]')).toHaveCount(1);
  });

  test("embed-form refuses http, and enforces the minimum height", async ({ page }) => {
    await page.goto("/interactive-a-test");
    await expect(page.locator("iframe")).toHaveCount(1);
    await expect(page.locator("iframe")).toHaveAttribute("height", "200");
    await expect(page.locator("iframe")).toHaveAttribute("src", "https://example.com/form");
    expect(await page.content()).not.toContain("insecure.example");
  });
});

// tests/browser/hotspots-checks.js, run against the six-marker scene on the test page.
test("hotspot scene: hover, click, focus, escape, outside click and arrow keys", async ({ page }) => {
  await page.goto("/interactive-a-test");
  const frame = page.locator(".cle-scene__frame.cle-hotspots");
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.locator(".cle-scene__pin")).toHaveCount(6);
  await expect(page.locator(".cle-scene__intro h2 em")).toHaveText("test");
  await expect(page.locator(".cle-scene__list li")).toHaveCount(6);
  const out = await page.evaluate(async () => {
    const frame = document.querySelector(".cle-hotspots")!;
    const pins = [...frame.querySelectorAll<HTMLButtonElement>(".cle-scene__pin")];
    const fr = frame.getBoundingClientRect();
    const st = () => pins.map((p) => (p.getAttribute("aria-expanded") === "true" ? "O" : ".")).join("");
    const over: number[] = [];
    pins.forEach((p, i) => {
      p.dispatchEvent(new MouseEvent("mouseenter"));
      const r = document.getElementById(p.getAttribute("aria-controls")!)!.getBoundingClientRect();
      if (r.left < fr.left - 0.5 || r.right > fr.right + 0.5) over.push(i + 1);
    });
    const res: Record<string, unknown> = { over };
    frame.dispatchEvent(new MouseEvent("mouseleave"));
    res.leave = st();
    pins[0].click();
    res.click = st();
    await new Promise((z) => setTimeout(z, 450));
    pins[0].click();
    res.clickAgain = st();
    pins[2].dispatchEvent(new FocusEvent("focus"));
    res.focus = st();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    res.escape = st();
    pins[1].click();
    document.body.click();
    res.outside = st();
    pins[2].focus();
    pins[2].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    res.arrow = document.activeElement === pins[3];
    return res;
  });
  expect(out).toEqual({
    over: [],
    leave: "......",
    click: "O.....",
    clickAgain: "......",
    focus: "..O...",
    escape: "......",
    outside: "......",
    arrow: true,
  });
});

test.describe("ticker", () => {
  test("lists events and posts, never the scheduled post (R2), and pauses", async ({ page }) => {
    await page.goto("/interactive-a-test");
    const ticker = page.locator(".wp-block-cle-ticker");
    await expect(ticker).toHaveAttribute("role", "region");
    await expect(ticker).toHaveAttribute("aria-label", "Latest");
    const text = await ticker.innerText();
    expect(text).toContain("Next:");
    expect(text).not.toContain("Scheduled test post");
    expect(await ticker.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).not.toContain("/blog/scheduled-test-post");
    await expect(ticker.locator(".cle-ticker__list")).toHaveCount(2);
    await expect(ticker.locator('.cle-ticker__list[aria-hidden="true"] a[tabindex="-1"]').first()).toBeAttached();
    const track = ticker.locator(".cle-ticker__track");
    expect(await track.evaluate((t) => getComputedStyle(t).animationName)).toBe("cle-ticker");
    const toggle = ticker.locator(".cle-ticker__toggle");
    await expect(toggle).toHaveText("Pause");
    await toggle.click();
    await expect(ticker).toHaveClass(/is-paused/);
    await expect(toggle).toHaveText("Play");
    expect(await track.evaluate((t) => getComputedStyle(t).animationPlayState)).toBe("paused");
    await toggle.click();
    await expect(toggle).toHaveText("Pause");
  });

  test("is static under reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3100/interactive-a-test");
    expect(await page.locator(".cle-ticker__track").evaluate((t) => getComputedStyle(t).animationName)).toBe("none");
    await ctx.close();
  });
});

test.describe("timeline", () => {
  test("renders its milestones and the meetups, in order of date", async ({ page }) => {
    await page.goto("/interactive-a-test");
    const items = page.locator(".cle-timeline__item");
    expect(await items.count()).toBeGreaterThan(2);
    await expect(items.first()).toContainText("Cleveland Big Data begins");
    const xs = await items.evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.x)));
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    await expect(page.locator(".cle-timeline__item.is-event a").first()).toHaveAttribute("href", /^\/events\//);
  });

  test("scrolling moves the track; reduced motion leaves it still", async ({ page, browser }) => {
    await page.goto("/interactive-a-test");
    const tl = page.locator(".wp-block-cle-timeline");
    await tl.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, (document.querySelector(".wp-block-cle-timeline") as HTMLElement).offsetTop + 600));
    await expect.poll(() => page.locator(".cle-timeline__track").evaluate((t) => (t as HTMLElement).style.transform)).toContain("translateX");
    await expect(page.locator(".cle-timeline__item.is-active")).toHaveCount(1);
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const calm = await ctx.newPage();
    await calm.goto("http://localhost:3100/interactive-a-test");
    await calm.evaluate(() => window.scrollTo(0, (document.querySelector(".wp-block-cle-timeline") as HTMLElement).offsetTop + 600));
    await calm.waitForTimeout(200);
    expect(await calm.locator(".cle-timeline__track").evaluate((t) => (t as HTMLElement).style.transform)).toBe("");
    await expect(calm.locator(".cle-timeline__item.is-active")).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("big figures count up", () => {
  test("the page is served with the final values", async ({ request }) => {
    const html = await (await request.get("/about")).text();
    for (const f of FIGURES) expect(html, f).toContain(f);
  });

  test("they count up from zero when scrolled into view and end on the final values", async ({ page }) => {
    await page.goto("/about");
    const fig = page.locator(".cle-figure").filter({ hasText: "members" }).first();
    await fig.scrollIntoViewIfNeeded();
    await expect(fig.locator(".cle-count")).toHaveCount(1);
    await expect(fig.locator(".cle-count")).toHaveText("4,284", { timeout: 5000 });
    for (const f of FIGURES) {
      const el = page.locator(".cle-figure > :first-child", { hasText: new RegExp(`^${f.replace(".", "\\.")}$`) }).first();
      await el.scrollIntoViewIfNeeded();
      await expect(el).toHaveText(f, { timeout: 5000 });
    }
  });

  test("with reduced motion the final values are there at once and nothing is wrapped", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3100/about");
    const fig = page.locator(".cle-figure").filter({ hasText: "members" }).first();
    await fig.scrollIntoViewIfNeeded();
    await expect(fig.locator("> :first-child")).toHaveText("4,284");
    await expect(page.locator(".cle-count")).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("confetti", () => {
  test("a team card opens with a burst", async ({ page }) => {
    await page.goto("/about");
    await page.locator(".cle-team-card__open").first().click();
    await expect(page.locator(".cle-confetti")).toHaveCount(1);
  });

  test("none under reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3100/about");
    await page.locator(".cle-team-card__open").first().click();
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await page.waitForTimeout(600);
    await expect(page.locator(".cle-confetti")).toHaveCount(0);
    await ctx.close();
  });
});

test("the pages with these blocks hydrate without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/about", "/get-involved", "/interactive-a-test", "/team-test"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.locator(".cle-beads.is-ready, .cle-scene, .wp-block-cle-embed-form, .cle-team-cards").first().waitFor();
  }
  expect(errors.filter((e) => !/substack|givebutter|example\.com|ERR_|Failed to load resource/.test(e))).toEqual([]);
});
