import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { NEXT_BASE, routes, WP_BASE, widths, type Route } from "./routes";

/**
 * Visual parity (Task 17): each route on the WordPress test site (old URL) and on the Next fixtures
 * build (new URL), full page at 1440×900 and 390×844, may differ by at most 1.5% of pixels.
 */
const MAX_DIFF_PERCENT = 1.5;
const OUT = path.join(__dirname, "out");
const MASK = "#FF00FF";

/** Animations, transitions and the caret off on both sides (reduced motion is emulated as well). */
const FREEZE_CSS = `*, *::before, *::after {
  animation: none !important; transition: none !important; caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

/**
 * Shared masks: the regions whose content is dynamic or external on both sides.
 * - iframes: Givebutter, Substack and Turnstile are blocked (no live network), so their boxes are empty.
 */
const BOTH_MASKS = ["iframe"];

/**
 * The WordPress twins of the Next `[data-dynamic]` regions. tests/visual/build.mjs pins the fixtures
 * clock to the start of the run, and the fixtures' events and posts carry the test site's dates, so
 * dates, "upcoming" and the next-event bar already match and are compared, not masked. What stays
 * dynamic is the ticker's scrolling track (none of the parity routes has one today).
 */
const WP_DYNAMIC: string[] = [".cle-ticker__viewport"];

const isLocal = (url: string) => {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1";
};

type Side = { page: Page; close: () => Promise<void> };

async function open(browser: Browser, url: string, viewport: { width: number; height: number }, hide: string[]): Promise<Side> {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await context.newPage();
  // No live external calls: Poptin, Givebutter, Substack, Turnstile and anything else off localhost.
  await page.route("**/*", (route) => (isLocal(route.request().url()) ? route.continue() : route.abort()));
  await page.goto(url, { waitUntil: "load" });
  if (hide.length) await page.addStyleTag({ content: `${hide.join(",\n")} { display: none !important; }` });
  await settle(page);
  return { page, close: () => context.close() };
}

const heightOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().height);

/**
 * A region whose content deliberately differs gets the same height on both sides (the taller of the
 * two, content clipped) before it is masked, so the rest of the page still lines up. Equal heights
 * are left alone.
 */
async function equalize(a: Page, b: Page, selector: string) {
  const [ha, hb] = [await heightOf(a, selector), await heightOf(b, selector)];
  if (Math.abs(ha - hb) < 0.5) return;
  const h = Math.ceil(Math.max(ha, hb));
  for (const page of [a, b]) {
    await page.locator(selector).first().evaluate((el, px) => {
      Object.assign((el as HTMLElement).style, { height: `${px}px`, minHeight: "0", overflow: "hidden", boxSizing: "border-box" });
    }, h);
  }
}

const shoot = (page: Page, masks: string[]) =>
  page.screenshot({ fullPage: true, animations: "disabled", caret: "hide", mask: masks.map((s) => page.locator(s)), maskColor: MASK });

async function settle(page: Page) {
  await page.addStyleTag({ content: FREEZE_CSS });
  // Lazy images: load them all, then walk the page so any in-view observers fire, and come back up.
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) img.loading = "eager";
    const step = Math.max(200, window.innerHeight / 2);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); setTimeout(r, 5000); })),
    );
  });
  await page.waitForTimeout(250);
}

/** The share of the screenshot painted with the mask colour, in %. */
function maskedPercent(img: PNG) {
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i] === 255 && img.data[i + 1] === 0 && img.data[i + 2] === 255) n++;
  return (n / (img.width * img.height)) * 100;
}

/** Pads both images to the larger size (padding counts as difference) and diffs them. */
function compare(a: PNG, b: PNG) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img: PNG) => {
    if (img.width === width && img.height === height) return img;
    const out = new PNG({ width, height });
    out.data.fill(0); // transparent black: never equal to a rendered pixel
    PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
    return out;
  };
  const pa = pad(a);
  const pb = pad(b);
  const diff = new PNG({ width, height });
  const count = pixelmatch(pa.data, pb.data, diff.data, width, height, { threshold: 0.1 });
  return { diff, percent: (count / (width * height)) * 100, wp: [a.width, a.height], next: [b.width, b.height] };
}

function masksFor(route: Route, side: "wp" | "next") {
  const own = side === "wp" ? [...WP_DYNAMIC, ...(route.wpMask ?? [])] : ["[data-dynamic]", ...(route.nextMask ?? [])];
  return [...BOTH_MASKS, ...(route.bothMask ?? []), ...(route.bothMaskEqual ?? []), ...own];
}

/** The New York calendar date of an instant ("2026-11-04"). */
const nyDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);

test.beforeAll(async ({ request }) => {
  // The build's clock must be today's (New York) date, or "upcoming" and the next event differ from
  // the test site's real clock.
  const built = new Date(readFileSync(path.join(OUT, "now.txt"), "utf8").trim());
  expect(nyDate(built), "stale build: run `npm run visual`").toBe(nyDate(new Date()));
  const res = await request.get(WP_BASE + "/", { failOnStatusCode: false }).catch(() => null);
  expect(res?.ok(), `WordPress test site not reachable at ${WP_BASE} (run tests/bin/up)`).toBeTruthy();
});

for (const route of routes) {
  for (const w of widths) {
    test(`${route.name} @ ${w.name}`, async ({ browser }, info) => {
      mkdirSync(OUT, { recursive: true });
      const viewport = { width: w.width, height: w.height };
      const [wp, next] = await Promise.all([
        open(browser, WP_BASE + route.wp, viewport, route.wpHide ?? []),
        open(browser, NEXT_BASE + route.next, viewport, route.nextHide ?? []),
      ]);
      let wpShot: Buffer, nextShot: Buffer;
      try {
        for (const sel of route.bothMaskEqual ?? []) await equalize(wp.page, next.page, sel);
        [wpShot, nextShot] = await Promise.all([shoot(wp.page, masksFor(route, "wp")), shoot(next.page, masksFor(route, "next"))]);
      } finally {
        await Promise.all([wp.close(), next.close()]);
      }
      const base = `${route.name}-${w.name}`;
      writeFileSync(path.join(OUT, `${base}-wp.png`), wpShot);
      writeFileSync(path.join(OUT, `${base}-next.png`), nextShot);
      const [wpPng, nextPng] = [PNG.sync.read(wpShot), PNG.sync.read(nextShot)];
      const result = compare(wpPng, nextPng);
      writeFileSync(path.join(OUT, `${base}-diff.png`), PNG.sync.write(result.diff));
      const summary = {
        route: route.name,
        width: w.name,
        percent: Number(result.percent.toFixed(3)),
        maskedWp: Number(maskedPercent(wpPng).toFixed(2)),
        maskedNext: Number(maskedPercent(nextPng).toFixed(2)),
        wp: result.wp,
        next: result.next,
      };
      writeFileSync(path.join(OUT, `${base}.json`), JSON.stringify(summary));
      info.annotations.push({ type: "diff", description: JSON.stringify(summary) });
      expect(result.percent, `${base}: ${result.percent.toFixed(2)}% of pixels differ (wp ${result.wp}, next ${result.next})`).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
    });
  }
}
