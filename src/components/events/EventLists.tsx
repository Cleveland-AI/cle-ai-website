import { Fragment } from "react";
import { EventMeta } from "@/blocks/event-meta/EventMeta";
import { Mascot } from "@/blocks/mascot/Mascot";
import { imageUrl } from "@/components/core/Image";
import { EVENTS_PATH, eventPath } from "@/lib/events/links";
import type { EventDoc } from "@/lib/events/time";

/** The past list's page size (templates/archive-meetup_events.html, perPage 12). */
export const PAST_PER_PAGE = 12;

const QUERY_CLASS = "wp-block-query alignwide is-layout-flow wp-block-query-is-layout-flow";

/** The Upcoming query loop: every upcoming event, soonest first; sleeping Dot when there are none. */
export function UpcomingEvents({ events, now }: { events: EventDoc[]; now: Date }) {
  return (
    <div className={QUERY_CLASS}>
      {events.length ? (
        <ul className="wp-block-post-template is-layout-flow wp-block-post-template-is-layout-flow">
          {events.map((e) => (
            <li key={e._id} className="wp-block-post">
              <EventMeta event={e} now={now} showVenue={false} showRsvp={false} />
              <h3 className="wp-block-post-title has-xl-font-size">
                <a href={eventPath(e)} target="_self">
                  {e.title}
                </a>
              </h3>
              <EventMeta event={e} now={now} showDate={false} venueStyle="name" />
            </li>
          ))}
        </ul>
      ) : (
        // core/query-no-results wraps the empty state in its own div.
        <div className="wp-block-query-no-results">
          <Mascot pose="sleep" width={200} />
          <p className="wp-block-paragraph">
            No events scheduled right now. <a href="https://www.meetup.com/cleveland-ai-data/">Check the Meetup group.</a>
          </p>
        </div>
      )}
    </div>
  );
}

const pageHref = (n: number) => (n <= 1 ? EVENTS_PATH : `${EVENTS_PATH}/page/${n}`);

/** The Past query loop: a three-column grid, newest first, 12 a page, with core/query-pagination. */
export function PastEvents({ events, now, page }: { events: EventDoc[]; now: Date; page: number }) {
  const pages = Math.max(1, Math.ceil(events.length / PAST_PER_PAGE));
  const shown = events.slice((page - 1) * PAST_PER_PAGE, page * PAST_PER_PAGE);
  if (!shown.length) {
    return (
      <div className={QUERY_CLASS}>
        <div className="wp-block-query-no-results">
          <p className="wp-block-paragraph">No events here yet.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={QUERY_CLASS}>
      <ul className="columns-3 wp-block-post-template is-layout-grid wp-container-core-post-template-is-layout-61885799 wp-block-post-template-is-layout-grid">
        {shown.map((e) => {
          const src = e.image?.asset ? imageUrl(e.image, 800) : undefined;
          return (
            <li key={e._id} className="wp-block-post">
              {src ? (
                <figure style={{ aspectRatio: "16/9" }} className="wp-block-post-featured-image">
                  <a href={eventPath(e)} target="_self">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Sanity CDN already resizes */}
                    <img src={src} alt={e.title ?? ""} style={{ height: "100%", objectFit: "cover" }} loading="lazy" />
                  </a>
                </figure>
              ) : null}
              <EventMeta event={e} now={now} showVenue={false} showRsvp={false} fontSize="s" />
              <h3 className="wp-block-post-title has-l-font-size">
                <a href={eventPath(e)} target="_self">
                  {e.title}
                </a>
              </h3>
              <EventMeta event={e} now={now} showDate={false} showRsvp={false} venueStyle="name" fontSize="s" />
            </li>
          );
        })}
      </ul>
      {pages > 1 ? (
        <nav className="wp-block-query-pagination is-layout-flex wp-block-query-pagination-is-layout-flex" aria-label="Pagination">
          {page > 1 ? (
            <a href={pageHref(page - 1)} className="wp-block-query-pagination-previous">
              Previous Page
            </a>
          ) : null}
          <div className="wp-block-query-pagination-numbers">
            {/* Whitespace between the numbers, as paginate_links prints a newline between them. */}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Fragment key={n}>
                {n > 1 ? "\n" : null}
                {n === page ? (
                  <span aria-current="page" className="page-numbers current">
                    {n}
                  </span>
                ) : (
                  <a className="page-numbers" href={pageHref(n)}>
                    {n}
                  </a>
                )}
              </Fragment>
            ))}
          </div>
          {page < pages ? (
            <a href={pageHref(page + 1)} className="wp-block-query-pagination-next">
              Next Page
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
