import { PostDate } from "@/components/posts/PostParts";
import { query } from "@/lib/content/client";
import { EVENTS_QUERY, listPosts, type PostCard } from "@/lib/content/queries";
import type { QueryList as QueryListValue } from "@/lib/content/types";
import { splitEvents } from "@/lib/events/time";
import { siteNow } from "@/lib/now";
import { excerptOf, postPath, trimWords } from "@/lib/posts";

type Props = Pick<QueryListValue, "source" | "when" | "count">;
type Item = { _id: string; title?: string | null; slug?: { current?: string | null } | null; start?: string | null };

const dateLabel = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium" }).format(new Date(iso))
    : "";

/** Async server component: a list of posts or events. Wrap in <Suspense> (RichBody does). */
export async function QueryList({ source = "posts", when = "upcoming", count = 3 }: Props) {
  const limit = Math.max(1, count || 3);
  if (source !== "events") return postGrid((await listPosts({ limit })).posts);
  const at = await siteNow(); // an event counts as upcoming until the end of its New York day
  // Event `start` strings carry a UTC offset (schema validation enforces it); splitEvents parses
  // them to instants and never compares strings.
  const all = (await query<Item[]>(EVENTS_QUERY)) ?? [];
  const split = splitEvents(
    all.filter((e) => e.slug?.current),
    at,
  );
  const items = (when === "past" ? split.past : split.upcoming).slice(0, limit);
  if (!items.length) return null;
  return (
    <ul className="wp-block-list cle-query-list">
      {items.map((it) => (
        <li key={it._id}>
          <a href={`/events/${it.slug?.current}`}>{it.title}</a>
          {it.start ? <time dateTime={it.start}> {dateLabel(it.start)}</time> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * front-page.html's "Latest posts" query: a 3-column grid of title (h3, size l), date and a 24-word
 * excerpt per post, with WordPress's query and post-template classes. Posts with no slug are skipped
 * (listPosts only returns public posts with a slug, title and date).
 */
function postGrid(posts: PostCard[]) {
  if (!posts.length) return null;
  return (
    <div className="wp-block-query alignwide is-layout-flow wp-block-query-is-layout-flow">
      <ul className="columns-3 wp-block-post-template is-layout-grid wp-container-core-post-template-is-layout-61885799 wp-block-post-template-is-layout-grid">
        {posts.map((p) => {
          const text = trimWords(excerptOf(p), 24);
          return (
            <li key={p._id} className="wp-block-post">
              <h3 className="wp-block-post-title has-l-font-size">
                <a href={postPath(p.slug.current)} target="_self">
                  {p.title}
                </a>
              </h3>
              <PostDate iso={p.publishedAt} />
              {text ? (
                <div className="wp-block-post-excerpt">
                  <p className="wp-block-post-excerpt__excerpt">{text}</p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
