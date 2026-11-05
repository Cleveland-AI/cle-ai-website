import { HotspotFrame } from "@/blocks/hotspots/HotspotFrame.client";
import { Hotspots, type Spot } from "@/blocks/hotspots/Hotspots";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { getEvents } from "@/lib/content/queries";
import { findEvent } from "@/lib/events/find";
import { eventPath } from "@/lib/events/links";
import { whenShort, type EventDoc } from "@/lib/events/time";
import { ArtImg, artExists } from "@/lib/art";
import { siteNow } from "@/lib/now";

export type VenuePin = { _key?: string; title?: string | null; place?: string | null; match?: string | null; x?: number | null; y?: number | null };
export type VenueMapAttrs = { art?: string | null; alt?: string | null; pins?: VenuePin[] | null; _key?: string };

/** block.json defaults. */
export const DEFAULT_PINS: VenuePin[] = [
  { title: "Happy Dog", place: "5801 Detroit Avenue, Gordon Square. Monthly socials.", match: "Social", x: 25, y: 41 },
  { title: "Cleveland Museum of Natural History", place: "1 Wade Oval Drive, University Circle. Big nights.", match: "Mega", x: 87, y: 38 },
  { title: "On the trail", place: "Hikes in the Cuyahoga Valley and the Metroparks.", match: "Hike", x: 51, y: 79 },
];

/**
 * cle/venue-map: numbered pins on a clay map, each with the next upcoming event whose title contains
 * the pin's match word. The list underneath carries the same text for everyone, and is all that shows
 * when the map image is missing.
 */
export function VenueMapView(props: BlockSupports & VenueMapAttrs & { events: EventDoc[]; now: Date }) {
  const [supports, a] = splitSupports(props);
  const pins = (a.pins ?? DEFAULT_PINS).filter((p) => (p.title ?? "").trim() !== "");
  if (!pins.length) return null;
  const spots: Spot[] = pins.map((pin) => {
    const match = (pin.match ?? "").trim();
    const event = match ? findEvent(a.events, match, false, [], a.now) : null;
    const next = event ? (
      <>
        Next: <a href={eventPath(event)}>{event.title}</a>, {whenShort(event, "EEE, MMM d")}.
      </>
    ) : (
      "Nothing on the calendar here yet."
    );
    return {
      x: pin.x ?? 50,
      y: pin.y ?? 50,
      title: pin.title ?? "",
      body: (
        <>
          {pin.place ?? ""} {next}
        </>
      ),
    };
  });
  const art = a.art ?? "venue-map";
  const hasMap = artExists(art);
  return (
    <div {...wrapperProps("venue-map", "cle-map", supports)}>
      {hasMap ? (
        <HotspotFrame className="cle-map__frame cle-hotspots">
          <ArtImg slug={art} className="cle-map__img" alt={a.alt ?? "Clay map of Greater Cleveland with our regular venues marked."} />
          <Hotspots spots={spots} markerStyle="numbered" uid={`cle-map-${a._key ?? "0"}`} />
        </HotspotFrame>
      ) : null}
      <ol className={hasMap ? "cle-map__list" : "cle-map__list is-only"}>
        {spots.map((spot, i) => (
          <li key={pins[i]._key ?? i}>
            <strong>{spot.title}</strong> <span>{spot.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The cle/venue-map block, with the events and today's date. */
export async function VenueMap(props: BlockSupports & VenueMapAttrs) {
  const [events, now] = await Promise.all([getEvents(), siteNow()]);
  return <VenueMapView {...props} events={events} now={now} />;
}
