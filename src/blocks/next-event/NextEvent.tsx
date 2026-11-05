import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { getEvents } from "@/lib/content/queries";
import { findEvent } from "@/lib/events/find";
import { eventPath, startAtom } from "@/lib/events/links";
import { addressLine, whenShort, trim as t, type EventDoc } from "@/lib/events/time";
import { siteNow } from "@/lib/now";

export type NextEventAttrs = {
  layout?: "callout" | "bar" | string | null;
  match?: string | null;
  eyebrow?: string | null;
  rsvpLabel?: string | null;
  showExcerpt?: boolean | null;
  emptyText?: string | null;
  emptyLinkLabel?: string | null;
  emptyLink?: string | null;
};


/** Name plus full address on one line (cle_event_venue). */
const venueLine = (e: EventDoc) => [...new Set([t(e.venue?.name), addressLine(e)].filter(Boolean))].join(", ");

/** cle/next-event for a given event (or null for its empty state). */
export function NextEventView(props: BlockSupports & NextEventAttrs & { event: EventDoc | null }) {
  const [supports, a] = splitSupports(props);
  const bar = a.layout === "bar";
  const attrs = wrapperProps("next-event", bar ? "cle-next-event--bar" : "cle-next-event--callout", supports);
  const e = a.event;
  const rsvpLabel = a.rsvpLabel ?? "RSVP on Meetup";

  if (!e) {
    return (
      <div {...attrs}>
        <p className="cle-next-event__empty">
          {a.emptyText ?? "Nothing on the calendar yet. Join the Meetup group to hear about the next one."}{" "}
          <a href={a.emptyLink ?? "https://www.meetup.com/cleveland-ai-data/"}>{a.emptyLinkLabel ?? "Join on Meetup"}</a>
        </p>
      </div>
    );
  }

  const page = eventPath(e);
  const rsvp = t(e.rsvpUrl) || page;
  const time = <time dateTime={startAtom(e)}>{whenShort(e, bar ? "EEE, MMM d" : "EEEE, MMMM d")}</time>;

  if (bar) {
    const venue = t(e.venue?.name);
    return (
      <div {...attrs}>
        <p className="cle-next-event__line">
          <strong>{a.eyebrow ?? "Next event"}:</strong> <a href={page}>{e.title}</a>{" "}
          <span className="cle-next-event__meta">
            {time}
            {venue ? ` · ${venue}` : ""}
          </span>{" "}
          <a className="cle-next-event__rsvp" href={rsvp}>
            {rsvpLabel}
          </a>
        </p>
      </div>
    );
  }

  const venue = venueLine(e);
  const excerpt = on(a.showExcerpt) ? t(e.excerpt) : "";
  return (
    <div {...attrs}>
      <p className="cle-eyebrow">{a.eyebrow ?? "Next event"}</p>
      <h2 className="cle-next-event__title">
        <a href={page}>{e.title}</a>
      </h2>
      <p className="cle-next-event__meta">{time}</p>
      {venue ? <p className="cle-next-event__meta">{venue}</p> : null}
      {excerpt ? <p className="cle-next-event__excerpt">{excerpt}</p> : null}
      <p>
        <a className="wp-element-button" href={rsvp}>
          {rsvpLabel}
        </a>
      </p>
    </div>
  );
}

const on = (v: boolean | null | undefined) => v ?? true;

/** cle/next-event: the soonest upcoming event whose title contains `match` (any event when empty). */
export async function NextEvent(props: BlockSupports & NextEventAttrs) {
  const [events, now] = await Promise.all([getEvents(), siteNow()]);
  return <NextEventView {...props} event={findEvent(events, props.match ?? "", false, [], now)} />;
}
