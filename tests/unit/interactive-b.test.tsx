// Interactive blocks, part two: the cle/sponsor-builder, cle/gift-slider, cle/way-finder and
// cle/coming-up sections of tests/php/test-interactive.php (1, 2, 5, coming-up) and test-coming-up.php.
// The browser behaviour is in tests/e2e/interactive-b.spec.ts.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blockComponents } from "@/blocks/registry";
import { ComingUp, ComingUpView, buildComingCards } from "@/blocks/coming-up/ComingUp";
import { GiftSlider } from "@/blocks/gift-slider/GiftSlider";
import { money } from "@/blocks/gift-slider/logic";
import { SponsorBuilder } from "@/blocks/sponsor-builder/SponsorBuilder";
import { formHref, mailtoHref, packageTier, pickPerk, requestPackage, tierIndex } from "@/blocks/sponsor-builder/logic";
import { WayFinder } from "@/blocks/way-finder/WayFinder";
import { ANCHORS, recommend } from "@/blocks/way-finder/logic";
import { EVENTS, NOW } from "./helpers/fixtures";

const count = (s: string, needle: string) => s.split(needle).length - 1;
const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("registry", () => {
  it("registers the four blocks of this task", () => {
    for (const t of ["cleSponsorBuilder", "cleGiftSlider", "cleWayFinder", "cleComingUp"]) {
      expect(blockComponents[t], t).toBeTypeOf("function");
    }
  });
});

describe("cle/sponsor-builder", () => {
  const html = render(<SponsorBuilder />);

  it("five toggle buttons, none pressed", () => {
    expect(count(html, 'class="cle-builder__perk"')).toBe(5);
    expect(count(html, 'aria-pressed="false"')).toBe(5);
    expect(html).toContain("wp-block-cle-sponsor-builder");
  });

  it("the tiers read Event $800, Season $1,800 and Presenting $2,500, in order of their minimum", () => {
    expect(html).toContain('<span class="cle-builder__price">$800</span>');
    expect(html).toContain('<span class="cle-builder__price">$1,800</span>');
    expect(html).toContain('<span class="cle-builder__price">$2,500</span>');
    expect(html.indexOf("Event sponsor")).toBeLessThan(html.indexOf("Season sponsor"));
    expect(html.indexOf("Season sponsor")).toBeLessThan(html.indexOf("Presenting sponsor"));
    const sorted = render(<SponsorBuilder tiers={[{ name: "B", min: 5, price: "$2" }, { name: "A", min: 1, price: "$1" }]} />);
    expect(sorted.indexOf(">A<")).toBeLessThan(sorted.indexOf(">B<"));
  });

  it("without a form link, the button emails info@cle-ai.com", () => {
    expect(html).toContain('href="mailto:info@cle-ai.com?subject=Sponsoring%20CLE%20AI%20%26%20DATA"');
    expect(html).toContain(">Ask about this package<");
  });

  it("a pre-filled https form link is used, anything else is not", () => {
    const f = render(<SponsorBuilder formUrl="https://docs.google.com/forms/d/e/x/viewform?usp=pp_url&entry.1=PACKAGE" />);
    expect(f).toContain('href="https://docs.google.com/forms/d/e/x/viewform?usp=pp_url&amp;entry.1=PACKAGE"');
    const bad = render(<SponsorBuilder formUrl="javascript:alert(1)" />);
    expect(bad).not.toContain("javascript:");
    expect(bad).toContain("mailto:info@cle-ai.com");
  });

  it("the form link's PACKAGE is replaced by the picks once some are made", () => {
    expect(formHref("https://f.example/x?entry.1=PACKAGE", ["A table", "Cover the food"])).toBe("https://f.example/x?entry.1=A%20table%2C%20Cover%20the%20food");
    expect(formHref("https://f.example/x?entry.1=PACKAGE", [])).toBe("https://f.example/x?entry.1=PACKAGE");
  });

  it("perks without a label and tiers without a name are left out; no perks renders nothing", () => {
    const out = render(<SponsorBuilder perks={[{ label: " ", weight: 1 }, { label: "Only", weight: 1 }]} tiers={[{ name: "", min: 1, price: "$1" }]} />);
    expect(count(out, 'class="cle-builder__perk"')).toBe(1);
    expect(out).not.toContain("cle-builder__tiers");
    expect(render(<SponsorBuilder perks={[]} />)).toBe("");
  });

  describe("picking perks", () => {
    const tiers = [{ name: "Event sponsor", min: 1, price: "$800" }, { name: "Season sponsor", min: 3, price: "$1,800" }, { name: "Presenting sponsor", min: 5, price: "$2,500" }];
    const weights = [1, 2, 3, 1, 2];

    it("the matching tier is the highest whose minimum the total reaches", () => {
      expect(tierIndex(tiers, 0)).toBe(-1);
      expect(tierIndex(tiers, 1)).toBe(0);
      expect(tierIndex(tiers, 3)).toBe(1);
      expect(tierIndex(tiers, 9)).toBe(2);
    });

    it("reaching the top tier celebrates once; later picks do not", () => {
      let s = { picked: weights.map(() => false), celebrated: false };
      const fired: boolean[] = [];
      for (const i of [0, 1, 2, 3, 4]) {
        const r = pickPerk(s, i, weights, tiers);
        fired.push(r.celebrate);
        s = r.state;
      }
      // 1, 3, 6 (top reached here), 7, 9
      expect(fired).toEqual([false, false, true, false, false]);
      const off = pickPerk(s, 4, weights, tiers); // un-pick, then pick again
      const on = pickPerk(off.state, 4, weights, tiers);
      expect(off.celebrate || on.celebrate).toBe(false);
    });

    it("the package tier is the one the result text names: the first tier when the picks fall below every minimum", () => {
      const high = [{ name: "Event sponsor", min: 2, price: "$800" }, { name: "Season sponsor", min: 4, price: "$1,800" }];
      expect(packageTier(high, 1)).toBe("Event sponsor");
      expect(packageTier(high, 2)).toBe("Event sponsor");
      expect(packageTier(high, 5)).toBe("Season sponsor");
      expect(packageTier([], 3)).toBe("");
    });

    it("the email carries the package, URL-encoded", () => {
      const href = mailtoHref("mailto:info@cle-ai.com?subject=Sponsoring%20CLE%20AI%20%26%20DATA", ["A table", "Cover the food"], "Season sponsor");
      expect(href).toContain("&body=");
      const body = decodeURIComponent(href.split("&body=")[1]);
      expect(body).toContain("A table, Cover the food");
      expect(body).toContain("Season sponsor");
      expect(mailtoHref("mailto:x@y.z?subject=S", [], "")).toBe("mailto:x@y.z?subject=S");
    });
  });

  describe("the button and the inquiry form (Task 13)", () => {
    const stub = (hasForm: boolean) => {
      const events: CustomEvent[] = [];
      const scrolled: unknown[] = [];
      const target = { scrollIntoView: (o: unknown) => scrolled.push(o) };
      vi.stubGlobal("window", { dispatchEvent: (e: CustomEvent) => events.push(e), matchMedia: () => ({ matches: false }) });
      vi.stubGlobal("document", { getElementById: (id: string) => (hasForm && id === "sponsor-inquiry" ? target : null) });
      return { events, scrolled };
    };
    afterEach(() => vi.unstubAllGlobals());

    it("with #sponsor-inquiry on the page: dispatches cle:sponsor-package with {tier, perks} and scrolls there", () => {
      const { events, scrolled } = stub(true);
      expect(requestPackage({ tier: "Season sponsor", perks: ["A table"] })).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("cle:sponsor-package");
      expect(events[0].detail).toEqual({ tier: "Season sponsor", perks: ["A table"] });
      expect(scrolled).toEqual([{ behavior: "smooth" }]);
    });

    it("without it: does nothing, so the link falls back to the mailto", () => {
      const { events, scrolled } = stub(false);
      expect(requestPackage({ tier: "Event sponsor", perks: ["A table"] })).toBe(false);
      expect(requestPackage({ tier: "", perks: [] })).toBe(false);
      expect(events).toHaveLength(0);
      expect(scrolled).toHaveLength(0);
    });

    it("nothing picked: no event, but it still scrolls to the form", () => {
      const { events, scrolled } = stub(true);
      expect(requestPackage({ tier: "", perks: [] })).toBe(true);
      expect(events).toHaveLength(0);
      expect(scrolled).toEqual([{ behavior: "smooth" }]);
    });

    it("reduced motion scrolls without animation", () => {
      const { scrolled } = stub(true);
      vi.stubGlobal("window", { dispatchEvent: () => true, matchMedia: () => ({ matches: true }) });
      requestPackage({ tier: "Event sponsor", perks: ["A table"] });
      expect(scrolled).toEqual([{ behavior: "auto" }]);
    });
  });
});

describe("cle/gift-slider", () => {
  const html = render(<GiftSlider />);

  it("six steps, starting at $100, with its value text", () => {
    expect(html).toContain('type="range"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="5"');
    expect(html).toContain('value="2"');
    expect(html).toContain('aria-valuetext="$100: Pizza for a monthly social"');
  });

  it("the no-script list shows every amount", () => {
    expect(count(html, "<li><strong>$")).toBe(6);
    for (const a of ["$25", "$55", "$100", "$250", "$500", "$1,000"]) expect(html).toContain(`<li><strong>${a}</strong>`);
  });

  it("the live slider waits for scripts (hidden), the pile starts with the first three objects", () => {
    expect(html).toMatch(/class="cle-gift__live"[^>]*hidden/);
    expect(count(html, "cle-gift__piece is-on")).toBe(3);
    expect(html).toContain('href="#donate"');
    expect(html).toContain(">Give $100<");
  });

  it("steps sort by amount and the start is clamped", () => {
    const g = render(<GiftSlider steps={[{ amount: 500, label: "B" }, { amount: 20, label: "A" }]} start={9} />);
    expect(g.indexOf("<li><strong>$20<")).toBeLessThan(g.indexOf("<li><strong>$500<"));
    expect(g).toContain('max="1"');
    expect(g).toContain('value="1"');
    expect(render(<GiftSlider steps={[{ amount: 0, label: "Z" }]} />)).toBe("");
  });

  it("money groups thousands", () => {
    expect(money(1000)).toBe("$1,000");
    expect(money(55)).toBe("$55");
  });
});

describe("cle/way-finder", () => {
  const html = render(<WayFinder />);

  it("three questions, eleven answers, a hidden live result, no inline script", () => {
    expect(count(html, "<fieldset")).toBe(3);
    expect(count(html, 'type="radio"')).toBe(11);
    expect(html).toContain('aria-live="polite" hidden');
    expect(html).not.toContain("onsubmit");
    expect(html).toContain("Not sure where to start?");
  });

  it("recommends one of the six anchors", () => {
    expect([...ANCHORS]).toEqual(["events", "newsletter", "speak", "volunteer", "sponsor", "donate"]);
    const picks = [
      recommend(["speak events", "speak volunteer sponsor", "speak"]),
      recommend(["sponsor events", "newsletter donate", "sponsor donate"]),
      recommend(["volunteer donate", "events volunteer", "events volunteer"]),
      recommend(["events newsletter", "newsletter donate", "events newsletter"]),
    ];
    expect(picks).toEqual(["speak", "sponsor", "volunteer", "newsletter"]);
    for (const p of picks) expect(ANCHORS).toContain(p);
  });

  it("ties go to the earlier way in", () => {
    expect(recommend(["speak", "donate", "sponsor"])).toBe("speak");
    expect(recommend([])).toBe("events");
  });
});

describe("cle/coming-up", () => {
  const wants = [{ match: "Mega", label: "Next big night" }, { match: "Social", label: "Next social" }];
  const post = { title: "A post", slug: { current: "a-post" }, publishedAt: "2026-10-20T14:00:00Z" };
  const cards = (over: Partial<Parameters<typeof buildComingCards>[0]> = {}) =>
    buildComingCards({ events: EVENTS, wants, showPost: true, postLabel: "Latest post", post, now: NOW, ...over });

  it("two event cards that follow their words, in order, and the latest post", () => {
    const c = cards();
    expect(c.map((x) => x.title)).toEqual(["Mega Meetup at the Museum", "Monthly Social at Happy Dog", "A post"]);
    expect(c.map((x) => x.label)).toEqual(["Next big night", "Next social", "Latest post"]);
    expect(c[0].url).toBe("/events/mega-meetup-at-the-museum");
    expect(c[2].url).toBe("/blog/a-post");
  });

  it("a second card for the same word falls back to a different event", () => {
    const c = cards({ wants: [{ match: "Social", label: "A" }, { match: "Social", label: "B" }], showPost: false });
    expect(c).toHaveLength(2);
    expect(c[0].title).not.toBe(c[1].title);
  });

  it("an unmatched word still shows the next event not already shown", () => {
    const c = cards({ wants: [{ match: "Mega", label: "X" }, { match: "zzz-no-such-event", label: "Y" }], showPost: false });
    expect(c).toHaveLength(2);
    expect(c[1].title).not.toBe("Mega Meetup at the Museum");
    expect(c[1].title).toBe("Tonight: lightning talks");
  });

  it("a post with an invalid publishedAt renders without throwing, and without a date tile", () => {
    const c = cards({ post: { ...post, publishedAt: "not a date" } });
    expect(c).toHaveLength(3);
    expect(() => render(<ComingUpView cards={c} />)).not.toThrow();
    expect(c[2].date).toBe("");
  });

  it("the post card can be turned off, and a missing post adds nothing", () => {
    expect(cards({ showPost: false })).toHaveLength(2);
    expect(cards({ post: null })).toHaveLength(2);
  });

  it("markup: three cards, labels, dated tiles in ET, colours in order, chips as tokens", () => {
    const html = render(<ComingUpView cards={cards()} />);
    expect(count(html, '<li class="cle-coming__card"')).toBe(3);
    expect(html).toMatch(/cle-coming__title">Mega Meetup at the Museum</);
    expect(count(html, '<time class="cle-coming__date" dateTime="')).toBe(3);
    expect(html).toContain('dateTime="2026-10-29"');
    expect(html).toContain('<span class="cle-coming__month">Oct</span><span class="cle-coming__day">29</span>');
    expect(html).toContain("--chip:var(--wp--preset--color--blue)");
    expect(html).toContain("--chip:var(--wp--preset--color--coral)");
    expect(html).toContain("--chip:var(--wp--preset--color--yellow)");
    expect(html).toContain('aria-label="Coming up"');
    expect(html).toContain("wp-block-cle-coming-up");
  });

  it("an event card's meta is the weekday and time, then the venue", () => {
    const html = render(<ComingUpView cards={cards()} />);
    expect(html).toMatch(/cle-coming__meta">Thu 5:00 pm · [^<]+</);
  });

  it("nothing to show: sleeping Dot and a Meetup link", () => {
    const html = render(<ComingUpView cards={[]} />);
    expect(html).toContain("dot-sleep.webp");
    expect(html).toContain("Nothing on the calendar right now.");
    expect(html).toContain("https://www.meetup.com/cleveland-ai-data/");
  });

  describe("from the fixture dataset", () => {
    beforeEach(() => {
      vi.stubEnv("CONTENT_SOURCE", "fixtures");
      vi.stubEnv("FIXTURES_NOW", NOW.toISOString());
    });
    afterEach(() => vi.unstubAllEnvs());

    it("the post card never shows a post whose publishOn is in the future", async () => {
      const html = render(await ComingUp({}));
      expect(html).toContain("Latest post");
      expect(html).not.toContain("Scheduled test post");
      expect(html).not.toContain("scheduled-test-post");
      expect(count(html, '<li class="cle-coming__card"')).toBe(3);
    });

    it("once its time has come it is the latest post", async () => {
      vi.stubEnv("FIXTURES_NOW", "2100-01-01T00:00:00Z");
      expect(render(await ComingUp({}))).toContain("scheduled-test-post");
    });
  });
});
