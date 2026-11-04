import { eventRange, fmt, type EventDoc } from "./time";

/** The events archive. */
export const EVENTS_PATH = "/events";

/** The event's page on this site, or the archive when it has no slug. */
export const eventPath = (e: EventDoc) => (e.slug?.current ? `${EVENTS_PATH}/${e.slug.current}` : EVENTS_PATH);

/** The start as PHP's DATE_ATOM in New York time ("2026-10-29T17:00:00-04:00"), for <time datetime>. */
export function startAtom(e: EventDoc): string {
  const r = eventRange(e);
  return r ? fmt(r.start, "yyyy-MM-dd'T'HH:mm:ssXXX") : "";
}
