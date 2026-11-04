import type { CSSProperties } from "react";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { getEvents, listPosts } from "@/lib/content/queries";
import { ArtImg, artExists } from "@/lib/art";
import { findEvent } from "@/lib/events/find";
import { eventPath } from "@/lib/events/links";
import { fmt, trim, type EventDoc } from "@/lib/events/time";
import { siteNow } from "@/lib/now";

export type ComingUpAttrs = {
  events?: { match?: string | null; label?: string | null }[] | null;
  showPost?: boolean | null;
  postLabel?: string | null;
};

export type ComingCard = { label: string; title: string; url: string; date: string; month: string; day: string; meta: string };

const CHIPS = ["blue", "coral", "yellow", "green"]; // logo colours, in card order
const DEFAULT_EVENTS = [
  { match: "Mega", label: "Next big night" },
  { match: "Social", label: "Next social" },
];

const dateParts = (d: Date) => ({ date: fmt(d, "yyyy-MM-dd"), month: fmt(d, "MMM"), day: fmt(d, "d") });

/**
 * The cards, as render.php builds them: each wanted word takes the soonest upcoming event whose title
 * contains it, or else the soonest one not already shown; then the latest post. `post` must already be
 * public (listPosts), so a post scheduled for later never gets a card.
 */
export function buildComingCards(a: {
  events: EventDoc[];
  wants: { match?: string | null; label?: string | null }[];
  showPost: boolean;
  postLabel: string;
  post: { title: string; slug: { current: string }; publishedAt: string } | null;
  now: Date;
}): ComingCard[] {
  const cards: ComingCard[] = [];
  const used: string[] = [];
  for (const want of a.wants) {
    const e = findEvent(a.events, trim(want.match), true, used, a.now);
    if (!e) continue;
    used.push(...[e._id, e.slug?.current].filter((x): x is string => !!x));
    const start = new Date(e.start ?? "");
    const valid = !Number.isNaN(start.getTime());
    cards.push({
      label: want.label ?? "",
      title: e.title ?? "",
      url: eventPath(e),
      ...(valid ? dateParts(start) : { date: "", month: "", day: "" }),
      meta: [valid ? fmt(start, "EEE h:mm aaa") : "", trim(e.venue?.name)].filter(Boolean).join(" · "),
    });
  }
  const posted = a.showPost && a.post ? new Date(a.post.publishedAt) : null;
  if (a.post && posted) {
    cards.push({
      label: a.postLabel,
      title: a.post.title,
      url: `/blog/${a.post.slug.current}`,
      ...(Number.isNaN(posted.getTime()) ? { date: "", month: "", day: "" } : dateParts(posted)),
      meta: "",
    });
  }
  return cards;
}

/** cle/coming-up for given cards. Nothing to show: Dot naps and the visitor is pointed to Meetup. */
export function ComingUpView(props: BlockSupports & { cards: ComingCard[] }) {
  const [supports, a] = splitSupports(props);
  const wrapper = wrapperProps("coming-up", "", supports);
  if (!a.cards.length) {
    return (
      <section {...wrapper} aria-label="Coming up">
        <div className="cle-coming__empty">
          {artExists("dot-sleep") ? <ArtImg slug="dot-sleep" className="cle-coming__dot" /> : null}
          <p>
            Nothing on the calendar right now. <a href="https://www.meetup.com/cleveland-ai-data/">Check the Meetup group.</a>
          </p>
        </div>
      </section>
    );
  }
  return (
    <section {...wrapper} aria-label="Coming up">
      <ul className="cle-coming__row">
        {a.cards.map((card, i) => (
          <li key={i} className="cle-coming__card" style={{ "--chip": `var(--wp--preset--color--${CHIPS[i % CHIPS.length]})` } as CSSProperties}>
            <a className="cle-coming__link" href={card.url}>
              {card.date ? (
                <time className="cle-coming__date" dateTime={card.date}>
                  <span className="cle-coming__month">{card.month}</span>
                  <span className="cle-coming__day">{card.day}</span>
                </time>
              ) : null}
              <span className="cle-coming__text">
                {card.label ? <span className="cle-coming__label">{card.label}</span> : null}
                <span className="cle-coming__title">{card.title}</span>
                {card.meta ? <span className="cle-coming__meta">{card.meta}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The cle/coming-up block. */
export async function ComingUp(props: BlockSupports & ComingUpAttrs) {
  const showPost = props.showPost ?? true;
  const [events, latest, now] = await Promise.all([
    getEvents(),
    showPost ? listPosts({ limit: 1 }) : Promise.resolve({ posts: [], total: 0 }),
    siteNow(),
  ]);
  const cards = buildComingCards({
    events,
    wants: props.events ?? DEFAULT_EVENTS,
    showPost,
    postLabel: props.postLabel ?? "Latest post",
    post: latest.posts[0] ?? null,
    now,
  });
  return <ComingUpView {...props} cards={cards} />;
}
