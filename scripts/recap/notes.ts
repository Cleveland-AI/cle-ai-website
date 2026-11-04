// Recap notes (docs/recap-notes-format.md) -> a draft `post` of kind `recap`.
//
// Pure functions only: no files, no network. The draft has the shape Studio's "Event recap" starter
// gives an editor (src/sanity/templates.ts): write-up sections, a photo gallery section, then quotes.
// Nothing is invented: what the notes leave out stays as a [bracket] for the reviewer.
import { fmt, type EventDoc } from "../../src/lib/events/time";

export type NoteBlock = { kind: "paragraph" | "bullet"; text: string };
export type NoteSection = { heading?: string; blocks: NoteBlock[] };
export type NoteQuote = { text: string; citeName: string; citeTitle: string };
export type RecapNotes = { title?: string; excerpt?: string; sections: NoteSection[]; quotes: NoteQuote[] };

export const PLACEHOLDER = {
  excerpt: "[excerpt]",
  speaker: "[speaker]",
  title: "[title]",
  alt: "[describe this photo]",
  writeup: "[The write-up: who spoke, what they covered, what people asked.]",
} as const;

/** "— Name, Title" (em dash, en dash or "--"). */
const CITE = /^(?:—|–|--)\s*(.+)$/;

function frontMatter(md: string): { fields: Record<string, string>; rest: string } {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(md);
  if (!m) return { fields: {}, rest: md };
  const fields: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (value) fields[kv[1].toLowerCase()] = value;
  }
  return { fields, rest: md.slice(m[0].length) };
}

function splitCite(line: string): Pick<NoteQuote, "citeName" | "citeTitle"> {
  const comma = line.indexOf(",");
  const name = (comma < 0 ? line : line.slice(0, comma)).trim();
  const title = comma < 0 ? "" : line.slice(comma + 1).trim();
  return { citeName: name || PLACEHOLDER.speaker, citeTitle: title || PLACEHOLDER.title };
}

/**
 * Parses the recap notes format: front matter `title`/`excerpt`, `## ` sections, and quotes (`> ` lines,
 * then `— Name, Title`). Quotes are separated by a blank line or an empty `>` line.
 */
export function parseNotes(md: string): RecapNotes {
  const { fields, rest } = frontMatter(md);
  const lines = rest.split(/\r?\n/);
  const sections: NoteSection[] = [];
  const quotes: NoteQuote[] = [];
  let current: NoteSection | undefined;
  let para: string[] = [];

  const section = () => (current ??= (sections.push({ blocks: [] }), sections[sections.length - 1]));
  const flush = () => {
    if (para.length) section().blocks.push({ kind: "paragraph", text: para.join(" ") });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^##\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      flush();
      current = { heading: heading[1], blocks: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith(">")) {
      flush();
      // Consecutive `>` lines are one quote; an empty `>` line or a blank line ends it.
      const text: string[] = [];
      for (; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l.startsWith(">")) break;
        const t = l.replace(/^>\s?/, "").trim();
        if (t) text.push(t);
        else if (text.length) break;
      }
      // The `— Name, Title` line may follow after blank lines; anything else means no speaker.
      let j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      const cite = j < lines.length ? CITE.exec(lines[j].trim()) : null;
      i = cite ? j : i - 1;
      quotes.push({
        text: text.filter(Boolean).join(" "),
        ...(cite ? splitCite(cite[1]) : { citeName: PLACEHOLDER.speaker, citeTitle: PLACEHOLDER.title }),
      });
      continue;
    }
    const bullet = /^[-*+]\s+(.+)$/.exec(line);
    if (bullet) {
      flush();
      section().blocks.push({ kind: "bullet", text: bullet[1] });
      continue;
    }
    para.push(line);
  }
  flush();

  return {
    ...(fields.title ? { title: fields.title } : {}),
    ...(fields.excerpt ? { excerpt: fields.excerpt } : {}),
    sections: sections.filter((s) => s.heading || s.blocks.length),
    quotes: quotes.filter((q) => q.text),
  };
}

// ---- Portable Text ----

type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type LinkDef = { _type: "link"; _key: string; href: string; blank: boolean };
export type TextBlock = {
  _type: "block";
  _key: string;
  style: string;
  markDefs: LinkDef[];
  children: Span[];
  listItem?: "bullet";
  level?: number;
};

/** Sequential keys: unique within the draft, and the same draft for the same input. */
function keyMaker() {
  let n = 0;
  return () => `r${(n++).toString(36).padStart(4, "0")}`;
}

/** `**bold**`, `*em*` / `_em_` and `[text](url)` -> spans and link mark definitions. */
function inline(text: string, key: () => string): Pick<TextBlock, "children" | "markDefs"> {
  const children: Span[] = [];
  const markDefs: LinkDef[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])\*(?!\s)(.+?)\*(?![\w*])|(?<!\w)_(?!\s)(.+?)_(?!\w)/g;
  let last = 0;
  const push = (t: string, marks: string[] = []) => {
    if (t) children.push({ _type: "span", _key: key(), text: t, marks });
  };
  for (let m = re.exec(text); m; m = re.exec(text)) {
    push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], ["strong"]);
    else if (m[2] !== undefined) {
      const def: LinkDef = { _type: "link", _key: key(), href: m[3], blank: false };
      markDefs.push(def);
      push(m[2], [def._key]);
    } else push(m[4] ?? m[5], ["em"]);
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  if (!children.length) push(" ");
  return { children, markDefs };
}

const block = (text: string, key: () => string, style = "normal", listItem?: "bullet"): TextBlock => ({
  _type: "block",
  _key: key(),
  style,
  ...inline(text, key),
  ...(listItem ? { listItem, level: 1 } : {}),
});

// ---- The draft ----

export type RecapDraft = {
  _id: string;
  _type: "post";
  title: string;
  slug: { _type: "slug"; current: string };
  kind: "recap";
  event: { _type: "reference"; _ref: string };
  excerpt: string;
  publishedAt: string;
  body: Array<Record<string, unknown>>;
};

const publishedId = (id: string) => id.replace(/^drafts\./, "");

/** "recap-<event slug>", kept to Sanity's id characters (no dots: they'd read as an id path). */
export function recapSlug(e: Pick<EventDoc, "slug" | "_id">): string {
  const s = e.slug?.current || publishedId(e._id ?? "").replace(/^event\./, "");
  if (!s) throw new Error("The event has no slug or id.");
  return `recap-${s.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/** The draft's id: one recap draft per event, so a second run can't make a duplicate. */
export const recapDraftId = (e: Pick<EventDoc, "slug" | "_id">) => `drafts.${recapSlug(e)}`;

/** The draft recap post for `event`, with one gallery image per uploaded photo asset id. */
export function buildRecapDraft(event: EventDoc, notes: RecapNotes, photoAssetIds: string[], now: Date = new Date()): RecapDraft {
  if (!event._id) throw new Error("The event has no _id.");
  const key = keyMaker();
  const slug = recapSlug(event);

  const writeups = notes.sections.length ? notes.sections : [{ heading: "What happened", blocks: [{ kind: "paragraph" as const, text: PLACEHOLDER.writeup }] }];
  const body: Array<Record<string, unknown>> = writeups.map((s) => ({
    _type: "section",
    _key: key(),
    className: "cle-recap-writeup",
    children: [
      ...(s.heading ? [block(s.heading, key, "h2")] : []),
      ...s.blocks.map((b) => block(b.text, key, "normal", b.kind === "bullet" ? "bullet" : undefined)),
    ],
  }));
  body.push({
    _type: "section",
    _key: key(),
    className: "cle-recap-gallery",
    children: [
      block("Photos", key, "h2"),
      ...photoAssetIds.map((ref) => ({
        _type: "image",
        _key: key(),
        asset: { _type: "reference", _ref: ref },
        alt: PLACEHOLDER.alt,
      })),
    ],
  });
  for (const q of notes.quotes) body.push({ _type: "quote", _key: key(), text: q.text, citeName: q.citeName, citeTitle: q.citeTitle });

  return {
    _id: `drafts.${slug}`,
    _type: "post",
    title: notes.title ?? `Recap: ${event.title ?? PLACEHOLDER.title}`,
    slug: { _type: "slug", current: slug },
    kind: "recap",
    event: { _type: "reference", _ref: publishedId(event._id) },
    excerpt: notes.excerpt ?? PLACEHOLDER.excerpt,
    publishedAt: now.toISOString(),
    body,
  };
}

// ---- Picking the event ----

const etDay = (iso: string | null | undefined) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? fmt(d, "yyyy-MM-dd") : "????-??-??";
};

/**
 * The one event `query` names: an exact slug, a `YYYY-MM-DD` start day in America/New_York, or
 * title words (case-insensitive, all present). No match or several matches throw, listing the choices.
 */
export function findRecapEvent<T extends EventDoc>(query: string, events: T[]): T {
  const q = query.trim();
  if (!q) throw new Error("--event is empty.");
  let matches = events.filter((e) => e.slug?.current === q);
  if (!matches.length && /^\d{4}-\d{2}-\d{2}$/.test(q)) matches = events.filter((e) => etDay(e.start) === q);
  else if (!matches.length) {
    const words = q.toLowerCase().split(/\s+/);
    matches = events.filter((e) => {
      const title = (e.title ?? "").toLowerCase();
      return words.every((w) => title.includes(w));
    });
  }
  if (matches.length === 1) return matches[0];
  if (!matches.length) throw new Error(`No event matches "${q}". Use the event's slug, its date (YYYY-MM-DD) or words from its title.`);
  const list = [...matches]
    .sort((a, b) => (new Date(a.start ?? 0).getTime() || 0) - (new Date(b.start ?? 0).getTime() || 0))
    .map((e) => `  ${etDay(e.start)}  ${e.title ?? "(untitled)"}  (${e.slug?.current ?? e._id})`)
    .join("\n");
  throw new Error(`${matches.length} events match "${q}":\n${list}\nPass the slug of the one you mean.`);
}
