import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { imageUrl } from "@/components/core/Image";
import { getEvents, getTickerPosts, type TickerPost } from "@/lib/content/queries";
import { eventPath, startAtom } from "@/lib/events/links";
import { fmt, splitEvents, type EventDoc } from "@/lib/events/time";
import { siteNow } from "@/lib/now";
import { TickerFrame } from "./TickerFrame.client";

export type TickerAttrs = {
  source?: "posts" | "events" | "both" | string | null;
  count?: number | null;
  showThumbnails?: boolean | null;
  duration?: number | null;
  label?: string | null;
  eventPrefix?: string | null;
  pauseLabel?: string | null;
  playLabel?: string | null;
};

export type TickerItem = { url: string; title: string; date: string; iso: string; thumb?: string };

const clampCount = (n: number | null | undefined) => Math.max(1, Math.min(20, Math.trunc(Number(n ?? 8)) || 1));

/**
 * The items, as the theme's render.php builds them: upcoming events first (soonest first, by the
 * archive's "until the end of the day" rule), then the newest public posts, cut to `count` altogether.
 * `posts` must already be public (getTickerPosts), so a post scheduled for later never appears.
 */
export function buildTickerItems(a: {
  source?: string | null;
  count?: number | null;
  eventPrefix?: string | null;
  events: EventDoc[];
  posts: Pick<TickerPost, "title" | "slug" | "publishedAt" | "featuredImage">[];
  now: Date;
}): TickerItem[] {
  const count = clampCount(a.count);
  const items: TickerItem[] = [];
  const source = a.source ?? "posts";
  if (source !== "posts") {
    for (const e of splitEvents(a.events, a.now).upcoming.slice(0, count)) {
      const start = new Date(e.start ?? "");
      items.push({
        url: eventPath(e),
        title: `${a.eventPrefix ?? "Next:"} ${e.title ?? ""}`.trim(),
        date: fmt(start, "MMM d"),
        iso: startAtom(e),
        thumb: e.image ? imageUrl(e.image, 150) : undefined,
      });
    }
  }
  if (source !== "events") {
    for (const p of a.posts.slice(0, count)) {
      const at = new Date(p.publishedAt);
      items.push({
        url: `/blog/${p.slug.current}`,
        title: p.title,
        date: fmt(at, "MMM d"),
        iso: fmt(at, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        thumb: p.featuredImage ? imageUrl(p.featuredImage, 150) : undefined,
      });
    }
  }
  return items.slice(0, count);
}

/** One copy of the list. The second copy makes the loop seamless; it is hidden from screen readers and the tab order. */
function List({ items, clone, showThumbnails }: { items: TickerItem[]; clone: boolean; showThumbnails: boolean }) {
  return (
    <ul className="cle-ticker__list" {...(clone ? { "aria-hidden": "true" as const } : {})}>
      {items.map((item, i) => (
        <li key={i}>
          <a href={item.url} {...(clone ? { tabIndex: -1 } : {})}>
            {showThumbnails && item.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN already resizes
              <img className="cle-ticker__thumb" src={item.thumb} alt="" loading="lazy" decoding="async" />
            ) : null}
            <span>{item.title}</span> <time className="cle-ticker__date" dateTime={item.iso}>{item.date}</time>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** cle/ticker for given items: recent posts and/or upcoming events on a CSS-animated, duplicated track. */
export function TickerView(props: BlockSupports & Omit<TickerAttrs, "source" | "count" | "eventPrefix"> & { items: TickerItem[] }) {
  const [supports, a] = splitSupports(props);
  if (!a.items.length) return null;
  const showThumbnails = a.showThumbnails ?? true;
  const label = a.label ?? "Latest";
  const pause = a.pauseLabel ?? "Pause";
  const wrapper = wrapperProps("ticker", "", supports, {
    "--cle-ticker-duration": `${Math.max(10, Math.trunc(Number(a.duration ?? 50)) || 0)}s`,
  } as React.CSSProperties);
  return (
    <TickerFrame wrapper={{ ...wrapper, role: "region", "aria-label": label || "Ticker" }} play={a.playLabel ?? "Play"} pause={pause}>
      {label ? <p className="cle-ticker__label cle-eyebrow">{label}</p> : null}
      {/* data-dynamic: the scrolling items depend on the clock; `npm run visual` masks this region. */}
      <div className="cle-ticker__viewport" data-dynamic="">
        <div className="cle-ticker__track">
          <List items={a.items} clone={false} showThumbnails={showThumbnails} />
          <List items={a.items} clone showThumbnails={showThumbnails} />
        </div>
      </div>
    </TickerFrame>
  );
}

/** The cle/ticker block. */
export async function Ticker(props: BlockSupports & TickerAttrs) {
  const source = props.source ?? "posts";
  const count = clampCount(props.count);
  const [events, posts, now] = await Promise.all([
    source === "posts" ? Promise.resolve([]) : getEvents(),
    source === "events" ? Promise.resolve([]) : getTickerPosts(count),
    siteNow(),
  ]);
  return <TickerView {...props} items={buildTickerItems({ ...props, count, events, posts, now })} />;
}
