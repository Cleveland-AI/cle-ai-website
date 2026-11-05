import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEventsWithFallback, fetchGroupEvents, type MeetupEvent } from "@/lib/meetup/client";
import { parseIcal } from "@/lib/meetup/ical";
import { createSanityTokenStore } from "@/lib/meetup/token-store";
import { toEventDoc } from "@/lib/meetup/map";
import { SYNC_OWNED_FIELDS, syncEvents, type SanityWriter } from "@/lib/meetup/sync";

const fixture = (name: string) => readFileSync(`tests/fixtures/meetup/${name}`, "utf8");
const gql = JSON.parse(fixture("group-events.json"));

/** The recorded GraphQL response, mapped by the client the same way fetchGroupEvents does. */
const mapped = async (mutate: (n: Record<string, unknown>[]) => void = () => {}): Promise<MeetupEvent[]> => {
  const body = structuredClone(gql);
  const n = body.data.groupByUrlname.events.edges.map((e: { node: Record<string, unknown> }) => e.node);
  mutate(n);
  const f = vi.fn(async (url: string) =>
    url.includes("oauth2")
      ? new Response(fixture("token.json"), { status: 200 })
      : new Response(JSON.stringify(body), { status: 200 }),
  );
  return fetchGroupEvents("cleveland-ai-data", { fetch: f as unknown as typeof fetch, env: ENV });
};
const ENV = { MEETUP_CLIENT_ID: "id", MEETUP_CLIENT_SECRET: "secret", MEETUP_REFRESH_TOKEN: "refresh" };

type Doc = Record<string, unknown> & { _id: string };

/** An in-memory stand-in for the parts of SanityClient the sync uses. */
function fakeWriter(seed: Doc[] = []) {
  const docs = new Map<string, Doc>(seed.map((d) => [d._id, structuredClone(d)]));
  const calls = { created: 0, patched: 0 };
  const writer = {
    fetch: async () => [...docs.values()].filter((d) => d._type === "event").map((d) => structuredClone(d)),
    transaction: () => {
      const ops: (() => void)[] = [];
      const tx = {
        createIfNotExists(doc: Doc) {
          ops.push(() => {
            if (!docs.has(doc._id)) {
              docs.set(doc._id, structuredClone(doc));
              calls.created++;
            }
          });
          return tx;
        },
        patch(id: string, patch: { set?: Record<string, unknown>; unset?: string[] }) {
          ops.push(() => {
            const d = docs.get(id);
            if (!d) throw new Error(`patch of missing ${id}`);
            Object.assign(d, structuredClone(patch.set ?? {}));
            for (const k of patch.unset ?? []) delete d[k];
            calls.patched++;
          });
          return tx;
        },
        commit: async () => {
          ops.forEach((o) => o());
          return {};
        },
      };
      return tx;
    },
  } as unknown as SanityWriter;
  return { writer, docs, calls };
}

afterEach(() => vi.restoreAllMocks());

describe("fetchGroupEvents", () => {
  it("refreshes the access token with the refresh_token grant, then queries the GraphQL endpoint", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("oauth2") ? new Response(fixture("token.json")) : new Response(fixture("group-events.json")),
    );
    const events = await fetchGroupEvents("cleveland-ai-data", { fetch: f as unknown as typeof fetch, env: ENV });
    const [tokenUrl, tokenInit] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(tokenUrl).toBe("https://secure.meetup.com/oauth2/access");
    const form = new URLSearchParams(String(tokenInit.body));
    expect(form.get("grant_type")).toBe("refresh_token");
    expect(form.get("refresh_token")).toBe("refresh");
    const [gqlUrl, gqlInit] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(gqlUrl).toBe("https://api.meetup.com/gql-ext");
    expect((gqlInit.headers as Record<string, string>).Authorization).toBe("Bearer fixture-access-token");
    expect(events.map((e) => e.id)).toEqual(["310000001", "310000002", "310000003"]);
  });

  it("throws on a GraphQL error response", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("oauth2") ? new Response(fixture("token.json")) : new Response(JSON.stringify({ errors: [{ message: "nope" }] })),
    );
    await expect(fetchGroupEvents("x", { fetch: f as unknown as typeof fetch, env: ENV })).rejects.toThrow(/nope/);
  });
});

describe("toEventDoc", () => {
  it("stores Meetup's local time with the America/New_York offset in effect (DST-correct)", async () => {
    const [oct, nov] = (await mapped()).map(toEventDoc);
    expect(oct.start).toBe("2026-10-29T18:00:00-04:00");
    expect(oct.end).toBe("2026-10-29T20:00:00-04:00");
    expect(nov.start).toBe("2026-11-12T18:00:00-05:00");
  });

  it("converts a UTC or offset-less time to New York wall time", () => {
    const base = { id: "1", title: "t", eventUrl: "https://www.meetup.com/g/events/1/", status: "ACTIVE" } as const;
    expect(toEventDoc({ ...base, dateTime: "2026-11-02T00:00:00Z" }).start).toBe("2026-11-01T19:00:00-05:00");
    expect(toEventDoc({ ...base, dateTime: "2026-11-01T01:30:00Z" }).start).toBe("2026-10-31T21:30:00-04:00");
    expect(toEventDoc({ ...base, dateTime: "2026-11-15T18:00" }).start).toBe("2026-11-15T18:00:00-05:00");
  });

  it("maps venue, rsvpUrl, status, slug and a sanitised description", async () => {
    const [oct] = (await mapped((n) => (n[0].description = '<p onclick="x()">Hi</p><script>alert(1)</script>'))).map(toEventDoc);
    expect(oct).toMatchObject({
      _id: "event-310000001",
      meetupId: "310000001",
      title: "Monthly Social at Happy Dog: October",
      rsvpUrl: "https://www.meetup.com/cleveland-ai-data/events/310000001/",
      meetupStatus: "active",
      venue: { name: "Happy Dog", address: "5801 Detroit Avenue", city: "Cleveland", state: "OH", zip: "44102", lat: 41.4849, lng: -81.7294 },
    });
    expect(oct.slug).toBe("monthly-social-at-happy-dog-october");
    expect(oct.descriptionHtml).toBe("<p>Hi</p>");
  });

  it("turns a plain-text description into paragraphs, and omits a missing venue and end", async () => {
    const docs = (await mapped()).map(toEventDoc);
    expect(docs[0].descriptionHtml).toBe("<p>Come meet people working with AI and data.</p><p>Hot dogs and talk, no slides.</p>");
    expect(docs[2]).not.toHaveProperty("venue");
    expect(docs[2]).not.toHaveProperty("end");
  });

  it("maps CANCELLED to cancelled", async () => {
    const [oct] = (await mapped((n) => (n[0].status = "CANCELLED"))).map(toEventDoc);
    expect(oct.meetupStatus).toBe("cancelled");
  });
});

describe("syncEvents", () => {
  it("creates every event on a first sync", async () => {
    const { writer, docs } = fakeWriter();
    const r = await syncEvents(await mapped(), writer);
    expect(r).toEqual({ created: 3, updated: 0, unchanged: 0 });
    expect([...docs.keys()].sort()).toEqual(["event-310000001", "event-310000002", "event-310000003"]);
  });

  it("is idempotent, and a re-sync with one changed title updates only that one", async () => {
    const { writer, docs } = fakeWriter();
    await syncEvents(await mapped(), writer);
    expect(await syncEvents(await mapped(), writer)).toEqual({ created: 0, updated: 0, unchanged: 3 });
    const r = await syncEvents(await mapped((n) => (n[1].title = "Monthly Social: November (new name)")), writer);
    expect(r).toEqual({ created: 0, updated: 1, unchanged: 2 });
    expect(docs.get("event-310000002")?.title).toBe("Monthly Social: November (new name)");
    expect(docs.size).toBe(3);
  });

  it("keeps people's notes and extra photos when a sync changes the title", async () => {
    const { writer, docs } = fakeWriter();
    await syncEvents(await mapped(), writer);
    const photos = [{ _type: "image", _key: "a", asset: { _type: "reference", _ref: "image-abc-10x10-png" } }];
    Object.assign(docs.get("event-310000001")!, { notes: "Great turnout", extraPhotos: photos, _rev: "r1", seoNote: "mine" });
    await syncEvents(await mapped((n) => (n[0].title = "Renamed")), writer);
    const d = docs.get("event-310000001")!;
    expect(d.title).toBe("Renamed");
    expect(d.notes).toBe("Great turnout");
    expect(d.extraPhotos).toEqual(photos);
    expect(d.seoNote).toBe("mine");
  });

  it("never patches a field outside SYNC_OWNED_FIELDS", async () => {
    expect(SYNC_OWNED_FIELDS).toEqual(
      expect.arrayContaining(["meetupId", "title", "slug", "start", "end", "venue", "venue.state", "venue.zip", "rsvpUrl", "image", "descriptionHtml", "organizer", "organizerUrl", "excerpt", "meetupStatus"]),
    );
    const top = SYNC_OWNED_FIELDS.map((f) => f.split(".")[0]);
    expect(top).not.toContain("notes");
    expect(top).not.toContain("extraPhotos");
  });

  it("projects each owned top-level field once (dotted names map to their parent)", async () => {
    const queries: string[] = [];
    const writer = { fetch: async (q: string) => (queries.push(q), []), transaction: () => ({}) } as unknown as SanityWriter;
    await syncEvents([], writer);
    const projection = /\{(.*)\}$/.exec(queries[0])![1].split(",").map((x) => x.trim());
    expect(projection).not.toContain("venue.state");
    expect(projection.filter((x) => x === "venue")).toHaveLength(1);
    expect(new Set(projection).size).toBe(projection.length);
  });

  it("marks a cancelled event cancelled on the same document", async () => {
    const { writer, docs } = fakeWriter();
    await syncEvents(await mapped(), writer);
    const r = await syncEvents(await mapped((n) => (n[0].status = "CANCELLED")), writer);
    expect(r).toEqual({ created: 0, updated: 1, unchanged: 2 });
    expect(docs.size).toBe(3);
    expect(docs.get("event-310000001")?.meetupStatus).toBe("cancelled");
  });

  it("moves a rescheduled event's start in place", async () => {
    const { writer, docs } = fakeWriter();
    await syncEvents(await mapped(), writer);
    await syncEvents(await mapped((n) => ((n[1].dateTime = "2026-11-13T19:00-05:00"), (n[1].endTime = "2026-11-13T21:00-05:00"))), writer);
    expect(docs.size).toBe(3);
    expect(docs.get("event-310000002")).toMatchObject({ start: "2026-11-13T19:00:00-05:00", end: "2026-11-13T21:00:00-05:00" });
  });

  it("updates a migrated event (same _id scheme) instead of duplicating it, keeping its slug and image", async () => {
    const image = { _type: "image", asset: { _type: "reference", _ref: "image-x-1x1-png" } };
    const { writer, docs } = fakeWriter([
      { _id: "event-310000001", _type: "event", meetupId: "310000001", title: "Old title", slug: { _type: "slug", current: "october-social" }, start: "2026-10-29T18:00:00-04:00", image, meetupStatus: "active" },
    ]);
    const r = await syncEvents(await mapped(), writer);
    expect(r).toEqual({ created: 2, updated: 1, unchanged: 0 });
    const d = docs.get("event-310000001")!;
    expect(d.slug).toEqual({ _type: "slug", current: "october-social" });
    expect(d.image).toEqual(image);
    expect(d.title).toBe("Monthly Social at Happy Dog: October");
  });

  it("gives a new event a unique slug when the title's slug is taken", async () => {
    const { writer, docs } = fakeWriter([
      { _id: "event-wp-1", _type: "event", title: "Online reading group", slug: { _type: "slug", current: "online-reading-group" }, start: "2026-01-01T10:00:00-05:00" },
    ]);
    await syncEvents(await mapped(), writer);
    expect(docs.get("event-310000003")?.slug).toEqual({ _type: "slug", current: "online-reading-group-2" });
  });

  it("drops a venue and end time that Meetup no longer has", async () => {
    const { writer, docs } = fakeWriter();
    await syncEvents(await mapped(), writer);
    await syncEvents(await mapped((n) => ((n[0].venue = null), (n[0].endTime = null))), writer);
    expect(docs.get("event-310000001")).not.toHaveProperty("venue");
    expect(docs.get("event-310000001")).not.toHaveProperty("end");
  });
});

describe("syncEvents from the iCal feed", () => {
  it("never unsets venue, end, organizer, organizerUrl or image that iCal doesn't provide", async () => {
    const { writer, docs } = fakeWriter();
    await syncEvents(await mapped(), writer);
    const image = { _type: "image", asset: { _type: "reference", _ref: "image-x-1x1-png" } };
    Object.assign(docs.get("event-310000001")!, { image });
    const bare = (await mapped((n) => n.forEach((x) => ((x.venue = null), (x.endTime = null), (x.group = null))))).map((e) => ({ ...e }));
    const r = await syncEvents(bare, writer, { source: "ical" });
    expect(r).toEqual({ created: 0, updated: 0, unchanged: 3 });
    const d = docs.get("event-310000001")!;
    expect(d.venue).toBeDefined();
    expect(d.end).toBeDefined();
    expect(d.organizer).toBeDefined();
    expect(d.organizerUrl).toBeDefined();
    expect(d.image).toEqual(image);
    // The same data from GraphQL does remove the venue and end.
    await syncEvents(bare, writer);
    expect(docs.get("event-310000001")).not.toHaveProperty("venue");
  });
});

describe("refresh token store", () => {
  const run = async (store?: { get(): Promise<string | undefined>; set(t: string): Promise<void> }, token = fixture("token.json")) => {
    const seen: string[] = [];
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("oauth2")) {
        seen.push(new URLSearchParams(String(init?.body)).get("refresh_token")!);
        return new Response(token);
      }
      return new Response(fixture("group-events.json"));
    });
    await fetchGroupEvents("cleveland-ai-data", { fetch: f as unknown as typeof fetch, env: ENV, tokenStore: store });
    return seen;
  };

  it("uses the stored token in preference to the env one, and writes the rotated token", async () => {
    const set = vi.fn(async () => {});
    expect(await run({ get: async () => "stored-token", set })).toEqual(["stored-token"]);
    expect(set).toHaveBeenCalledWith("fixture-next-refresh-token");
  });

  it("falls back to the env token when the store is empty", async () => {
    const set = vi.fn(async () => {});
    expect(await run({ get: async () => undefined, set })).toEqual(["refresh"]);
    expect(set).toHaveBeenCalledOnce();
  });

  it("saves the new token before the GraphQL call is made", async () => {
    const order: string[] = [];
    const f = vi.fn(async (url: string) => {
      order.push(url.includes("oauth2") ? "token" : "graphql");
      return new Response(url.includes("oauth2") ? fixture("token.json") : fixture("group-events.json"));
    });
    const store = { get: async () => undefined, set: async () => void order.push("store") };
    await fetchGroupEvents("g", { fetch: f as unknown as typeof fetch, env: ENV, tokenStore: store });
    expect(order).toEqual(["token", "store", "graphql"]);
  });

  it("does not write when the response has no refresh_token", async () => {
    const set = vi.fn(async () => {});
    await run({ get: async () => undefined, set }, JSON.stringify({ access_token: "a", token_type: "bearer", expires_in: 3600 }));
    expect(set).not.toHaveBeenCalled();
  });

  it("with no store, behaves as before (env token, nothing saved)", async () => {
    expect(await run()).toEqual(["refresh"]);
  });

  it("the Sanity store reads and replaces the private secrets.meetupSync document", async () => {
    const calls: unknown[] = [];
    const client = {
      fetch: async (q: string, params: unknown) => (calls.push([q, params]), "from-sanity"),
      createOrReplace: async (d: unknown) => void calls.push(d),
    };
    const store = createSanityTokenStore(client as never);
    expect(await store.get()).toBe("from-sanity");
    await store.set("new");
    expect(calls[1]).toEqual({ _id: "secrets.meetupSync", _type: "meetupSyncState", refreshToken: "new" });
    expect(JSON.stringify(calls[0])).toContain("secrets.meetupSync");
  });
});

describe("iCal fallback", () => {
  it("parses the recorded feed into the same events as GraphQL", async () => {
    const ical = parseIcal(fixture("group.ics"));
    expect(ical.map((e) => e.id)).toEqual(["310000001", "310000002", "310000003"]);
    const [a, b, c] = ical.map(toEventDoc);
    const [ga, gb, gc] = (await mapped()).map(toEventDoc);
    expect(a.start).toBe("2026-10-29T18:00:00-04:00");
    expect(a.venue).toMatchObject({ name: "Happy Dog", address: "5801 Detroit Avenue", city: "Cleveland", state: "OH", zip: "44102", lat: 41.4849, lng: -81.7294 });
    expect(a.descriptionHtml).toBe(ga.descriptionHtml);
    expect(b.start).toBe(gb.start);
    expect(c.start).toBe(gc.start);
    expect(c.start).toBe("2026-11-18T19:00:00-05:00");
    expect(a.rsvpUrl).toBe(ga.rsvpUrl);
  });

  it("reads STATUS:CANCELLED", () => {
    const ics = fixture("group.ics").replace("STATUS:CONFIRMED", "STATUS:CANCELLED");
    expect(toEventDoc(parseIcal(ics)[0]).meetupStatus).toBe("cancelled");
  });

  it("when the GraphQL call fails, the fixture feed is parsed and the sync still runs", async () => {
    const f = vi.fn(async (url: string) => {
      if (url.includes("oauth2")) return new Response("denied", { status: 401 });
      if (url.endsWith("/events/ical/")) return new Response(fixture("group.ics"), { status: 200 });
      throw new Error(`unexpected ${url}`);
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await fetchEventsWithFallback("cleveland-ai-data", { fetch: f as unknown as typeof fetch, env: ENV });
    expect(r.source).toBe("ical");
    expect(f.mock.calls.map((c) => c[0])).toContain("https://www.meetup.com/cleveland-ai-data/events/ical/");
    expect(err).toHaveBeenCalled();
    const { writer, docs } = fakeWriter();
    expect(await syncEvents(r.events, writer)).toEqual({ created: 3, updated: 0, unchanged: 0 });
    expect(docs.size).toBe(3);
  });

  it("throws when both sources fail", async () => {
    const f = vi.fn(async () => new Response("no", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(fetchEventsWithFallback("x", { fetch: f as unknown as typeof fetch, env: ENV })).rejects.toThrow();
  });
});

describe("cron route", () => {
  const call = async (headers: Record<string, string> = {}) => {
    const { GET } = await import("@/app/api/cron/meetup-sync/route");
    return GET(new Request("http://localhost/api/cron/meetup-sync", { headers }));
  };

  it("answers 401 without the secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await call()).status).toBe(401);
    expect((await call({ Authorization: "Bearer wrong" })).status).toBe(401);
    vi.unstubAllEnvs();
  });

  it("answers 401 when CRON_SECRET is not set, even for an empty bearer", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call({ Authorization: "Bearer " })).status).toBe(401);
    vi.unstubAllEnvs();
  });

  it("refuses to run against fixtures or a placeholder project, without calling Sanity", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await call({ Authorization: "Bearer s3cret" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/fixtures|Sanity/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
