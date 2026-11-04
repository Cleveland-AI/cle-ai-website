// The homepage story world and the story stage: ports of tests/php/test-world.php, test-story.php,
// test-story-chapter.php, test-story-images.php and test-front-page.php (minus the theme's merger
// embargo checks, which are not ported: the site shows the after-merger story). The browser
// behaviour (camera, markers, finale tags, stacked fallbacks) is in tests/e2e/story.spec.ts.
import { readdirSync, readFileSync } from "node:fs";
import type { ReactElement } from "react";
import { prerender } from "react-dom/static";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blockComponents } from "@/blocks/registry";
import { FirstNight } from "@/blocks/first-night/FirstNight";
import { Story } from "@/blocks/story/Story";
import { chapterAnchor, chapterCropCamera, chapterState, STORY_SIZES, StoryImg, storyAssetUrl, storyAssetUrls } from "@/blocks/story/images";
import { StoryChapter } from "@/blocks/story-chapter/StoryChapter";
import { World } from "@/blocks/world/World";
import { HomeBody, HomeBodyView } from "@/components/HomeBody";
import { skipHref } from "@/components/SkipLink.client";
import { startCountUp } from "@/lib/figures.client";
import { HydrationPending } from "@/lib/hydrating.client";
import { imageInfo } from "../../scripts/migrate-wp/media";
import { NOW } from "./helpers/fixtures";

const count = (s: string, needle: string) => s.split(needle).length - 1;
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
async function render(el: ReactElement): Promise<string> {
  const { prelude } = await prerender(el);
  return new Response(prelude).text();
}
const para = (key: string, text: string) => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${key}s`, text, marks: [] }],
});

function fixtures() {
  beforeEach(() => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_NOW", NOW.toISOString());
  });
  afterEach(() => vi.unstubAllEnvs());
}

describe("registry", () => {
  it("registers the five story blocks", () => {
    for (const t of ["cleWorld", "cleWorldChapter", "cleStory", "cleStoryChapter", "cleFirstNight"]) {
      expect(blockComponents[t], t).toBeTypeOf("function");
    }
  });
});

describe("cle/world (test-world.php)", () => {
  const chapters = [
    {
      _type: "cleWorldChapter",
      _key: "a",
      title: "Our goal",
      camera: { x: 41, y: 18, zoom: 1.3 },
      fadeBelow: 40,
      tag: { x: 30, y: 15 },
      tagPhone: { x: 31, y: 20 },
      tagShort: "Goal",
      children: [para("p1", "Hello")],
    },
    {
      _type: "cleWorldChapter",
      _key: "b",
      title: "Once a month",
      camera: { x: 44, y: 62, zoom: 2.7 },
      tag: { x: 44, y: 47 },
      hotspots: [
        { _key: "h1", x: 37, y: 71, title: "Just conversation", body: "No slides." },
        { _key: "h2", x: 50, y: 51, title: "Once a month", body: "Tuesdays." },
      ],
      children: [para("p2", "Hot dogs")],
    },
  ];
  let html = "";
  let stacked = "";
  beforeEach(async () => {
    html = await render(<World {...{ children: chapters as never }} />);
    stacked = await render(<World mode="stacked" {...{ children: [{ _type: "cleWorldChapter", _key: "c", title: "A" }] as never }} />);
  });
  const cams = () => [...html.matchAll(/data-cam="([^"]*)"/g)].map((m) => JSON.parse(decode(m[1])));
  const stageImg = () => /<div class="cle-world__view">(<img [^>]*>)/.exec(html)?.[1] ?? "";

  it("renders in stage mode by default, with two chapters as articles", () => {
    expect(html).toContain("wp-block-cle-world");
    expect(html).toContain("is-mode-stage");
    expect(count(html, "<article ")).toBe(2);
    expect(html).toContain('id="chapter-once-a-month"');
  });

  it("each chapter carries its camera as JSON", () => {
    const c = cams();
    expect(c).toHaveLength(2);
    expect(c[0].zoom).toBe(1.3);
    expect(c[1].x).toBe(44);
  });

  it("the stage shows the bundled world image, sized and not lazy", () => {
    const img = stageImg();
    expect(img).toContain("world.webp");
    expect(img).toContain('width="');
    expect(img).toContain('height="');
    expect(img).not.toContain("loading=");
  });

  it("hotspots render for the chapter that has them, grouped by chapter and inert", () => {
    expect(count(html, 'class="cle-scene__pin"')).toBe(2);
    expect(html).toMatch(/cle-world__hotspots cle-hotspots" data-chapter="1" inert/);
  });

  it("each chapter has a stacked-mode crop carrying its camera, and its content", () => {
    expect(count(html, "cle-wchapter__crop")).toBe(2);
    expect(html).toContain("--cam-z:1.3");
    expect(html).toContain(">Hot dogs</p>");
  });

  it("stacked mode is selectable", () => {
    expect(stacked).toContain("is-mode-stacked");
  });

  it("each chapter with a tag gets a finale tag carrying its chapter and positions", () => {
    const tags = [...html.matchAll(/<button type="button" class="cle-world__tag"[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(tags).toHaveLength(2);
    expect(tags[0]).toContain('data-chapter="0"');
    expect(tags[0]).toContain('data-at="30,15"');
    expect(tags[0]).toContain('data-at-phone="31,20"');
    expect(tags[0]).toContain(">Our goal</span>");
    expect(tags[0]).toContain(">Goal</span>");
    // Phone position and short label fall back to the defaults.
    expect(tags[1]).toContain('data-at-phone="44,47"');
    expect(tags[1]).toContain('>Once a month</span><span class="cle-world__tag-short">Once a month</span>');
    expect(html).toMatch(/class="cle-world__tags"[^>]*inert/);
    expect(stacked).not.toContain("cle-world__tag");
  });

  it("fadeBelow reaches the camera only where it is set, and the stage has one fade layer", () => {
    const c = cams();
    expect(c[0].cut).toBe(40);
    expect(c[1].cut).toBeUndefined();
    expect(count(html, 'class="cle-world__cut"')).toBe(1);
  });

  it("the 2x picture is offered to laptops exactly when world-2x.webp is bundled", () => {
    const has2x = readdirSync("public/assets/story").includes("world-2x.webp");
    const img = stageImg();
    expect(img.includes("world-2x.webp")).toBe(has2x);
    expect(img.includes('sizes="(min-width: 1024px)')).toBe(has2x);
  });

  it("with a bundled world-2x.webp the stage image gets a srcset and sizes", async () => {
    const sizes = { ...STORY_SIZES, "world-2x": [3344, 1882] };
    const img = await render(<StoryImg slug="world" sizes={sizes} loading={false} />);
    // React serializes srcSet and fetchPriority in camel case; HTML attribute names are case-insensitive.
    expect(img).toMatch(/srcset="\/assets\/story\/world\.webp 1672w, \/assets\/story\/world-2x\.webp 3344w"/i);
    expect(img).toContain('sizes="(min-width: 1024px) 3344px, 557px"');
  });

  it("Dot walks only when a chapter has a stop", async () => {
    expect(html).not.toContain("cle-world__walker");
    const walk = await render(
      <World {...{ children: [{ _type: "cleWorldChapter", _key: "w", title: "W", stop: { x: 20, y: 30 } }] as never }} />,
    );
    expect(walk).toContain('class="cle-world__walker" aria-hidden="true"');
    expect(walk).toContain("dot-walker.webp");
    expect(walk).toContain("dot-walker-wave.webp");
    expect(walk).toContain('data-stop="20,30"');
  });
});

describe("cle/story (test-story.php)", () => {
  fixtures();
  const chapters = [
    { _type: "cleStoryChapter", _key: "a", title: "The door", icon: "chat", layers: ["lights", "room"], children: [para("p1", "Hello")] },
    {
      _type: "cleStoryChapter",
      _key: "b",
      title: "Just conversation",
      icon: "chat",
      camera: { x: 21, y: 40, zoom: 2.2 },
      bubbles: [{ _key: "b1", x: 14, y: 22, text: "What broke this week?" }],
      children: [para("p2", "Talk")],
    },
    { _type: "cleStoryChapter", _key: "c", title: "The big nights", icon: "headphones", night: true, pin: { x: 50, y: 60 }, children: [para("p3", "Night")] },
  ];
  const hotspots = [{ _key: "h", x: 21, y: 36, title: "Just conversation", body: "No slides.", icon: "chat" }];
  let html = "";
  beforeEach(async () => {
    html = await render(await Story({ sponsors: "AWS · OpenAI", hotspots, children: chapters as never }));
  });

  it("stage mode by default, three chapters, the rail links to each", () => {
    expect(html).toContain("is-mode-stage");
    expect(count(html, "<article ")).toBe(3);
    expect(html.match(/<li><a href="#chapter-/g)).toHaveLength(3);
    expect(html).toContain('href="#chapter-just-conversation"');
    expect(html).toContain('id="chapter-just-conversation"');
  });

  it("eight day layers plus the night room, every image sized", () => {
    expect(count(html, 'class="cle-story__layer"')).toBe(8);
    expect(html).toContain('data-layer="neon"');
    const imgs = html.match(/<img [^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThan(9);
    expect(imgs.filter((i) => !i.includes("width=") || !i.includes("height="))).toEqual([]);
  });

  it("bubble, pin, horizon, foreground, TV and sponsor crawl render", () => {
    expect(html).toContain("What broke this week?");
    expect(html).toContain('data-chapter="1"');
    expect(html).toContain("cle-story__pin");
    expect(html).toContain("cle-story__horizon");
    expect(html).toContain('data-foreground="hotdog-beer"');
    expect(html).toContain("Mega Meetup");
    expect(html).toContain("AWS · OpenAI");
  });

  it("hotspots start inert; rail icons are inline SVG; the pattern URL is exposed to CSS", () => {
    expect(html).toMatch(/cle-story__hotspots cle-hotspots"[^>]*inert/);
    expect(html).toContain("cle-icon--headphones");
    expect(html).toContain("--cle-pattern:url(");
  });

  it("the first two layers load eagerly and first; later ones lazily", () => {
    const layers = html.match(/<div class="cle-story__layer" data-layer="[^"]*"><img [^>]*>/g) ?? [];
    expect(layers.length).toBeGreaterThan(2);
    expect(layers[0]).not.toContain("loading=");
    expect(layers[1]).not.toContain("loading=");
    expect(layers[0]).toMatch(/fetchpriority="high"/i);
    expect(layers[1]).toMatch(/fetchpriority="high"/i);
    expect(layers[2]).toContain('loading="lazy"');
  });

  it("stacked mode renders is-mode-stacked", async () => {
    const s = await render(await Story({ mode: "stacked", children: [{ _type: "cleStoryChapter", _key: "x", title: "One" }] as never }));
    expect(s).toContain("is-mode-stacked");
    expect(s).not.toContain("is-mode-stage");
  });

  it("untitled chapters get no rail link; links keep their chapter position in data-index", async () => {
    const s = await render(
      await Story({
        children: [
          { _type: "cleStoryChapter", _key: "1", title: "One" },
          { _type: "cleStoryChapter", _key: "2" },
          { _type: "cleStoryChapter", _key: "3", title: "Three" },
        ] as never,
      }),
    );
    expect(s).not.toContain('href="#"');
    expect(count(s, "<li><a ")).toBe(2);
    expect(s).toContain('href="#chapter-three" data-index="2"');
  });

  it("a pattern id from WordPress (no media library here) falls back to the bundled pattern, quoted", async () => {
    const s = await render(await Story({ patternId: 999999, children: [{ _type: "cleStoryChapter", _key: "1", title: "One" }] as never }));
    expect(s).toMatch(/--cle-pattern:url\(&quot;[^&]*pattern\.webp[^&]*&quot;\)/);
  });
});

describe("cle/story-chapter (test-story-chapter.php)", () => {
  const one = (props: object) => render(<StoryChapter _type="cleStoryChapter" {...props} />);

  it("is an article with a stable anchor; data-chapter holds its state as JSON", async () => {
    const html = await one({
      title: "Just conversation",
      icon: "chat",
      layers: ["lights", "room"],
      camera: { x: 21, y: 40, zoom: 2.2 },
      children: [para("p", "Talk")],
    });
    expect(html).toContain("<article ");
    expect(html).toContain('id="chapter-just-conversation"');
    const state = JSON.parse(decode(/data-chapter="([^"]*)"/.exec(html)?.[1] ?? ""));
    expect(state.camera.zoom).toBe(2.2);
    expect(state.layers).toEqual(["lights", "room"]);
    expect([state.night, state.hotspots, state.pattern]).toEqual([false, false, false]);
    expect(html).toContain(">Talk</p>");
    expect(html).toContain("cle-chapter__crop");
    expect(html).toContain("composite.webp");
    expect(html).toContain("--cam-z:2.2");
    expect(html).toContain("cle-icon--chat");
  });

  it("a night chapter crops the neon room; the finale has no crop", async () => {
    const night = await one({ title: "Night", night: true });
    expect(night).toContain("is-night-chapter");
    expect(night).toContain("neon.webp");
    const finale = await one({ title: "Come say hi", pattern: true });
    expect(finale).toContain("is-pattern-chapter");
    expect(finale).not.toContain("cle-chapter__crop");
  });

  it("the anchor slugifies the title; no title, no anchor", () => {
    expect(chapterAnchor({ title: "Come say hi" })).toBe("chapter-come-say-hi");
    expect(chapterAnchor({})).toBe("");
  });

  it("a zoomed-out camera renders a neutral stacked crop; the crop is clamped so the image fills its box", async () => {
    expect(await one({ title: "Sixteen years", camera: { x: -150, y: 50, zoom: 0.15 } })).toContain('--cam-x:50%;--cam-y:50%;--cam-z:1"');
    expect(await one({ title: "Edge", camera: { x: 80, y: 80, zoom: 2 } })).toContain('--cam-x:75%;--cam-y:75%;--cam-z:2"');
    expect(chapterCropCamera({ x: 80, y: 80, zoom: 2 })).toEqual({ x: 75, y: 75, zoom: 2 });
  });

  it("the state is normalised: defaults for a bare chapter", () => {
    expect(chapterState({})).toEqual({
      icon: "",
      layers: [],
      camera: { x: 50, y: 50, zoom: 1 },
      reveal: false,
      night: false,
      foreground: "",
      hotspots: false,
      pattern: false,
    });
  });
});

describe("story images (test-story-images.php)", () => {
  it.each(["lights", "room", "table-1", "table-2", "table-3", "table-4", "bar-staff", "counter", "neon", "hotdog-beer", "pattern", "composite"])(
    "%s.webp is bundled",
    (slug) => {
      expect(storyAssetUrl(slug)).not.toBe("");
    },
  );

  it("knows the size of every bundled story image", () => {
    const files = readdirSync("public/assets/story").filter((f) => f.endsWith(".webp"));
    expect(Object.keys(STORY_SIZES).sort()).toEqual(files.map((f) => f.replace(/\.webp$/, "")).sort());
    for (const f of files) {
      const info = imageInfo(readFileSync(`public/assets/story/${f}`))!;
      expect(STORY_SIZES[f.replace(/\.webp$/, "")], f).toEqual([info.width, info.height]);
    }
  });

  it("the default carries its real size and is lazy unless switched off", async () => {
    const img = await render(<StoryImg slug="lights" />);
    expect(img).toContain('width="2000"');
    expect(img).toContain('height="1116"');
    expect(img).toContain('loading="lazy"');
    expect(await render(<StoryImg slug="lights" loading={false} />)).not.toContain("loading=");
  });

  it("an unknown slug renders nothing, and the asset map lists neon", async () => {
    expect(await render(<StoryImg slug="missing-slug" />)).toBe("");
    expect(await render(<StoryImg slug="../art-sizes" />)).toBe("");
    expect(storyAssetUrls().neon).toBe("/assets/story/neon.webp");
  });
});

describe("cle/first-night", () => {
  fixtures();

  it("with visible: false renders nothing", async () => {
    expect(await render(<FirstNight visible={false} />)).toBe("");
  });

  it("shows five moments by default, each with its picture, and ends on the next social", async () => {
    const html = await render(<FirstNight />);
    expect(html).toContain("wp-block-cle-first-night");
    expect(html).toContain('data-on="0"');
    expect(count(html, '<li class="cle-night__step"')).toBe(5);
    expect(count(html, '<figure class="cle-night__frame"')).toBe(5);
    expect(html).toContain("night-arrive.webp");
    expect(html).toContain("What a social is actually like.");
    const last = html.slice(html.lastIndexOf('<li class="cle-night__step"'));
    expect(last).toContain("Next social");
    expect(last).toContain("Monthly Social at Happy Dog");
  });

  it("steps without a title are dropped; with none left there is nothing", async () => {
    expect(await render(<FirstNight steps={[{ _key: "a", title: " " }]} />)).toBe("");
  });
});

describe("the homepage (test-front-page.php)", () => {
  fixtures();
  let html = "";
  beforeEach(async () => {
    html = await render(await HomeBody());
  });
  const cams = () => [...html.matchAll(/data-cam="([^"]*)"/g)].map((m) => JSON.parse(decode(m[1])));

  it("the homepage story is the world block, with six chapters", () => {
    expect(html).toContain("wp-block-cle-world");
    expect(count(html, "<article ")).toBe(6);
  });

  it("opens zoomed in on the city with the lower picture faded out, and ends on the whole picture", () => {
    const c = cams();
    expect(c[0].zoom).toBeGreaterThan(1);
    expect(c[0].cut).toBeGreaterThan(0);
    expect(c[0].cut).toBeLessThan(50);
    expect(c.at(-1).zoom).toBe(1);
  });

  it("chapter 1 carries the goal as the h1", () => {
    expect(html).toContain("<h1");
    expect(html).toContain("Making AI accessible to everyone.");
  });

  it("the next Social and the next Mega Meetup render live; the address is in the copy", () => {
    expect(html).toContain("Monthly Social at Happy Dog");
    expect(html).toContain("Mega Meetup at the Museum");
    expect(html).toContain("5801 Detroit Avenue");
  });

  it.each(["4,284", "183", "4.8", "1,465"])("figure %s is present", (figure) => {
    expect(html).toContain(figure);
  });

  it("16 markers across five chapters, five at Happy Dog; every chapter but the finale has markers", () => {
    expect(count(html, 'class="cle-scene__pin"')).toBe(16);
    const groups = [...html.matchAll(/cle-world__hotspots cle-hotspots" data-chapter="(\d)"/g)].map((m) => m[1]);
    expect(groups).toEqual(["0", "1", "2", "3", "4"]);
    const happyDog = /data-chapter="2" inert="">([\s\S]*?)<\/div><div class="cle-world__hotspots/.exec(html)?.[1] ?? "";
    expect(count(happyDog, 'class="cle-scene__pin"')).toBe(5);
  });

  it("no timeline; a finale tag for each of the five places; only the stage-only tag hint", () => {
    expect(html).not.toContain("wp-block-cle-timeline");
    expect(count(html, 'class="cle-world__tag"')).toBe(5);
    expect(count(html, 'class="cle-world-only')).toBe(1);
    expect(html).not.toContain("what to expect");
  });

  it("the \"How it started\" chapter tells the after-merger story", () => {
    const chapter = html.slice(html.indexOf('id="chapter-how-it-started"'));
    expect(chapter).toContain("Sixteen years of showing up.");
    expect(chapter).toContain("in November 2024 the two merged to form CLE AI &amp; DATA");
    expect(chapter).toContain("registered 501(c)(3) nonprofit");
    expect(chapter).toContain("Data in the Land");
    expect(chapter).not.toContain("183 events later");
  });

  it("the hidden first night renders nothing; the latest posts follow the story", () => {
    expect(html).not.toContain("cle-night");
    expect(html).toContain("Latest posts");
  });

  it("ends with the hydration marker the count-up waits for", () => {
    expect(html).toContain('<span hidden="" data-cle-hydrating=""></span>');
  });

  it("the story's <main> is the skip link's target", () => {
    // (React hoists the stage picture's preload <link> ahead of the markup; Next moves it into <head>.)
    expect(html).toMatch(/^(<link [^>]*>)*<main id="wp--skip-link--target" class="wp-block-group alignfull/);
  });
});

describe("the figures count-up waits for the page to hydrate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("the server renders a hidden marker that hydration removes; the homepage carries one", async () => {
    expect(await render(<HydrationPending />)).toBe('<span hidden="" data-cle-hydrating=""></span>');
  });

  it("while the marker is on the page, the in-view figures line is left alone; then it counts", () => {
    vi.useFakeTimers();
    const frames: (() => void)[] = [];
    let pending = true;
    let wrapped = 0;
    const text = { nodeValue: "4,284 members", parentNode: { replaceChild: () => wrapped++ } };
    let walked = false;
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), innerHeight: 800, addEventListener: () => {}, removeEventListener: () => {} });
    vi.stubGlobal("requestAnimationFrame", (fn: () => void) => frames.push(fn));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("NodeFilter", { SHOW_TEXT: 4 });
    vi.stubGlobal("performance", { now: () => Date.now() });
    vi.stubGlobal("document", {
      querySelector: (sel: string) => (sel === "[data-cle-hydrating]" && pending ? {} : null),
      querySelectorAll: (sel: string) => (sel === ".cle-count" ? [] : [{ getBoundingClientRect: () => ({ top: 10, bottom: 50 }) }]),
      createTreeWalker: () => ({ nextNode: () => (walked ? null : ((walked = true), text)) }),
      createDocumentFragment: () => ({ appendChild: () => {} }),
      createTextNode: (t: string) => ({ t }),
      createElement: () => ({ className: "", dataset: {}, textContent: "" }),
    });
    const stop = startCountUp();
    frames.shift()!();
    frames.shift()!();
    expect(wrapped).toBe(0);
    expect(frames).toHaveLength(1);
    pending = false;
    frames.shift()!();
    expect(wrapped).toBe(1);
    stop();
  });
});

describe("fix round 1", () => {
  it("the skip link goes to the first <main>'s own id, else to wp--skip-link--target (WordPress's skip-link script)", () => {
    expect(skipHref(null)).toBe("#wp--skip-link--target");
    expect(skipHref({ id: "" })).toBe("#wp--skip-link--target");
    expect(skipHref({ id: "story" })).toBe("#story");
  });

  describe("with fixtures", () => {
    fixtures();
    it("a homepage <main> with its own anchor keeps it", async () => {
      const html = await render(<HomeBodyView body={[{ _type: "section", _key: "m", tag: "main", anchor: "story", children: [para("p", "Hi")] }] as never} />);
      expect(html).toMatch(/<main id="story"/);
    });

    it("story rail, bubble and pin put the icon straight into the theme's elements", async () => {
      const html = await render(
        await Story({
          children: [
            { _type: "cleStoryChapter", _key: "a", title: "Talk", icon: "chat", bubbles: [{ _key: "b", x: 1, y: 2, text: "Hi <there>" }], pin: { x: 5, y: 6 } },
          ] as never,
        }),
      );
      expect(html).not.toContain("display:contents");
      expect(html).toMatch(/<a href="#chapter-talk" data-index="0"><svg class="cle-icon cle-icon--chat"[^]*?<\/svg><span class="screen-reader-text">Talk<\/span><\/a>/);
      expect(html).toMatch(/<p class="cle-story__bubble"[^>]*><svg class="cle-icon cle-icon--chat"[^]*?<\/svg><span>Hi &lt;there&gt;<\/span><\/p>/);
      expect(html).toMatch(/<span class="cle-story__pin"[^>]*><svg class="cle-icon cle-icon--pin"[^]*?<\/svg><\/span>/);
    });
  });
});
