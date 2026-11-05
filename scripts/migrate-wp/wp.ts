// Reading WordPress: the REST API (with an application password, for `context=edit` raw block
// markup) plus each event page's JSON-LD, which carries the event meta the REST API doesn't expose.
// Also the pure WordPress -> document mappings that need no network: events, redirects.

export type Rendered = { rendered: string; raw?: string };
export type WpPost = {
  id: number;
  slug: string;
  status: string;
  link: string;
  date: string;
  date_gmt: string;
  title: Rendered;
  content: Rendered;
  excerpt: Rendered;
  author?: number;
  categories?: number[];
  featured_media?: number;
  template?: string;
  meta?: Record<string, unknown> | unknown[];
};
export type WpTerm = { id: number; slug: string; name: string; description: string; link: string };
export type WpUser = { id: number; slug: string; name: string; link: string };
export type WpMedia = {
  id: number;
  slug: string;
  link: string;
  source_url: string;
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details?: { width?: number; height?: number; file?: string; sizes?: Record<string, { source_url: string }> };
};
export type WpMenuItem = { id: number; title: Rendered; url: string; menu_order: number; parent: number; menus: number };

/** schema.org Event as the theme prints it on single event pages (functions.php). */
export type EventLd = {
  startDate?: string;
  endDate?: string;
  url?: string;
  location?: {
    name?: string;
    url?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
    geo?: { latitude?: number; longitude?: number };
  };
  organizer?: { name?: string; url?: string };
};

export type WpData = {
  base: string;
  home: string;
  siteTitle: string;
  frontPageId?: number;
  pages: WpPost[];
  posts: WpPost[];
  events: WpPost[];
  categories: WpTerm[];
  users: WpUser[];
  media: WpMedia[];
  menus: Record<string, WpMenuItem[]>;
  eventLd: Record<number, EventLd | undefined>;
};

// ---- Fetching ----

export class Wp {
  constructor(
    readonly base: string,
    private auth?: { user: string; password: string },
    private log: (s: string) => void = (s) => console.error(s),
  ) {}

  private url(route: string, params: Record<string, string | number> = {}) {
    const qs = Object.entries(params)
      .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("");
    return `${this.base.replace(/\/$/, "")}/?rest_route=${encodeURIComponent(route).replace(/%2F/g, "/")}${qs}`;
  }

  private headers(): Record<string, string> {
    if (!this.auth) return {};
    return { Authorization: `Basic ${Buffer.from(`${this.auth.user}:${this.auth.password}`).toString("base64")}` };
  }

  async get<T>(route: string, params: Record<string, string | number> = {}): Promise<{ data: T; totalPages: number }> {
    const res = await fetch(this.url(route, params), { headers: this.headers() });
    if (!res.ok) throw new Error(`GET ${route}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return { data: (await res.json()) as T, totalPages: Number(res.headers.get("x-wp-totalpages") ?? 1) };
  }

  /** Every item of a collection, all pages. */
  async all<T>(route: string, params: Record<string, string | number> = {}): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; ; page++) {
      const { data, totalPages } = await this.get<T[]>(route, { per_page: 100, page, ...params });
      out.push(...data);
      if (page >= totalPages) return out;
    }
  }

  /** For optional endpoints (settings, menus need more rights): undefined on failure, with the error logged. */
  async maybe<T>(route: string, params: Record<string, string | number> = {}): Promise<T | undefined> {
    try {
      return (await this.get<T>(route, params)).data;
    } catch (err) {
      this.log(`  optional ${route} unavailable, carrying on without it: ${(err as Error).message}`);
      return undefined;
    }
  }

  async download(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  /** The JSON-LD Event the theme prints on a single event page. */
  async eventLd(link: string): Promise<EventLd | undefined> {
    const res = await fetch(link);
    if (!res.ok) return undefined;
    return parseEventLd(await res.text());
  }
}

export function parseEventLd(html: string): EventLd | undefined {
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]) as EventLd & { "@type"?: string };
      if (data["@type"] === "Event") return data;
    } catch {
      // not JSON
    }
  }
  return undefined;
}

export type FetchOptions = {
  /** Allow a site without the meetup_events post type (otherwise that is an error: events are expected). */
  allowNoEvents?: boolean;
};

export async function fetchWp(wp: Wp, log: (s: string) => void = () => {}, opts: FetchOptions = {}): Promise<WpData> {
  const edit = { context: "edit" };
  const settings = await wp.maybe<{ url?: string; title?: string; page_on_front?: number }>("/wp/v2/settings");
  const pages = await wp.all<WpPost>("/wp/v2/pages", { ...edit, status: "publish" });
  const posts = await wp.all<WpPost>("/wp/v2/posts", { ...edit, status: "publish" });
  // Events are expected: a failed request, or a site without the post type, stops the run.
  const types = (await wp.get<Record<string, unknown>>("/wp/v2/types")).data;
  if (!("meetup_events" in types) && !opts.allowNoEvents)
    throw new Error("WordPress has no meetup_events post type; pass --allow-no-events to migrate without events");
  const events = "meetup_events" in types ? await wp.all<WpPost>("/wp/v2/meetup_events", { ...edit, status: "publish" }) : [];
  const categories = await wp.all<WpTerm>("/wp/v2/categories", { hide_empty: 0 });
  const users = await wp.all<WpUser>("/wp/v2/users", edit).catch(() => wp.all<WpUser>("/wp/v2/users"));
  const media = await wp.all<WpMedia>("/wp/v2/media", edit);
  const locations = (await wp.maybe<Record<string, { menu: number }>>("/wp/v2/menu-locations")) ?? {};
  const items = await wp.all<WpMenuItem>("/wp/v2/menu-items", edit).catch((err: Error) => {
    log(`  menu items unavailable, menus left empty: ${err.message}`);
    return [] as WpMenuItem[];
  });
  const menus: Record<string, WpMenuItem[]> = {};
  for (const [loc, { menu }] of Object.entries(locations))
    menus[loc] = items.filter((i) => i.menus === menu && i.parent === 0).sort((a, b) => a.menu_order - b.menu_order || a.id - b.id);
  const home = (settings?.url ?? wp.base).replace(/\/$/, "");
  const frontPageId = settings?.page_on_front || pages.find((p) => p.link.replace(/\/$/, "") === home)?.id;
  const eventLd: WpData["eventLd"] = {};
  for (const e of events) eventLd[e.id] = await wp.eventLd(e.link);
  log(
    `WordPress: ${pages.length} pages, ${posts.length} posts, ${events.length} events, ${categories.length} categories, ${users.length} users, ${media.length} media`,
  );
  return { base: wp.base, home, siteTitle: settings?.title ?? "", frontPageId, pages, posts, events, categories, users, media, menus, eventLd };
}

// ---- Time ----

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes east of UTC in a time zone at an instant. */
function offsetMinutes(at: Date, tz: string): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** A wall-clock time in a zone as ISO 8601 with the offset in effect that day (DST-correct). */
export function zonedIso(date: string, hour: number, minute: number, tz = "America/New_York"): string {
  const [y, mo, d] = date.split("-").map(Number);
  const wall = Date.UTC(y, mo - 1, d, hour, minute);
  let utc = wall;
  for (let i = 0; i < 3; i++) utc = wall - offsetMinutes(new Date(utc), tz) * 60_000;
  const off = offsetMinutes(new Date(utc), tz);
  const sign = off < 0 ? "-" : "+";
  return `${date}T${pad(hour)}:${pad(minute)}:00${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

/** cle_event_datetime(): the four 12-hour meta fields -> ISO with offset; undefined without a date. */
export function eventTimeFromMeta(meta: Record<string, unknown>, which: "start" | "end"): string | undefined {
  const date = String(meta[`event_${which}_date`] ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const hour12 = Number(String(meta[`event_${which}_hour`] ?? "").trim() || "12");
  const minute = Number(String(meta[`event_${which}_minute`] ?? "").trim() || "00");
  const pm = (String(meta[`event_${which}_meridian`] ?? "").trim() || "pm").toLowerCase() === "pm";
  return zonedIso(date, (hour12 % 12) + (pm ? 12 : 0), minute);
}

// ---- Events ----

export type EventFields = {
  start?: string;
  end?: string;
  venue?: Record<string, string | number>;
  rsvpUrl?: string;
  organizer?: string;
  organizerUrl?: string;
  meetupId?: string;
};

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());
const num = (v: unknown) => (str(v) !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);

function venueOf(v: { name?: string; address?: string; city?: string; state?: string; zip?: string; lat?: number; lng?: number }) {
  const venue = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== "")) as Record<string, string | number>;
  return Object.keys(venue).length ? venue : undefined;
}

const meetupIdOf = (url: string) => /meetup\.com\/[^/]+\/events\/([0-9a-z]+)/i.exec(url)?.[1];

/** Event fields from registered REST meta (the cle_event_* field names), when a site exposes them. */
export function eventFieldsFromMeta(meta: Record<string, unknown>): EventFields {
  const end = eventTimeFromMeta(meta, "end");
  const start = eventTimeFromMeta(meta, "start");
  const rsvp = str(meta.ime_event_link).replace(/^http:/, "https:");
  return {
    start,
    end: end && start && Date.parse(end) >= Date.parse(start) ? end : undefined,
    venue: venueOf({
      name: str(meta.venue_name),
      address: str(meta.venue_address),
      city: str(meta.venue_city),
      state: str(meta.venue_state),
      zip: str(meta.venue_zipcode),
      lat: num(meta.venue_lat),
      lng: num(meta.venue_lon),
    }),
    rsvpUrl: rsvp || undefined,
    organizer: str(meta.organizer_name) || undefined,
    // The theme links the organizer only when it has a name (blocks/event-meta/render.php).
    organizerUrl: (str(meta.organizer_name) && str(meta.organizer_url)) || undefined,
    meetupId: meetupIdOf(rsvp),
  };
}

/**
 * Event fields from the page's JSON-LD. The theme fills `url` with the event's own permalink when
 * there is no RSVP link, and the organizer with the site itself when organizer_name is empty.
 */
export function eventFieldsFromLd(ld: EventLd, permalink: string, home: string): EventFields {
  const url = str(ld.url);
  const rsvp = url && url.replace(/\/$/, "") !== permalink.replace(/\/$/, "") ? url : "";
  const org = ld.organizer;
  const isSite = !!org && str(org.url).replace(/\/$/, "") === home.replace(/\/$/, "");
  const a = ld.location?.address ?? {};
  const start = str(ld.startDate) || undefined;
  const end = str(ld.endDate) || undefined;
  return {
    start,
    // An end before the start is a data error (cle_event_when ignores it too): drop it.
    end: end && start && Date.parse(end) >= Date.parse(start) ? end : undefined,
    venue: venueOf({
      name: str(ld.location?.name),
      address: str(a.streetAddress),
      city: str(a.addressLocality),
      state: str(a.addressRegion),
      zip: str(a.postalCode),
      lat: num(ld.location?.geo?.latitude),
      lng: num(ld.location?.geo?.longitude),
    }),
    rsvpUrl: rsvp || undefined,
    organizer: !isSite ? str(org?.name) || undefined : undefined,
    organizerUrl: !isSite && str(org?.name) ? str(org?.url) || undefined : undefined,
    meetupId: meetupIdOf(rsvp),
  };
}

const hasEventMeta = (meta: WpPost["meta"]): meta is Record<string, unknown> =>
  !!meta && !Array.isArray(meta) && "event_start_date" in meta;

/** Event fields from whichever source the site offers: REST meta first, then the page's JSON-LD. */
export function eventFields(post: WpPost, ld: EventLd | undefined, home: string): EventFields {
  if (hasEventMeta(post.meta)) return eventFieldsFromMeta(post.meta);
  return ld ? eventFieldsFromLd(ld, post.link, home) : {};
}

// ---- URLs ----

/** The path (and query) of a WordPress URL, e.g. `/index.php/about/`. */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

export type Redirect = { from: string; to: string };

export type RedirectInputs = {
  wp: Pick<WpData, "pages" | "posts" | "events" | "categories" | "users" | "media" | "frontPageId">;
  /** WordPress user slug -> person slug. */
  authorSlug: (user: WpUser) => string | undefined;
  /** Upload URL -> its new URL (Sanity's CDN). */
  mediaUrl: (media: WpMedia) => string | undefined;
  /** Posts and pages that are deliberately not migrated. */
  skip?: Set<number>;
};

/**
 * Every content URL WordPress served, mapped to its new URL: pages, posts, events, categories,
 * authors, `?p=`/`?page_id=` links, attachment pages and upload files (each size). Paths are as
 * WordPress links them (with /index.php/ and a trailing slash); Task 16 normalises case, slashes
 * and /index.php before looking them up.
 */
export function redirectsFromWp({ wp, authorSlug, mediaUrl, skip = new Set() }: RedirectInputs): Redirect[] {
  const out = new Map<string, string>();
  const add = (from: string, to: string | undefined) => {
    if (!to || !from || from === to || out.has(from)) return;
    out.set(from, to);
  };
  for (const p of wp.pages) {
    if (skip.has(p.id)) continue;
    const to = p.id === wp.frontPageId ? "/" : `/${p.slug}`;
    add(pathOf(p.link), to);
    add(`/?page_id=${p.id}`, to);
  }
  for (const p of wp.posts) {
    if (skip.has(p.id)) continue;
    add(pathOf(p.link), `/blog/${p.slug}`);
    add(`/?p=${p.id}`, `/blog/${p.slug}`);
  }
  for (const e of wp.events) {
    add(pathOf(e.link), `/events/${e.slug}`);
    add(`/?p=${e.id}`, `/events/${e.slug}`);
  }
  for (const c of wp.categories) add(pathOf(c.link), `/blog/category/${c.slug}`);
  for (const u of wp.users) {
    const slug = authorSlug(u);
    if (slug) add(pathOf(u.link), `/blog/author/${slug}`);
  }
  for (const m of wp.media) {
    const url = mediaUrl(m);
    if (!url) continue;
    add(pathOf(m.source_url), url);
    for (const size of Object.values(m.media_details?.sizes ?? {})) add(pathOf(size.source_url), url);
    add(pathOf(m.link), url);
    add(`/?attachment_id=${m.id}`, url);
  }
  out.delete("/");
  return [...out].map(([from, to]) => ({ from, to })).sort((a, b) => a.from.localeCompare(b.from));
}
