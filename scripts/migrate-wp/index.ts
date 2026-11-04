// npm run migrate -- --from <WP_BASE> --out <file.ndjson> [--media-dir <dir>] [--media-mode local|import]
//                    [--extra <file.ndjson>] [--redirects-out <file.json>] [--theme <dir>]
//
// Fixtures: `--media-mode local` (default) copies images to public/migrated and merges
// tests/fixtures/extra.ndjson. Production: `--media-mode import --media-dir <dir>` writes
// `_sanityAsset` references for `sanity dataset import` and merges no extras.
//
// WordPress (REST API, application password) + the theme repo -> a Sanity ndjson dataset, and the
// old-URL map in src/lib/redirects/generated.json.
//
// Live content, repo behaviour (spec, "My calls"): pages, posts, categories, authors, media and
// events come from the site; the homepage (a template), the privacy policy, the "after the merger"
// story and block defaults (team, bios, headshots) come from the repo.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PLACEHOLDER_PROJECT_ID } from "../../src/sanity/env";
import { blockMarkupToRichBody } from "./blocks";
import { createKeys, type ImageSource, type RichBody, type RichItem } from "./html";
import { type Asset, assetFor, assetFromFile, MediaLibrary, type MediaMode } from "./media";
import { blockDefaults, keyArrays, THEME_DIR } from "./theme-defaults";
import { eventFields, fetchWp, pathOf, type Redirect, redirectsFromWp, Wp, type WpData, type WpMedia, type WpPost, type WpUser } from "./wp";

export type Doc = { _id: string; _type: string; [field: string]: unknown };

const SITE_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** WordPress's install samples: not content, and their author (admin) isn't a person. */
const STOCK_CONTENT = { post: ["hello-world"], page: ["sample-page"] };

const slug = (current: string) => ({ _type: "slug", current });

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normName = (s: string) => s.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&");

/** A pattern file's block markup: the PHP header docblock removed. Refuses patterns with live PHP. */
export function patternMarkup(themeDir: string, name: string): string {
  const src = readFileSync(join(themeDir, "patterns", `${name}.php`), "utf8");
  const body = src.replace(/^<\?php[\s\S]*?\?>\s*/, "");
  if (body.includes("<?php")) throw new Error(`patterns/${name}.php runs PHP; render it through WordPress instead`);
  return body;
}

// ---- Privacy policy (ruling R11) ----
// Only brackets with a direct fact are filled: the host and the newsletter, plus a row per new
// service. Passages that would need rewording to be true (analytics, video, surveys) keep their
// original bracketed text, and the page is marked draft-awaiting-counsel. Each URL was checked to
// answer 200 (Nov 3, 2026); Vercel's and Poptin's are where their old addresses redirect.

const policyLink = (href: string) => `<a href="${href}">${href.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>`;

/** [find, replace] pairs applied to patterns/page-privacy.php; each must match exactly once. */
export const PRIVACY_FILLS: [string, string][] = [
  [
    "<td>Website hosting</td><td>[HOST]</td><td>[link]</td>",
    `<td>Website hosting</td><td>Vercel</td><td>${policyLink("https://vercel.com/legal/privacy-notice")}</td>`,
  ],
  [
    "<td>Newsletter</td><td>[NEWSLETTER TOOL]</td><td>[link]</td>",
    `<td>Newsletter</td><td>Substack</td><td>${policyLink("https://substack.com/privacy")}</td>`,
  ],
  [
    "<td>Analytics</td><td>[ANALYTICS TOOL]</td><td>[link]</td></tr>",
    "<td>Analytics</td><td>[ANALYTICS TOOL]</td><td>[link]</td></tr>" +
      `<tr><td>Form email</td><td>Resend</td><td>${policyLink("https://resend.com/legal/privacy-policy")}</td></tr>` +
      `<tr><td>Form spam check</td><td>Cloudflare Turnstile</td><td>${policyLink("https://www.cloudflare.com/turnstile-privacy-policy/")}</td></tr>` +
      `<tr><td>Form submissions</td><td>Sanity</td><td>${policyLink("https://www.sanity.io/legal/privacy")}</td></tr>` +
      `<tr><td>Popups</td><td>Poptin</td><td>${policyLink("https://www.poptin.com/privacy-policy/")}</td></tr>`,
  ],
];

/** The privacy policy waits for the board's and counsel's review (Global Constraints). */
export const PRIVACY_REVIEW_STATUS = "draft-awaiting-counsel";

export function fillPrivacy(markup: string): string {
  let out = markup;
  for (const [find, replace] of PRIVACY_FILLS) {
    const count = out.split(find).length - 1;
    if (count !== 1) throw new Error(`privacy policy: expected "${find}" once, found ${count}`);
    out = out.replace(find, () => replace);
  }
  return out;
}

// ---- "After the merger" (Global Constraints) ----

type Item = RichItem & Record<string, unknown>;
const textOf = (b: Item) => ((b.children as { text?: string }[]) ?? []).map((s) => s.text ?? "").join("");

/** About: the "Our story" section becomes the post-merger one (paragraph plus five beads). */
export function applyMergerStory(about: RichBody, story: RichBody): { body: RichBody; replaced: boolean } {
  const i = about.findIndex((s) => {
    const first = ((s as Item).children as Item[] | undefined)?.[0];
    return s._type === "section" && first?._type === "block" && first.style === "eyebrow" && textOf(first) === "Our story";
  });
  if (i < 0 || !story[0]) return { body: about, replaced: false };
  return { body: [...about.slice(0, i), story[0], ...about.slice(i + 1)], replaced: true };
}

/** Homepage: the "How it started" chapter's story paragraph becomes the post-merger paragraph. */
export function applyMergerChapter(home: RichBody, story: RichBody): { body: RichBody; replaced: boolean } {
  const storyPara = ((story[0] as Item | undefined)?.children as Item[] | undefined)?.find(
    (b) => b._type === "block" && b.style === "normal" && textOf(b).startsWith("In 2010"),
  );
  let replaced = false;
  const walk = (items: RichBody): RichBody =>
    items.map((item) => {
      const it = item as Item;
      if (!Array.isArray(it.children) || it._type === "block") return item;
      if (it._type === "cleWorldChapter" && it.title === "How it started" && storyPara) {
        const children = (it.children as Item[]).map((b) => {
          if (b._type === "block" && b.style === "normal" && textOf(b).startsWith("In 2010")) {
            replaced = true;
            return { ...storyPara, _key: b._key };
          }
          return b;
        });
        return { ...it, children };
      }
      return { ...it, children: walk(it.children as RichBody) };
    });
  const body = walk(home);
  return { body, replaced };
}

/**
 * Get involved and Sponsors: the two embedded forms with no URL ("Pitch a talk" and "Sponsor and partner
 * inquiry", which waited for a form address) become the site's own cle/form blocks (the component anchors them speak-form and sponsor-inquiry). Embeds that have a URL (newsletter, donations) are left alone.
 */
const INQUIRY_FORMS: Record<string, "pitch" | "sponsor"> = {
  "Pitch a talk": "pitch",
  "Sponsor and partner inquiry": "sponsor",
};

export function replaceInquiryEmbeds(body: RichBody): { body: RichBody; replaced: number } {
  let replaced = 0;
  const walk = (items: RichBody): RichBody =>
    items.map((item) => {
      const it = item as Item;
      if (it._type === "cleEmbedForm" && !String(it.url ?? "").trim()) {
        const target = INQUIRY_FORMS[String(it.title ?? "")];
        if (target) {
          replaced++;
          return { _type: "cleForm", _key: it._key, form: target } as unknown as RichBody[number];
        }
      }
      if (!Array.isArray(it.children) || it._type === "block") return item;
      return { ...it, children: walk(it.children as RichBody) };
    });
  return { body: walk(body), replaced };
}

// ---- Team ----

type Member = { name?: string; photo?: string; role?: string; lead?: boolean; bio?: string; linkedin?: string; site?: string; hidden?: boolean };

/**
 * cle/team blocks with no saved members use block.json's list, and those people become `person`
 * documents. Such blocks are left with `members: []`, so the Team component reads the people
 * (ordered, hidden excluded) and editors change the team in one place.
 */
export function emptyDefaultTeams(docs: Doc[], defaultMembers: unknown): number {
  let n = 0;
  const same = (a: unknown) => JSON.stringify(a) === JSON.stringify(defaultMembers);
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o._type === "cleTeam" && same(o.members)) {
        o.members = [];
        n++;
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(docs);
  return n;
}

// ---- URL rewriting ----

export type UrlRewriter = (url: string) => string;

/** Fields whose whole value is a URL. Span `text`, labels and titles are never rewritten. */
const URL_KEY = /^(href|src|url|link)$|(Url|Link)$/;
/** Fields holding HTML, where only href/src attribute values are rewritten. */
const HTML_KEY = /^(html|cells|head)$/;

/** A string that is a single URL (no whitespace) and parses as one. */
const isBareUrl = (s: string) => {
  if (!s || /\s/.test(s)) return false;
  try {
    new URL(s, "https://base.invalid");
    return true;
  } catch {
    return false;
  }
};

/**
 * Rewrites old-site URLs: bare URL values of URL fields (href, url, *Url, *Link), and href/src
 * attributes inside HTML fields (rawHtml.html, table cells). Ids and asset references are left alone.
 */
export function rewriteUrls<T>(value: T, rewrite: UrlRewriter, isOld: (url: string) => boolean): T {
  const inHtml = (s: string) =>
    s.replace(/\b(href|src)=("|')([^"']*)\2/g, (m, attr: string, q: string, url: string) =>
      isOld(url) && isBareUrl(url) ? `${attr}=${q}${rewrite(url.replace(/&#038;|&amp;/g, "&")).replace(/&/g, "&amp;")}${q}` : m,
    );
  const walk = (v: unknown, key = ""): unknown => {
    if (typeof v === "string") {
      if (URL_KEY.test(key) && isBareUrl(v) && isOld(v)) return rewrite(v);
      if (HTML_KEY.test(key)) return inHtml(v);
      return v;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}

// ---- Classic content ----

/** WordPress's wpautop, reduced to what classic posts need: blank lines make paragraphs, single newlines <br>. */
export function autop(text: string): string {
  const BLOCK = /^<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|figure|hr|img|iframe|section|dl)\b/i;
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (BLOCK.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g, "<br />\n")}</p>`))
    .join("\n");
}

/**
 * The markup to convert for a post or page: block markup as saved; for a classic post (no block
 * delimiters) WordPress's rendered HTML, whose paragraphs wpautop has made, or autop of the raw text.
 */
export function contentMarkup(content: { raw?: string; rendered?: string }): string {
  const raw = content.raw ?? "";
  if (raw.includes("<!-- wp:")) return raw;
  if (content.rendered?.trim()) return content.rendered;
  return autop(raw);
}

// ---- The run ----

export type MigrateOptions = {
  from: string;
  mediaDir: string;
  mediaMode: MediaMode;
  themeDir: string;
  extra?: string;
  allowNoEvents?: boolean;
  auth?: { user: string; password: string };
  projectId: string;
  dataset: string;
  log: (s: string) => void;
};

export async function migrate(opts: MigrateOptions): Promise<{ docs: Doc[]; redirects: Redirect[] }> {
  const { log, themeDir } = opts;
  const wp = new Wp(opts.from, opts.auth, log);
  const data = await fetchWp(wp, log, { allowNoEvents: opts.allowNoEvents });
  const lib = new MediaLibrary({ mode: opts.mediaMode, dir: opts.mediaDir, projectId: opts.projectId, dataset: opts.dataset });
  const origin = new URL(data.home);
  const host = origin.host.replace(/^www\./, "");
  const oldOrigin = new RegExp(`^(https?:)?//(www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|$|\\?|#)`, "i");
  const isOld = (url: string) => oldOrigin.test(url) || /^\/(index\.php|wp-content)(\/|$)/.test(url);

  // Stock install content is skipped.
  const stock = new Set([
    ...data.posts.filter((p) => STOCK_CONTENT.post.includes(p.slug)).map((p) => p.id),
    ...data.pages.filter((p) => STOCK_CONTENT.page.includes(p.slug)).map((p) => p.id),
  ]);
  if (stock.size) log(`Skipping WordPress's sample content: ${[...stock].join(", ")}`);
  const posts = data.posts.filter((p) => !stock.has(p.id));
  const pages = data.pages.filter((p) => !stock.has(p.id) && p.id !== data.frontPageId);

  // ---- Media: every upload is hashed (the redirect map needs each one's CDN URL); only those
  // the content uses are written out.
  const uploads = new Map<number, Asset>();
  const byUrl = new Map<string, Asset>();
  const mediaByUrl = new Map<string, WpMedia>();
  for (const m of data.media) {
    if (m.media_type !== "image") continue;
    const asset = assetFor(await wp.download(m.source_url), m.media_details?.file?.split("/").pop() ?? m.slug);
    if (!asset) {
      log(`  media ${m.id}: not an image we can read (${m.mime_type}); left out`);
      continue;
    }
    uploads.set(m.id, asset);
    for (const u of [m.source_url, ...Object.values(m.media_details?.sizes ?? {}).map((s) => s.source_url)]) {
      byUrl.set(pathOf(u), asset);
      mediaByUrl.set(pathOf(u), m);
    }
  }
  const themeAssetPath = (path: string) => {
    const m = /^\/wp-content\/themes\/[^/]+\/(assets\/.+)$/.exec(path);
    return m ? join(themeDir, m[1]) : undefined;
  };
  const assetForUrl = (url: string): Asset | undefined => {
    if (!isOld(url)) return undefined;
    const path = pathOf(url.startsWith("//") ? `https:${url}` : url).split("?")[0];
    const theme = themeAssetPath(path);
    return theme ? assetFromFile(theme) : byUrl.get(path);
  };
  const resolveImage = (src: string): ImageSource | undefined => {
    const asset = assetForUrl(src);
    return asset ? lib.image(asset) : undefined;
  };
  const featured = (p: WpPost) => {
    const asset = p.featured_media ? uploads.get(p.featured_media) : undefined;
    if (p.featured_media && !asset) log(`  ${p.slug}: featured image ${p.featured_media} not found`);
    return asset ? lib.image(asset) : undefined;
  };
  const convert = (markup: string, prefix: string, drop?: string[]) =>
    blockMarkupToRichBody(markup, { resolveImage, keys: createKeys(prefix), themeDir, drop });

  const docs: Doc[] = [];

  // ---- People: the team (block.json defaults, headshots from the repo), then post authors.
  const teamDefaults = (blockDefaults("cle/team", themeDir).members ?? []) as Member[];
  const people: Doc[] = teamDefaults.map((m, i) => {
    const photo = m.photo ? assetFromFile(join(themeDir, "assets/team", `${m.photo}.webp`)) : undefined;
    return compact({
      _id: `person.${slugify(m.name ?? `member-${i}`)}`,
      _type: "person",
      name: m.name,
      slug: slug(slugify(m.name ?? `member-${i}`)),
      role: m.role,
      lead: !!m.lead,
      bio: m.bio,
      linkedin: m.linkedin,
      site: m.site,
      photo: photo ? lib.image(photo) : undefined,
      hidden: !!m.hidden,
      order: i,
    });
  });
  const authorIds = new Set(posts.map((p) => p.author).filter(Boolean));
  const personByUser = new Map<number, Doc>();
  for (const u of data.users) {
    if (!authorIds.has(u.id)) continue;
    let person = people.find((p) => normName(String(p.name)) === normName(u.name));
    if (!person) {
      // An author who isn't on the team: a person for the byline, hidden from the team list.
      person = { _id: `person.${u.slug}`, _type: "person", name: u.name, slug: slug(u.slug), lead: false, hidden: true };
      people.push(person);
    }
    personByUser.set(u.id, person);
  }
  docs.push(...people);
  const authorSlug = (u: WpUser) => (personByUser.get(u.id)?.slug as { current: string } | undefined)?.current;

  // ---- Categories
  const catById = new Map<number, Doc>();
  for (const c of data.categories) {
    const doc = compact({ _id: `category.${c.slug}`, _type: "category", title: decode(c.name), slug: slug(c.slug), description: c.description });
    catById.set(c.id, doc);
    docs.push(doc);
  }

  // ---- Pages
  const story = convert(patternMarkup(themeDir, "story-after-merger"), "m");
  for (const p of pages) {
    if (p.slug === "privacy") continue; // from the repo, below
    let body = convert(contentMarkup(p.content), "k");
    if (p.slug === "about") {
      const r = applyMergerStory(body, story);
      if (!r.replaced) log('  about: no "Our story" section to replace with the post-merger story');
      body = r.body;
    }
    if (p.slug === "get-involved" || p.slug === "sponsors") {
      const r = replaceInquiryEmbeds(body);
      if (!r.replaced) log(`  ${p.slug}: no URL-less inquiry form embed to replace with cleForm`);
      body = r.body;
    }
    docs.push(
      compact({
        _id: `page.${p.slug}`,
        _type: "page",
        title: decode(p.title.raw ?? p.title.rendered),
        slug: slug(p.slug),
        template: p.template === "page-landing" ? "landing" : "default",
        featuredImage: featured(p),
        body,
      }),
    );
  }
  // The privacy policy comes from the repo (with WordPress's title and template when it has the
  // page) and is marked as awaiting counsel. A production import writes it as an unpublished draft.
  const wpPrivacy = pages.find((p) => p.slug === "privacy");
  docs.push({
    _id: opts.mediaMode === "import" ? "drafts.page.privacy" : "page.privacy",
    _type: "page",
    title: wpPrivacy ? decode(wpPrivacy.title.raw ?? wpPrivacy.title.rendered) : "Privacy policy",
    slug: slug("privacy"),
    template: !wpPrivacy || wpPrivacy.template === "page-landing" ? "landing" : "default",
    reviewStatus: PRIVACY_REVIEW_STATUS,
    body: convert(fillPrivacy(patternMarkup(themeDir, "page-privacy")), "k"),
  });

  // ---- Posts
  const KIND_BY_CATEGORY: Record<string, string> = { newsletter: "newsletter", meetup: "recap" };
  for (const p of posts) {
    const cats = (p.categories ?? []).map((id) => catById.get(id)).filter(Boolean) as Doc[];
    const kind = cats.map((c) => KIND_BY_CATEGORY[(c.slug as { current: string }).current]).find(Boolean) ?? "article";
    const author = p.author ? personByUser.get(p.author) : undefined;
    docs.push(
      compact({
        _id: `post.${p.slug}`,
        _type: "post",
        title: decode(p.title.raw ?? p.title.rendered),
        slug: slug(p.slug),
        kind,
        author: author ? { _type: "reference", _ref: author._id } : undefined,
        categories: cats.length ? cats.map((c) => ({ _type: "reference", _ref: c._id, _key: c._id.replace(/^category\./, "") })) : undefined,
        publishedAt: `${p.date_gmt}Z`,
        featuredImage: featured(p),
        excerpt: (p.excerpt.raw ?? "").trim() || undefined,
        body: convert(contentMarkup(p.content), "k"),
      }),
    );
  }

  // ---- Events
  for (const e of data.events) {
    const f = eventFields(e, data.eventLd[e.id], data.home);
    if (!f.start) {
      log(`  event ${e.slug}: no start time found; left out`);
      continue;
    }
    docs.push(
      compact({
        _id: f.meetupId ? `event.${f.meetupId}` : `event.wp-${e.id}`,
        _type: "event",
        meetupId: f.meetupId,
        title: decode(e.title.raw ?? e.title.rendered),
        slug: slug(e.slug),
        start: f.start,
        end: f.end,
        venue: f.venue,
        rsvpUrl: f.rsvpUrl,
        image: featured(e),
        excerpt: (e.excerpt.raw ?? "").trim() || undefined,
        descriptionHtml: e.content.rendered.trim() || undefined,
        organizer: f.organizer,
        organizerUrl: f.organizerUrl,
        meetupStatus: "active",
      }),
    );
  }

  // ---- Homepage: the front-page template (the repo wins), header and footer left to the layout.
  const front = readFileSync(join(themeDir, "templates/front-page.html"), "utf8");
  const chapter = applyMergerChapter(convert(front, "h", ["core/template-part"]), story);
  if (!chapter.replaced) log('  homepage: no "How it started" paragraph to replace');
  docs.push({ _id: "homepage", _type: "homepage", body: chapter.body });

  // ---- Site settings: menus from WordPress, footer and announcement bar from the theme's parts.
  docs.push(siteSettings(data, themeDir));

  // ---- Redirects, then every old URL in the content rewritten to its new home.
  const redirects = redirectsFromWp({
    wp: data,
    authorSlug,
    mediaUrl: (m) => (uploads.get(m.id) ? lib.cdnUrl(uploads.get(m.id)!) : undefined),
    skip: stock,
  });
  const STATIC: Record<string, string> = { "/?post_type=meetup_events": "/events", "/index.php/meetup-event/": "/events", "/": "/" };
  const redirectMap = new Map(redirects.map((r) => [r.from.toLowerCase(), r.to]));
  const rewrite: UrlRewriter = (url) => {
    const abs = url.startsWith("/") && !url.startsWith("//") ? `${origin.origin}${url}` : url.startsWith("//") ? `https:${url}` : url;
    const u = new URL(abs);
    const hash = u.hash;
    const path = u.pathname;
    if (/^\/wp-content\/themes\/[^/]+\/assets\//.test(path)) return path.replace(/^\/wp-content\/themes\/[^/]+/, "") + hash;
    if (path.startsWith("/wp-content/uploads/")) {
      const asset = byUrl.get(path);
      if (asset) return lib.url(lib.use(asset)) + hash;
      log(`  unknown upload ${url}; left as is`);
      return url;
    }
    const key = `${path}${u.search}`;
    const variants = [key, key.endsWith("/") || u.search ? key : `${key}/`].map((k) => k.toLowerCase());
    for (const k of variants) {
      const to = redirectMap.get(k) ?? STATIC[k];
      if (to) return to + hash;
    }
    const fallback = path.replace(/^\/index\.php/, "").replace(/(.)\/$/, "$1") || "/";
    log(`  no redirect for ${url}; using ${fallback}`);
    return fallback + u.search + hash;
  };
  let out = rewriteUrls(docs, rewrite, isOld);

  // ---- Team blocks with the default members read the person documents instead.
  const keyedDefaults = keyArrays({ members: teamDefaults }, [
    { name: "members", type: "array", of: [{ name: "teamMember", type: "object" }] },
  ]).members;
  const emptied = emptyDefaultTeams(out, keyedDefaults);
  log(`Team blocks reading the ${people.filter((p) => !p.hidden).length} team people: ${emptied}`);

  // ---- Assets. An import carries every media-library image (R13), so each old upload URL in the
  // redirect map resolves to a real file; fixtures keep only the images the content uses.
  out.push(...(lib.assetDocuments() as Doc[]));
  if (opts.mediaMode === "import") {
    const images = data.media
      .filter((m) => uploads.has(m.id))
      .map((m) => ({ ...lib.image(uploads.get(m.id)!), _key: `media-${m.id}`, originalUrl: m.source_url }));
    out.push({ _id: "mediaLibrary", _type: "mediaLibrary", images });
    log(`Media library: ${images.length} images for upload`);
  }

  // ---- Hand-written extras, and a stable order.
  if (opts.extra && existsSync(opts.extra)) {
    const extra = readFileSync(opts.extra, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as Doc);
    const ids = new Set(extra.map((d) => d._id));
    out = [...out.filter((d) => !ids.has(d._id)), ...extra];
    log(`Merged ${extra.length} documents from ${opts.extra}`);
  }
  const ORDER = ["siteSettings", "homepage", "page", "post", "event", "category", "person", "sanity.imageAsset"];
  const rank = (t: string) => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length);
  out.sort((a, b) => rank(a._type) - rank(b._type) || a._id.localeCompare(b._id));
  return { docs: out, redirects };
}

function siteSettings(data: WpData, themeDir: string): Doc {
  const links = (loc: string) =>
    (data.menus[loc] ?? []).map((item, i) => ({ _type: "link", _key: `${loc}-${i}`, label: decode(item.title.raw ?? item.title.rendered), href: item.url }));
  const legal = patternFileRaw(themeDir, "footer-legal");
  const footerLegalLinks = [...legal.matchAll(/<a href="<\?php echo esc_url\( \$cle_page_url\( '([a-z-]+)' \) \); \?>">([^<]+)<\/a>/g)].map(
    ([, s, label], i) => ({ _type: "link", _key: `legal-${i}`, label, href: `/${s}` }),
  );
  const footer = readFileSync(join(themeDir, "parts/footer.html"), "utf8");
  const ein = /<p[^>]*>([^<]*EIN[^<]*)<\/p>/.exec(footer)?.[1];
  const bar = readFileSync(join(themeDir, "parts/announcement-bar.html"), "utf8");
  const barAttrs = JSON.parse(/<!-- wp:cle\/next-event (\{[\s\S]*?\}) \/-->/.exec(bar)?.[1] ?? "{}") as Record<string, string>;
  const nextDefaults = blockDefaults("cle/next-event", themeDir) as Record<string, string>;
  return {
    _id: "siteSettings",
    _type: "siteSettings",
    primaryMenu: links("primary"),
    socialMenu: links("social"),
    footerLegalLinks,
    einLine: ein ? decode(ein) : undefined,
    announcement: {
      label: barAttrs.eyebrow ?? nextDefaults.eyebrow,
      rsvpLabel: barAttrs.rsvpLabel ?? nextDefaults.rsvpLabel,
      emptyMessage: barAttrs.emptyText ?? nextDefaults.emptyText,
    },
    substackEmbedUrl: "https://timcleaidata.substack.com/embed",
    givebutterEmbedUrl: "https://givebutter.com/embed/c/cle-ai",
    poptinId: "52c969b3a6878",
  };
}

const patternFileRaw = (themeDir: string, name: string) => readFileSync(join(themeDir, "patterns", `${name}.php`), "utf8");

function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")) as T;
}

// ---- CLI ----

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: string[]) {
  const envFile = join(SITE_DIR, ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const from = arg(argv, "from") ?? process.env.WP_BASE;
  const outPath = arg(argv, "out");
  if (!from || !outPath) {
    console.error("usage: npm run migrate -- --from <WP_BASE> --out <file.ndjson> [--media-dir <dir>] [--media-mode local|import]");
    process.exit(2);
  }
  const user = process.env.WP_APP_USER;
  const password = process.env.WP_APP_PASSWORD;
  if (!user || !password) {
    console.error("Set WP_APP_USER and WP_APP_PASSWORD (a WordPress application password) in .env.local: the raw block markup needs context=edit.");
    process.exit(2);
  }
  const mediaMode = (arg(argv, "media-mode") ?? "local") as MediaMode;
  if (mediaMode !== "local" && mediaMode !== "import") {
    console.error("--media-mode is local (fixtures) or import (sanity dataset import)");
    process.exit(2);
  }
  if (mediaMode === "import" && !arg(argv, "media-dir")) {
    console.error("--media-mode import needs --media-dir <dir>: the folder the importer uploads images from");
    process.exit(2);
  }
  const redirectsOut = arg(argv, "redirects-out") ?? join(SITE_DIR, "src/lib/redirects/generated.json");
  const { docs, redirects } = await migrate({
    from,
    mediaDir: arg(argv, "media-dir") ?? join(SITE_DIR, "public/migrated"),
    mediaMode,
    themeDir: arg(argv, "theme") ?? THEME_DIR,
    // The hand-written test edge cases belong in the fixtures only, never in a production import.
    extra: arg(argv, "extra") ?? (mediaMode === "local" ? join(SITE_DIR, "tests/fixtures/extra.ndjson") : undefined),
    allowNoEvents: argv.includes("--allow-no-events"),
    auth: { user, password },
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || PLACEHOLDER_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production",
    log: (s) => console.error(s),
  });
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
  mkdirSync(dirname(redirectsOut), { recursive: true });
  writeFileSync(redirectsOut, JSON.stringify(redirects, null, 2) + "\n");
  const counts = docs.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d._type]: (acc[d._type] ?? 0) + 1 }), {});
  console.error(`Wrote ${docs.length} documents to ${outPath}: ${JSON.stringify(counts)}`);
  console.error(`Wrote ${redirects.length} redirects to ${redirectsOut}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
