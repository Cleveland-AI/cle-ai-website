import type { ReactNode } from "react";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { EVENTS_PATH, startAtom } from "@/lib/events/links";
import { addressLine, eventRange, hasEnded, mapUrl, whenLong, whenShort, trim as t, type EventDoc } from "@/lib/events/time";
import { siteNow } from "@/lib/now";

export type EventMetaAttrs = {
  showStatus?: boolean | null;
  statusUpcoming?: string | null;
  statusPast?: string | null;
  showDate?: boolean | null;
  dateStyle?: "short" | "long" | string | null;
  showVenue?: boolean | null;
  venueStyle?: "full" | "name" | string | null;
  showRsvp?: boolean | null;
  rsvpLabel?: string | null;
  showOrganizer?: boolean | null;
  organizerLabel?: string | null;
  showBackLink?: boolean | null;
  backLabel?: string | null;
};

export type EventMetaProps = BlockSupports & EventMetaAttrs & { event?: EventDoc | null; now: Date };

const on = (v: boolean | null | undefined, dflt: boolean) => (v == null ? dflt : v);

/**
 * cle/event-meta: an event's status, date and time, venue with a map link, RSVP button, organizer and
 * a link back to all events, each part optional and each field guarded. "Past" means the event has
 * ended (hasEnded, like cle_event_is_past), and a past event never shows an RSVP button.
 */
export function EventMeta(props: EventMetaProps) {
  const [supports, a] = splitSupports(props);
  const e = a.event;
  if (!e) return null;
  const past = hasEnded(e, a.now);
  const parts: ReactNode[] = [];

  if (on(a.showStatus, false)) {
    parts.push(
      <p key="status" className="cle-event-meta__status">
        <span className="cle-eyebrow">{past ? (a.statusPast ?? "Past") : (a.statusUpcoming ?? "Upcoming")}</span>
      </p>,
    );
  }

  if (on(a.showDate, true) && eventRange(e)) {
    const when = a.dateStyle === "long" ? whenLong(e) : whenShort(e, "EEEE, MMMM d, yyyy");
    parts.push(
      <p key="when" className="cle-event-meta__when">
        <time dateTime={startAtom(e)}>{when}</time>
      </p>,
    );
  }

  if (on(a.showVenue, true)) {
    const name = t(e.venue?.name);
    const address = addressLine(e);
    if (a.venueStyle === "name") {
      const label = name || t(e.venue?.city);
      if (label) parts.push(<p key="where" className="cle-event-meta__where">{label}</p>);
    } else if (name || address) {
      const map = mapUrl(e);
      const line = address || name;
      parts.push(
        <div key="where" className="cle-event-meta__where">
          {name && address ? <p className="cle-event-meta__venue">{name}</p> : null}
          <p className="cle-event-meta__address">{map ? <a href={map}>{line}</a> : line}</p>
        </div>,
      );
    }
  }

  const rsvp = t(e.rsvpUrl);
  if (on(a.showRsvp, true) && !past && rsvp) {
    parts.push(
      <p key="rsvp" className="cle-event-meta__rsvp">
        <a className="wp-element-button" href={rsvp}>
          {a.rsvpLabel ?? "RSVP on Meetup"}
        </a>
      </p>,
    );
  }

  const organizer = t(e.organizer);
  if (on(a.showOrganizer, false) && organizer) {
    const orgUrl = t(e.organizerUrl);
    parts.push(
      <p key="organizer" className="cle-event-meta__organizer">
        {`${a.organizerLabel ?? "Organized by"} `}
        {orgUrl ? <a href={orgUrl}>{organizer}</a> : organizer}
      </p>,
    );
  }

  if (on(a.showBackLink, false)) {
    parts.push(
      <p key="back" className="cle-event-meta__back">
        <a href={EVENTS_PATH}>{a.backLabel ?? "← All events"}</a>
      </p>,
    );
  }

  if (!parts.length) return null;
  return <div {...wrapperProps("event-meta", past ? "is-past" : "is-upcoming", supports)}>{parts}</div>;
}

/**
 * The registered cle/event-meta block. In WordPress it reads the event from the block context; a
 * richBody has none, so it renders only when an event is passed in (event pages and lists do that).
 */
export async function EventMetaBlock(props: Omit<EventMetaProps, "now">) {
  if (!props.event) return null;
  return <EventMeta {...props} now={await siteNow()} />;
}
