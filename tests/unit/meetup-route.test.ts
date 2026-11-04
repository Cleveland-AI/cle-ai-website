import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = (n: string) => readFileSync(`tests/fixtures/meetup/${n}`, "utf8");

const store = new Map<string, Record<string, unknown>>();
const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a) }));
vi.mock("@/sanity/env", () => ({ PLACEHOLDER_PROJECT_ID: "placeholder", projectId: "realproj", dataset: "test", apiVersion: "2026-11-01" }));
vi.mock("@sanity/client", () => ({
  createClient: () => ({
    fetch: async (q: string) =>
      q.includes("secrets.meetupSync") ? (store.get("secrets.meetupSync")?.refreshToken ?? null) : [...store.values()].filter((d) => d._type === "event"),
    createOrReplace: async (d: { _id: string }) => void store.set(d._id, d),
    transaction: () => {
      const ops: (() => void)[] = [];
      const tx = {
        createIfNotExists(d: { _id: string }) {
          ops.push(() => void (store.has(d._id) || store.set(d._id, d)));
          return tx;
        },
        patch() {
          return tx;
        },
        commit: async () => void ops.forEach((o) => o()),
      };
      return tx;
    },
  }),
}));

beforeEach(() => {
  store.clear();
  revalidateTag.mockClear();
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubEnv("CONTENT_SOURCE", "sanity");
  vi.stubEnv("SANITY_API_WRITE_TOKEN", "test-write-token");
  vi.stubEnv("MEETUP_CLIENT_ID", "id");
  vi.stubEnv("MEETUP_CLIENT_SECRET", "secret");
  vi.stubEnv("MEETUP_REFRESH_TOKEN", "env-refresh");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const get = async () => {
  const { GET } = await import("@/app/api/cron/meetup-sync/route");
  return GET(new Request("http://localhost/api/cron/meetup-sync", { headers: { Authorization: "Bearer s3cret" } }));
};

describe("cron route, authorised", () => {
  it("syncs, persists the rotated refresh token, revalidates and returns counts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("oauth2") ? new Response(fixture("token.json")) : new Response(fixture("group-events.json")),
    );
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: "graphql", fetched: 3, created: 3, updated: 0, unchanged: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("sanity", "max");
    expect(store.get("secrets.meetupSync")).toMatchObject({ _type: "meetupSyncState", refreshToken: "fixture-next-refresh-token" });
    expect([...store.keys()].filter((k) => k.startsWith("event.")).length).toBe(3);
  });

  it("reports source ical (and logs an error) when GraphQL fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("oauth2") ? new Response("no", { status: 401 }) : new Response(fixture("group.ics")),
    );
    const body = await (await get()).json();
    expect(body).toMatchObject({ source: "ical", created: 3 });
    expect(err).toHaveBeenCalled();
  });

  it("does not revalidate when nothing changed", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("oauth2") ? new Response(fixture("token.json")) : new Response(fixture("group-events.json")),
    );
    await get();
    revalidateTag.mockClear();
    const body = await (await get()).json();
    expect(body).toMatchObject({ created: 0, updated: 0, unchanged: 3 });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
