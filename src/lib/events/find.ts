import { splitEvents, type EventDoc } from "./time";

/**
 * Soonest upcoming event whose title contains `needle` (case-insensitive; empty matches any).
 * With `fallback`, the soonest upcoming event of any kind when nothing matches. `exclude` lists
 * slugs or ids to skip.
 */
export function findEvent<T extends EventDoc>(
  events: T[],
  needle: string,
  fallback = false,
  exclude: string[] = [],
  now: Date = new Date(),
): T | null {
  const skip = new Set(exclude);
  const upcoming = splitEvents(events, now).upcoming.filter(
    (e) => !(e._id && skip.has(e._id)) && !(e.slug?.current && skip.has(e.slug.current)),
  );
  const n = needle.toLowerCase();
  return upcoming.find((e) => n === "" || (e.title ?? "").toLowerCase().includes(n)) ?? (fallback ? (upcoming[0] ?? null) : null);
}
