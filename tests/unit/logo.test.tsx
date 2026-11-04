// Port of tests/php/test-logo.php, plus the wp_head script that skips the drop-in after the first page.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Logo } from "@/blocks/logo/Logo";
import { HeaderView } from "@/components/Header";
import { HEAD_SCRIPT } from "@/lib/headScript";
import { SETTINGS } from "./helpers/fixtures";

describe("cle/logo", () => {
  const html = renderToStaticMarkup(<Logo />);

  it("links home", () => {
    expect(html).toContain('class="wp-block-cle-logo"');
    expect(html).toContain('href="/"');
  });

  it("is labelled, and the dots are hidden from screen readers", () => {
    expect(html).toContain('aria-label="CLE AI &amp; DATA home"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("has four dots, each in its palette colour, in the artwork's drop-in order", () => {
    expect(html.split('class="cle-logo__dot"').length - 1).toBe(4);
    for (const slug of ["blue", "yellow", "coral", "green"]) {
      expect(html).toContain(`--c:var(--wp--preset--color--${slug})`);
    }
    // dots.php, verbatim.
    expect(html).toContain('style="--x:36.71%;--y:28.71%;--r:28.73%;--c:var(--wp--preset--color--blue);--i:0"');
    expect(html).toContain('style="--x:26%;--y:82.48%;--r:11%;--c:var(--wp--preset--color--green);--i:3"');
  });

  it("takes its label from the block attribute", () => {
    expect(renderToStaticMarkup(<Logo label="Home" />)).toContain('aria-label="Home"');
  });

  it("the header uses the animated logo", () => {
    const header = renderToStaticMarkup(<HeaderView settings={SETTINGS} />);
    expect(header).toContain("wp-block-cle-logo");
    expect(header).not.toContain("wp-block-site-logo");
  });
});

describe("head script (functions.php wp_head)", () => {
  type Fake = { classes: Set<string>; run: () => void };
  const fake = (storage: () => string | null): Fake => {
    const classes = new Set<string>();
    const document = { documentElement: { classList: { add: (c: string) => classes.add(c) } } };
    const sessionStorage = { getItem: storage };
    return { classes, run: () => runInNewContext(HEAD_SCRIPT, { document, sessionStorage }) };
  };

  it("is the theme's script, verbatim", () => {
    expect(HEAD_SCRIPT).toBe(
      "(function(d){d.classList.add('cle-js');try{if(sessionStorage.getItem('cle-logo-seen'))d.classList.add('cle-logo-seen')}catch(e){}})(document.documentElement);",
    );
  });

  it("marks html.cle-logo-seen when the flag is set, so the drop-in is skipped", () => {
    const f = fake(() => "1");
    f.run();
    expect([...f.classes]).toEqual(["cle-js", "cle-logo-seen"]);
  });

  it("first page of a visit: only cle-js, so the dots drop in", () => {
    const f = fake(() => null);
    f.run();
    expect([...f.classes]).toEqual(["cle-js"]);
  });

  it("storage that throws (private mode) still gets cle-js", () => {
    const f = fake(() => {
      throw new Error("denied");
    });
    f.run();
    expect([...f.classes]).toEqual(["cle-js"]);
  });

  it("the drop-in animation only applies without html.cle-logo-seen", () => {
    const css = readFileSync("src/styles/blocks/logo.css", "utf8");
    expect(css).toMatch(/html:not\(\.cle-logo-seen\) \.cle-logo__dot \{\s*animation: cle-logo-drop/);
  });
});
