import type { MeetupEvent } from "./types";

/** RFC 5545 line unfolding: a line starting with a space or tab continues the previous one. */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^[ \t]/.test(line) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

const unescapeText = (s: string) => s.replace(/\\([nN,;\\])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));

/**
 * 20261029T180000 (local, TZID given or floating) or 20261119T000000Z -> an ISO string the mapper understands.
 * The TZID parameter is ignored: local times are read as America/New_York, this group's zone.
 */
function icalTime(value: string): string | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value.trim());
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}${m[7] ?? ""}`;
}

/** "Happy Dog (5801 Detroit Avenue, Cleveland, OH 44102)" -> venue parts. */
function parseLocation(loc: string): MeetupEvent["venue"] {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(loc);
  const name = m ? m[1] : loc;
  const parts = (m ? m[2] : "").split(",").map((p) => p.trim());
  const [address, city, stateZip] = parts;
  const sz = /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(stateZip ?? "");
  return { name, address, city, state: sz ? sz[1] : stateZip, postalCode: sz?.[2] };
}

/**
 * Parses Meetup's public group feed (https://www.meetup.com/<urlname>/events/ical/) into the same
 * shape the GraphQL client returns. VEVENTs without a usable UID/URL or start are skipped.
 */
export function parseIcal(text: string): MeetupEvent[] {
  const events: MeetupEvent[] = [];
  let cur: Record<string, { params: string; value: string }> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT" && cur) {
      const e = toMeetupEvent(cur);
      if (e) events.push(e);
      cur = null;
    } else if (cur) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const [name, ...params] = line.slice(0, i).split(";");
      cur[name.toUpperCase()] = { params: params.join(";"), value: line.slice(i + 1) };
    }
  }
  return events;
}

function toMeetupEvent(p: Record<string, { params: string; value: string }>): MeetupEvent | null {
  const url = p.URL?.value.trim() ?? "";
  const id = /events\/(\d+)/.exec(url)?.[1] ?? /^event_(\d+)@/.exec(p.UID?.value ?? "")?.[1];
  const dateTime = p.DTSTART && icalTime(p.DTSTART.value);
  if (!id || !dateTime || !p.SUMMARY) return null;
  const geo = /^(-?[\d.]+);(-?[\d.]+)$/.exec(p.GEO?.value ?? "");
  const venue = p.LOCATION?.value ? parseLocation(unescapeText(p.LOCATION.value)) : null;
  return {
    id,
    title: unescapeText(p.SUMMARY.value),
    description: p.DESCRIPTION ? unescapeText(p.DESCRIPTION.value) : null,
    dateTime,
    endTime: (p.DTEND && icalTime(p.DTEND.value)) || null,
    eventUrl: url || `https://www.meetup.com/events/${id}/`,
    status: /^cancel/i.test(p.STATUS?.value ?? "") ? "CANCELLED" : "ACTIVE",
    venue: venue ? { ...venue, lat: geo ? Number(geo[1]) : null, lng: geo ? Number(geo[2]) : null } : null,
  };
}
