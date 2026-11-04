// The recap command (Task 18): notes parsing, the draft it builds, the drafts-only push and the CLI.
// No network: every Sanity call goes through a fake RecapClient.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { RichBody } from "@/components/RichBody";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import type { EventDoc } from "@/lib/events/time";
import { buildRecapDraft, findRecapEvent, parseNotes, recapDraftId } from "../../scripts/recap/notes";
import type { SanityClient } from "@sanity/client";
import { fromSanityClient, pushDraft, resizePhoto, type RecapClient } from "../../scripts/recap/push";
import { run, studioLink } from "../../scripts/recap/index";
import { EVENTS, event } from "./helpers/fixtures";

const NOTES = `---
title: "October workshop: what we built"
excerpt: Forty people spent a morning wiring models into real tools.
---

## The talks

Ana opened with **three** demos and a [repo](https://example.org/repo).

- Retrieval over meeting notes
- A support triage bot

## What people asked

Most questions were about cost.

> Start with the boring problem.
> It pays for the fun one.
— Ana Ruiz, Staff Engineer, Acme

> Ship it on Friday.
-- Ben Ode

> Nobody said who said this.
`;

type Doc = Record<string, unknown> & { _id: string };

function fakeClient(docs: Record<string, Doc> = {}, events: EventDoc[] = EVENTS, publishedRecaps: { _id: string; slug: string }[] = []) {
  const store = new Map(Object.entries(docs));
  const client: RecapClient & { uploads: string[]; queries: Array<{ query: string; params?: Record<string, unknown> }> } = {
    uploads: [],
    queries: [],
    fetch: vi.fn(async (query: string, params?: Record<string, unknown>) => {
      client.queries.push({ query, params });
      return (query.includes('kind == "recap"') ? publishedRecaps : events) as never;
    }),
    getDocument: vi.fn(async (id: string) => store.get(id) ?? null),
    create: vi.fn(async (doc: Doc) => {
      if (store.has(doc._id)) throw new Error("exists");
      store.set(doc._id, doc);
      return doc;
    }),
    replaceDraft: vi.fn(async (doc: Doc, rev: string) => {
      if (store.get(doc._id)?._rev !== rev) throw new Error("revision mismatch");
      store.set(doc._id, doc);
      return doc;
    }),
    uploadImage: vi.fn(async (_buf: Buffer, opts: { filename: string }) => {
      client.uploads.push(opts.filename);
      return { _id: `image-${opts.filename.replace(/\W/g, "")}-10x10-jpg` };
    }),
  };
  return client;
}

const body = (doc: Record<string, unknown>) => doc.body as Array<Record<string, unknown>>;

describe("parseNotes", () => {
  const notes = parseNotes(NOTES);

  it("reads the front matter", () => {
    expect(notes.title).toBe("October workshop: what we built");
    expect(notes.excerpt).toBe("Forty people spent a morning wiring models into real tools.");
  });

  it("reads 2 sections, and the quotes with names and titles", () => {
    expect(notes.sections.map((s) => s.heading)).toEqual(["The talks", "What people asked"]);
    expect(notes.sections[0].blocks).toEqual([
      { kind: "paragraph", text: "Ana opened with **three** demos and a [repo](https://example.org/repo)." },
      { kind: "bullet", text: "Retrieval over meeting notes" },
      { kind: "bullet", text: "A support triage bot" },
    ]);
    expect(notes.quotes.slice(0, 2)).toEqual([
      { text: "Start with the boring problem. It pays for the fun one.", citeName: "Ana Ruiz", citeTitle: "Staff Engineer, Acme" },
      { text: "Ship it on Friday.", citeName: "Ben Ode", citeTitle: "[title]" },
    ]);
  });

  it("gives a quote without a — Name line citeName '[speaker]'", () => {
    expect(notes.quotes[2]).toEqual({ text: "Nobody said who said this.", citeName: "[speaker]", citeTitle: "[title]" });
  });

  it("doesn't credit an unattributed quote to the next quote's speaker (empty > line separates)", () => {
    const q = parseNotes("> Quote one, no speaker\n>\n> Quote two\n— Ana Ruiz, CTO\n").quotes;
    expect(q).toEqual([
      { text: "Quote one, no speaker", citeName: "[speaker]", citeTitle: "[title]" },
      { text: "Quote two", citeName: "Ana Ruiz", citeTitle: "CTO" },
    ]);
  });

  it("a blank line separates quotes too", () => {
    const q = parseNotes("> Quote one, no speaker\n\n> Quote two\n— Ana Ruiz, CTO\n").quotes;
    expect(q.map((x) => x.citeName)).toEqual(["[speaker]", "Ana Ruiz"]);
  });

  it("reads consecutive > lines with no separator as one quote (the format's rule)", () => {
    const q = parseNotes("> Quote one, no speaker\n> Quote two\n— Ana Ruiz, CTO\n").quotes;
    expect(q).toEqual([{ text: "Quote one, no speaker Quote two", citeName: "Ana Ruiz", citeTitle: "CTO" }]);
  });

  it("attaches a cite line that follows its quote after blank lines", () => {
    const notes = parseNotes("> Ship it.\n\n\n— Ben Ode, Founder\n\nAfter text.\n");
    expect(notes.quotes).toEqual([{ text: "Ship it.", citeName: "Ben Ode", citeTitle: "Founder" }]);
    expect(notes.sections[0].blocks).toEqual([{ kind: "paragraph", text: "After text." }]);
  });

  it("leaves title and excerpt undefined without front matter", () => {
    const bare = parseNotes("## Only\n\nText.");
    expect(bare.title).toBeUndefined();
    expect(bare.excerpt).toBeUndefined();
    expect(bare.sections).toHaveLength(1);
  });
});

describe("buildRecapDraft", () => {
  const workshop = event("october-workshop");
  const draft = buildRecapDraft(workshop, parseNotes(NOTES), ["image-a-10x10-jpg", "image-b-10x10-jpg"], new Date("2026-11-04T12:00:00Z"));

  it("is a recap post draft linked to the event", () => {
    expect(draft._id).toBe("drafts.recap-october-workshop");
    expect(draft._id.startsWith("drafts.")).toBe(true);
    expect(draft._type).toBe("post");
    expect(draft.kind).toBe("recap");
    expect(draft.event).toEqual({ _type: "reference", _ref: workshop._id });
    expect(draft.slug).toEqual({ _type: "slug", current: "recap-october-workshop" });
    expect(draft.title).toBe("October workshop: what we built");
    expect(draft.publishedAt).toBe("2026-11-04T12:00:00.000Z");
    expect(draft).not.toHaveProperty("publishOn");
  });

  it("has the Studio recap shape: write-up sections, a gallery with one image per photo, then quotes", () => {
    const items = body(draft);
    expect(items.map((i) => i._type)).toEqual(["section", "section", "section", "quote", "quote", "quote"]);
    expect(items.slice(0, 2).map((i) => i.className)).toEqual(["cle-recap-writeup", "cle-recap-writeup"]);
    const gallery = items[2];
    expect(gallery.className).toBe("cle-recap-gallery");
    const children = gallery.children as Array<Record<string, unknown>>;
    expect(children[0]).toMatchObject({ _type: "block", style: "h2", children: [{ text: "Photos" }] });
    const images = children.filter((c) => c._type === "image");
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({ asset: { _type: "reference", _ref: "image-a-10x10-jpg" }, alt: "[describe this photo]" });
    expect(items[3]).toMatchObject({ _type: "quote", citeName: "Ana Ruiz", citeTitle: "Staff Engineer, Acme" });
  });

  it("turns bullets into list items and inline Markdown into marks and links", () => {
    const writeup = body(draft)[0].children as Array<Record<string, unknown>>;
    expect(writeup[0]).toMatchObject({ style: "h2", children: [{ text: "The talks" }] });
    const para = writeup[1] as { children: Array<{ text: string; marks: string[] }>; markDefs: Array<{ _key: string; href: string }> };
    expect(para.children.map((c) => c.text).join("")).toBe("Ana opened with three demos and a repo.");
    expect(para.children.find((c) => c.text === "three")?.marks).toEqual(["strong"]);
    const link = para.children.find((c) => c.text === "repo")!;
    expect(para.markDefs).toEqual([{ _type: "link", _key: link.marks[0], href: "https://example.org/repo", blank: false }]);
    expect(writeup[2]).toMatchObject({ listItem: "bullet", level: 1 });
  });

  it("uses placeholders, never invention, when the notes are thin", () => {
    const thin = buildRecapDraft(workshop, parseNotes("> A line.\n"), []);
    expect(thin.title).toBe("Recap: October workshop");
    expect(thin.excerpt).toBe("[excerpt]");
    const items = body(thin);
    expect(items[0].className).toBe("cle-recap-writeup");
    expect(JSON.stringify(items[0])).toContain("[");
    expect(items.at(-1)).toMatchObject({ citeName: "[speaker]", citeTitle: "[title]" });
  });

  it("keeps the id within Sanity's id characters", () => {
    expect(recapDraftId({ slug: { _type: "slug", current: "Café night!/2" } })).toBe("drafts.recap-Caf--night--2");
  });

  it("renders through RichBody like a Studio-made recap", () => {
    const html = renderToStaticMarkup(createElement(RichBody, { value: body(draft) as unknown as RichBodyValue }));
    expect(html).toContain('class="wp-block-group cle-recap-writeup');
    expect(html).toContain('class="wp-block-group cle-recap-gallery');
    expect(html).toContain("<cite>Ana Ruiz, Staff Engineer, Acme</cite>");
    expect(html).toContain('<ul class="wp-block-list"><li>Retrieval over meeting notes</li>');
    expect(html.match(/<img /g)).toHaveLength(2);
  });
});

describe("findRecapEvent", () => {
  it("matches a slug exactly", () => {
    expect(findRecapEvent("photo-night", EVENTS).slug?.current).toBe("photo-night");
  });

  it("--event 2026-10-22 picks that day's event (in New York time)", () => {
    expect(findRecapEvent("2026-10-22", EVENTS).slug?.current).toBe("october-workshop");
    // 23:00 EDT on Oct 26 is Oct 27 in UTC; it still belongs to Oct 26.
    expect(findRecapEvent("2026-10-26", EVENTS).slug?.current).toBe("tonight-lightning-talks");
  });

  it("two events that day is an error listing both", () => {
    const second: EventDoc = { _id: "event.x", title: "Evening social", slug: { _type: "slug", current: "evening-social" }, start: "2026-10-22T19:00:00-04:00" };
    expect(() => findRecapEvent("2026-10-22", [...EVENTS, second])).toThrow(
      /2 events match "2026-10-22":\n {2}2026-10-22  October workshop  \(october-workshop\)\n {2}2026-10-22  Evening social  \(evening-social\)/,
    );
  });

  it("matches title words case-insensitively, all words present", () => {
    expect(findRecapEvent("museum MEGA", EVENTS).slug?.current).toBe("mega-meetup-at-the-museum");
    expect(() => findRecapEvent("monthly social", EVENTS)).toThrow(/events match/);
  });

  it("no match is an error", () => {
    expect(() => findRecapEvent("2031-01-01", EVENTS)).toThrow(/No event matches "2031-01-01"/);
  });
});

describe("pushDraft", () => {
  const draft = buildRecapDraft(event("october-workshop"), parseNotes(NOTES), []);

  it("throws on _id 'post.x'", async () => {
    const client = fakeClient();
    await expect(pushDraft({ ...draft, _id: "post.x" }, client)).rejects.toThrow(/drafts\./);
    expect(client.create).not.toHaveBeenCalled();
    expect(client.replaceDraft).not.toHaveBeenCalled();
  });

  it("refuses to overwrite a published post", async () => {
    const client = fakeClient({ "recap-october-workshop": { _id: "recap-october-workshop" } });
    await expect(pushDraft(draft, client, { replace: true })).rejects.toThrow(/already published/);
    expect(client.replaceDraft).not.toHaveBeenCalled();
  });

  it("refuses an existing draft unless replace is set, and replaces only the checked revision", async () => {
    const client = fakeClient({ [draft._id]: { _id: draft._id, _rev: "rev-1" } });
    await expect(pushDraft(draft, client)).rejects.toThrow(/--replace/);
    await pushDraft(draft, client, { replace: true });
    expect(client.replaceDraft).toHaveBeenCalledWith(draft, "rev-1");
    expect(client.create).not.toHaveBeenCalled();
  });

  it("refuses when the event already has a published recap under another id", async () => {
    const client = fakeClient({}, EVENTS, [{ _id: "wp-77", slug: "october-workshop-recap" }]);
    await expect(pushDraft(draft, client)).rejects.toThrow(/already has a published recap: wp-77 \(\/blog\/october-workshop-recap\)/);
    expect(client.queries.at(-1)?.params).toEqual({ eventId: draft.event._ref });
    expect(client.create).not.toHaveBeenCalled();
  });

  it("the Sanity adapter replaces in one transaction guarded by ifRevisionID", async () => {
    const calls: unknown[][] = [];
    const tx = {
      patch: (...a: unknown[]) => (calls.push(["patch", ...a]), tx),
      createOrReplace: (...a: unknown[]) => (calls.push(["createOrReplace", ...a]), tx),
      commit: async () => (calls.push(["commit"]), {}),
    };
    const sanity = { transaction: () => tx } as unknown as SanityClient;
    await fromSanityClient(sanity).replaceDraft(draft, "rev-9");
    expect(calls).toEqual([
      ["patch", draft._id, { ifRevisionID: "rev-9", set: { kind: "recap" } }],
      ["createOrReplace", draft],
      ["commit"],
    ]);
  });

  it("creates a new draft", async () => {
    const client = fakeClient();
    await pushDraft(draft, client);
    expect(client.create).toHaveBeenCalledWith(draft);
  });
});

describe("resizePhoto", () => {
  it("shrinks photos wider than 2400px and leaves smaller ones alone", async () => {
    const wide = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#38B6FF" } }).jpeg().toBuffer();
    const out = await resizePhoto(wide, "wide.jpg");
    expect(await sharp(out.buf).metadata()).toMatchObject({ width: 2400, height: 1200, format: "jpeg" });
    expect(out.contentType).toBe("image/jpeg");
    const small = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#38B6FF" } }).png().toBuffer();
    expect(await sharp((await resizePhoto(small, "small.png")).buf).metadata()).toMatchObject({ width: 800, format: "png" });
  });
});

describe("npm run recap", () => {
  async function setup() {
    const dir = mkdtempSync(join(tmpdir(), "recap-"));
    const photos = join(dir, "photos");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(photos);
    const jpg = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#FFDE59" } }).jpeg().toBuffer();
    writeFileSync(join(photos, "b.jpg"), jpg);
    writeFileSync(join(photos, "a.jpg"), jpg);
    writeFileSync(join(photos, "notes.txt"), "not a photo");
    const notes = join(dir, "notes.md");
    writeFileSync(notes, NOTES);
    return { photos, notes };
  }

  it("--dry-run writes nothing and prints the draft", async () => {
    const { photos, notes } = await setup();
    const client = fakeClient();
    const out: string[] = [];
    const code = await run(["--event", "2026-10-22", "--photos", photos, "--notes", notes, "--dry-run"], {
      client,
      log: (s) => out.push(s),
      error: (s) => out.push(s),
    });
    expect(code).toBe(0);
    expect(client.uploadImage).not.toHaveBeenCalled();
    expect(client.create).not.toHaveBeenCalled();
    expect(client.replaceDraft).not.toHaveBeenCalled();
    const printed = JSON.parse(out.find((s) => s.startsWith("{"))!);
    expect(printed._id).toBe("drafts.recap-october-workshop");
    const gallery = printed.body.find((i: { className?: string }) => i.className === "cle-recap-gallery");
    expect(gallery.children.filter((c: { _type: string }) => c._type === "image")).toHaveLength(2);
  });

  it("uploads each photo in name order, saves the draft and prints the Studio link", async () => {
    const { photos, notes } = await setup();
    const client = fakeClient();
    const out: string[] = [];
    const code = await run(["--event", "october-workshop", "--photos", photos, "--notes", notes], {
      client,
      log: (s) => out.push(s),
      error: (s) => out.push(s),
      siteUrl: "http://localhost:3000",
    });
    expect(code).toBe(0);
    expect(client.uploads).toEqual(["a.jpg", "b.jpg"]);
    expect(client.create).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(client.create).mock.calls[0][0] as Doc;
    expect(saved._id).toBe("drafts.recap-october-workshop");
    expect(out.join("\n")).toContain("http://localhost:3000/studio/structure/post;recap-october-workshop");
  });

  it("fails clearly on a bad event without uploading", async () => {
    const { photos, notes } = await setup();
    const client = fakeClient();
    const errors: string[] = [];
    const code = await run(["--event", "monthly social", "--photos", photos, "--notes", notes], {
      client,
      log: () => {},
      error: (s) => errors.push(s),
    });
    expect(code).toBe(1);
    expect(errors.join("\n")).toMatch(/events match/);
    expect(client.uploadImage).not.toHaveBeenCalled();
  });

  it("refuses before uploading when the event already has a published recap", async () => {
    const { photos, notes } = await setup();
    const client = fakeClient({}, EVENTS, [{ _id: "wp-77", slug: "october-workshop-recap" }]);
    const errors: string[] = [];
    const code = await run(["--event", "october-workshop", "--photos", photos, "--notes", notes], {
      client,
      log: () => {},
      error: (s) => errors.push(s),
    });
    expect(code).toBe(1);
    expect(errors.join("\n")).toMatch(/already has a published recap/);
    expect(client.uploadImage).not.toHaveBeenCalled();
  });

  it("builds the Studio link from the site url", () => {
    expect(studioLink("drafts.recap-x", "https://cle-ai.com/")).toBe("https://cle-ai.com/studio/structure/post;recap-x");
  });
});
