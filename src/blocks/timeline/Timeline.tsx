import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { getEvents } from "@/lib/content/queries";
import { eventPath } from "@/lib/events/links";
import { eventRange, fmt, SITE_TZ, splitEvents, type EventDoc } from "@/lib/events/time";
import { sanitize } from "@/lib/sanitize";
import { siteNow } from "@/lib/now";
import { fromZonedTime } from "date-fns-tz";
import { TimelineFrame } from "./TimelineFrame.client";

export type TimelineMilestone = {
  _key?: string;
  date?: string | null;
  label?: string | null;
  title?: string | null;
  body?: string | null;
  tag?: string | null;
  major?: boolean | null;
  next?: boolean | null;
};
export type TimelineAttrs = {
  milestones?: TimelineMilestone[] | null;
  includeEvents?: boolean | null;
  startYear?: number | null;
  eventLabel?: string | null;
};

type Item = {
  key: string;
  /** The day, `yyyy-MM-dd`, in New York. */
  day: string;
  x: number;
  label: string;
  title: string;
  body?: string;
  tag?: string;
  url?: string;
  major?: boolean;
  next?: boolean;
  event?: boolean;
};

/** Midnight New York time on a calendar day, as epoch ms. */
const nyMidnight = (day: string) => fromZonedTime(`${day}T00:00:00`, SITE_TZ).getTime();
const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && fmt(new Date(nyMidnight(s)), "yyyy-MM-dd") === s;

/**
 * Milestones (block fields) plus the events, placed by real date. The axis runs from startYear to next
 * year; sparse stretches stay visibly empty. A milestone holds its day against an event on it, and of
 * two milestones on one day the later wins. Past events are capped at the latest 200, upcoming at 20.
 */
export function buildTimeline(a: TimelineAttrs & { events: EventDoc[]; now: Date }) {
  const first = Math.trunc(Number(a.startYear ?? 2010)) || 2010;
  const last = Number(fmt(a.now, "yyyy")) + 1;
  const from = nyMidnight(`${first}-01-01`);
  const span = nyMidnight(`${last + 1}-01-01`) - from;
  const pos = (ts: number) => Math.round(Math.max(0, Math.min(1, (ts - from) / span)) * 1e5) / 1e5;

  const byDay = new Map<string, Item>();
  for (const m of a.milestones ?? []) {
    const day = (m.date ?? "").trim();
    if (!validDay(day)) continue;
    byDay.set(day, {
      key: day,
      day,
      x: pos(nyMidnight(day)),
      label: m.label ?? "",
      title: m.title ?? "",
      body: m.body ?? undefined,
      tag: m.tag ?? undefined,
      major: !!m.major,
      next: !!m.next,
    });
  }
  if (a.includeEvents ?? true) {
    const { upcoming, past } = splitEvents(a.events, a.now);
    for (const e of [...past.slice(0, 200), ...upcoming.slice(0, 20)]) {
      const r = eventRange(e);
      if (!r) continue;
      const day = fmt(r.start, "yyyy-MM-dd");
      if (byDay.has(day)) continue;
      byDay.set(day, {
        key: day,
        day,
        x: pos(r.start.getTime()),
        label: fmt(r.start, "MMMM yyyy"),
        title: e.title ?? "",
        tag: a.eventLabel ?? "Meetup",
        url: eventPath(e),
        event: true,
      });
    }
  }
  const items = [...byDay.values()].sort((p, q) => (p.day < q.day ? -1 : p.day > q.day ? 1 : 0));
  const axis = Array.from({ length: last - first + 1 }, (_, i) => ({ year: first + i, x: pos(nyMidnight(`${first + i}-01-01`)) }));
  return { first, last, years: last - first + 1, axis, items };
}

/** cle/timeline for given events and date. */
export function TimelineView(props: BlockSupports & TimelineAttrs & { events: EventDoc[]; now: Date }) {
  const [supports, a] = splitSupports(props);
  const tl = buildTimeline(a);
  return (
    <TimelineFrame {...wrapperProps("timeline", "", supports, { "--cle-tl-years": tl.years } as React.CSSProperties)}>
      <div className="cle-timeline__pin">
        <div className="cle-timeline__playhead" aria-hidden="true"></div>
        <div className="cle-timeline__track">
          <ol className="cle-timeline__axis" aria-hidden="true">
            {tl.axis.map((y) => (
              <li key={y.year} style={{ "--x": y.x } as React.CSSProperties}>
                {y.year}
              </li>
            ))}
          </ol>
          <ol className="cle-timeline__items">
            {tl.items.map((item) => (
              <li
                key={item.key}
                className={`cle-timeline__item${item.major ? " is-major" : ""}${item.next ? " is-next" : ""}${item.event ? " is-event" : ""}`}
                data-x={item.x}
                style={{ "--x": item.x } as React.CSSProperties}
              >
                <span className="cle-timeline__marker"></span>
                <div className="cle-timeline__card">
                  <p className="cle-timeline__date">
                    <time dateTime={item.day}>{item.label}</time>
                    {item.tag ? <span className="cle-timeline__tag">{item.tag}</span> : null}
                  </p>
                  <h3 className="cle-timeline__title">
                    {item.url ? (
                      <a href={item.url}>{item.title}</a>
                    ) : (
                      <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: sanitize(item.title, "inline") }} />
                    )}
                  </h3>
                  {item.body ? (
                    <p className="cle-timeline__body" dangerouslySetInnerHTML={{ __html: sanitize(item.body, "inline") }} />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </TimelineFrame>
  );
}

/** The cle/timeline block: its milestones and every event, against today's date. */
export async function Timeline(props: BlockSupports & TimelineAttrs) {
  const [events, now] = await Promise.all([props.includeEvents === false ? Promise.resolve([]) : getEvents(), siteNow()]);
  return <TimelineView {...props} events={events} now={now} />;
}
