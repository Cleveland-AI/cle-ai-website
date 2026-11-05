import { parseIcal } from "./ical";
import { toNewYorkIso } from "./map";
import type { MeetupEvent } from "./types";

export type { MeetupEvent } from "./types";

// Meetup's GraphQL API: https://www.meetup.com/api/guide/ (endpoint, Bearer auth) and
// https://www.meetup.com/api/authentication/ (OAuth2 refresh_token grant).
export const GRAPHQL_URL = "https://api.meetup.com/gql-ext";
export const TOKEN_URL = "https://secure.meetup.com/oauth2/access";

/** Where the rotated refresh token lives between runs (Meetup refresh tokens are single use). */
export type TokenStore = { get(): Promise<string | undefined>; set(token: string): Promise<void> };

export type ClientOptions = {
  fetch?: typeof fetch;
  tokenStore?: TokenStore;
  env?: Record<string, string | undefined>;
};

const QUERY = `query GroupEvents($urlname: String!, $after: String) {
  groupByUrlname(urlname: $urlname) {
    name
    urlname
    events(first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id title description dateTime endTime eventUrl status
          venue { name address city state postalCode lat lng }
          featuredEventPhoto { id highResUrl }
          group { name urlname }
        }
      }
    }
  }
}`;

/**
 * Refresh-token grant. Refresh tokens are single use, so the one in the response is saved to the
 * token store (when given) before the access token is used; the stored token beats the env one.
 */
async function accessToken(f: typeof fetch, env: NonNullable<ClientOptions["env"]>, store?: TokenStore): Promise<string> {
  const { MEETUP_CLIENT_ID: id, MEETUP_CLIENT_SECRET: secret } = env;
  const refresh = (await store?.get()) || env.MEETUP_REFRESH_TOKEN;
  if (!id || !secret || !refresh) throw new Error("Meetup credentials are not set (MEETUP_CLIENT_ID, MEETUP_CLIENT_SECRET, MEETUP_REFRESH_TOKEN)");
  const res = await f(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "refresh_token", refresh_token: refresh }).toString(),
  });
  if (!res.ok) throw new Error(`Meetup token refresh failed: HTTP ${res.status}`);
  const body = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!body.access_token) throw new Error("Meetup token refresh returned no access_token");
  if (body.refresh_token && store) await store.set(body.refresh_token);
  return body.access_token;
}

type Node = {
  id: string;
  title: string;
  description?: string | null;
  dateTime: string;
  endTime?: string | null;
  eventUrl: string;
  status: string;
  venue?: MeetupEvent["venue"];
  featuredEventPhoto?: { highResUrl?: string | null } | null;
  group?: { name?: string | null; urlname?: string | null } | null;
};

export async function fetchGroupEvents(urlname: string, opts: ClientOptions = {}): Promise<MeetupEvent[]> {
  const f = opts.fetch ?? fetch;
  const token = await accessToken(f, opts.env ?? process.env, opts.tokenStore);
  const events: MeetupEvent[] = [];
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const res = await f(GRAPHQL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { urlname, after } }),
    });
    if (!res.ok) throw new Error(`Meetup GraphQL failed: HTTP ${res.status}`);
    const body = (await res.json()) as {
      data?: { groupByUrlname?: { events?: { pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }; edges?: { node: Node }[] } } | null };
      errors?: { message?: string }[];
    };
    if (body.errors?.length) throw new Error(`Meetup GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`);
    const group = body.data?.groupByUrlname;
    if (!group?.events) throw new Error(`Meetup group "${urlname}" not found in the GraphQL response`);
    for (const { node: n } of group.events.edges ?? []) {
      if (!toNewYorkIso(n.dateTime)) {
        console.warn(`meetup sync: skipping event ${n.id}, no usable start time`);
        continue;
      }
      events.push({
        id: n.id,
        title: n.title,
        description: n.description,
        dateTime: n.dateTime,
        endTime: n.endTime,
        eventUrl: n.eventUrl,
        status: n.status,
        venue: n.venue,
        // TODO: import the Meetup photo (imageUrl) as a Sanity image asset; not done yet, the sync never sets `image`.
        imageUrl: n.featuredEventPhoto?.highResUrl,
        organizer: n.group?.name,
        organizerUrl: n.group?.urlname ? `https://www.meetup.com/${n.group.urlname}/` : undefined,
      });
    }
    const info = group.events.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    after = info.endCursor;
  }
  return events;
}

/** The group's public iCal feed, used when the GraphQL API can't be reached. */
export async function fetchIcalEvents(urlname: string, f: typeof fetch = fetch): Promise<MeetupEvent[]> {
  const res = await f(`https://www.meetup.com/${urlname}/events/ical/`, { headers: { Accept: "text/calendar" } });
  if (!res.ok) throw new Error(`Meetup iCal feed failed: HTTP ${res.status}`);
  return parseIcal(await res.text());
}

/** GraphQL first; on any failure, warn and fall back to the iCal feed. Throws when both fail. */
export async function fetchEventsWithFallback(
  urlname: string,
  opts: ClientOptions = {},
): Promise<{ events: MeetupEvent[]; source: "graphql" | "ical" }> {
  try {
    return { events: await fetchGroupEvents(urlname, opts), source: "graphql" };
  } catch (err) {
    console.error(`meetup sync: GraphQL failed (${err instanceof Error ? err.message : err}); falling back to the iCal feed`);
    return { events: await fetchIcalEvents(urlname, opts.fetch ?? fetch), source: "ical" };
  }
}
