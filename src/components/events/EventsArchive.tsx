import { notFound } from "next/navigation";
import { VenueMapView } from "@/blocks/venue-map/VenueMap";
import { Main } from "@/components/Main";
import { getEvents } from "@/lib/content/queries";
import { splitEvents } from "@/lib/events/time";
import { siteNow } from "@/lib/now";
import { PAST_PER_PAGE, PastEvents, UpcomingEvents } from "./EventLists";

/** How many pages the Past list has (at least one). */
export async function pastPageCount(): Promise<number> {
  const { past } = splitEvents(await getEvents(), await siteNow());
  return Math.max(1, Math.ceil(past.length / PAST_PER_PAGE));
}

/**
 * templates/archive-meetup_events.html: the venue map, Upcoming, then Past events (12 a page). The
 * map and both lists come from one read of the events and one clock, so an event can't be in both
 * lists or neither. A page past the last one is a 404.
 */
export async function EventsArchive({ page }: { page: number }) {
  const [events, now] = await Promise.all([getEvents(), siteNow()]);
  const { upcoming, past } = splitEvents(events, now);
  if (page > 1 && (page - 1) * PAST_PER_PAGE >= past.length) notFound();
  return (
    <Main>
      <h1 className="wp-block-heading alignwide">Events</h1>
      <VenueMapView align="wide" events={events} now={now} />
      <h2 className="wp-block-heading alignwide">Upcoming</h2>
      <UpcomingEvents events={upcoming} now={now} />
      <h2 className="wp-block-heading alignwide">Past events</h2>
      <PastEvents events={past} now={now} page={page} />
    </Main>
  );
}
