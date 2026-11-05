import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";
import { loadSanityRedirects, resetSanityRedirectsCache } from "@/lib/redirects/sanity";

const fetchMock = vi.fn();
vi.mock("next-sanity", () => ({ createClient: () => ({ fetch: fetchMock }) }));
vi.mock("@/sanity/env", () => ({ apiVersion: "x", dataset: "production", projectId: "realproject", PLACEHOLDER_PROJECT_ID: "cleaiplaceholder" }));

const hit = async (path: string) => proxy(new NextRequest(new URL(path, "https://cle-ai.com")));
const fixtureEnv = () => {
  vi.stubEnv("CONTENT_SOURCE", "fixtures");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("FIXTURES_PATH", "tests/fixtures/redirects-fixture.ndjson");
};

beforeEach(() => {
  fetchMock.mockReset(); // braces: a returned mock would be run by vitest as a teardown
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetSanityRedirectsCache();
});

describe("proxy", () => {
  it("answers 308 with the final Location", async () => {
    fixtureEnv();
    const res = await hit("/index.php/about/");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://cle-ai.com/about");
  });
  it("sees / with ?p= and /events with ?query-2-page=", async () => {
    fixtureEnv();
    expect((await hit("/?p=10")).headers.get("location")).toBe("https://cle-ai.com/blog/what-we-learned-running-183-meetups");
    expect((await hit("/events?query-2-page=2")).headers.get("location")).toBe("https://cle-ai.com/events/page/2");
  });
  it("sends the newsletter to Substack", async () => {
    fixtureEnv();
    const res = await hit("/newsletter");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://timcleaidata.substack.com/");
  });
  it("applies a redirect document", async () => {
    fixtureEnv();
    expect((await hit("/fixture-old")).headers.get("location")).toBe("https://cle-ai.com/events");
  });
  it("passes normal pages through", async () => {
    fixtureEnv();
    const res = await hit("/about");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
  it("matcher skips _next, studio, api, assets and fonts but not / or wp-content", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    for (const p of ["/_next/static/x.js", "/studio", "/studio/desk", "/api/forms", "/assets/js/a.js", "/fonts/a.woff2", "/migrated/a.png"]) expect(re.test(p), p).toBe(false);
    for (const p of ["/", "/about", "/events", "/wp-content/uploads/2026/09/scene.webp", "/index.php/feed/"]) expect(re.test(p), p).toBe(true);
  });
});

describe("loadSanityRedirects: fixtures", () => {
  it("reads the fixtures file directly, with no clock, and drops unsafe entries", async () => {
    fixtureEnv();
    expect(await loadSanityRedirects()).toEqual([{ from: "/fixture-old", to: "/events" }]);
  });
  it("never reads fixtures on Vercel (R30)", async () => {
    fixtureEnv();
    vi.stubEnv("VERCEL", "1");
    expect(await loadSanityRedirects()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // went to (mocked) Sanity instead
  });
  it("caches within the TTL and returns the same array", async () => {
    fixtureEnv();
    const a = await loadSanityRedirects();
    expect(await loadSanityRedirects()).toBe(a);
  });
});

describe("loadSanityRedirects: Sanity", () => {
  const live = () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("VERCEL", "");
  };
  it("a rejecting fetch resolves to [] and logs once per failure window", async () => {
    live();
    vi.useFakeTimers();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation(async () => { throw new Error("boom"); });
    expect(await loadSanityRedirects()).toEqual([]);
    expect(await loadSanityRedirects()).toEqual([]);
    expect(await loadSanityRedirects()).toEqual([]); // inside the TTL: no new call, no new log
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(61_000);
    await loadSanityRedirects(); // refresh in the background, fails again
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(log).toHaveBeenCalledTimes(1);
  });
  it("a hanging fetch is cut off within the bound", async () => {
    live();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const p = loadSanityRedirects();
    await vi.advanceTimersByTimeAsync(1500);
    expect(await p).toEqual([]);
  });
  it("passes an abort signal to the client", async () => {
    live();
    fetchMock.mockResolvedValue([]);
    await loadSanityRedirects();
    expect(fetchMock.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
  });
  it("serves the stale list at once when the TTL has passed, and refreshes in the background once", async () => {
    live();
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce([{ from: "/a", to: "/events" }]);
    expect(await loadSanityRedirects()).toEqual([{ from: "/a", to: "/events" }]);
    await vi.advanceTimersByTimeAsync(61_000);
    let release!: (v: unknown) => void;
    fetchMock.mockImplementation(() => new Promise((res) => (release = res)));
    const stale = await loadSanityRedirects(); // does not wait for the refresh
    expect(stale).toEqual([{ from: "/a", to: "/events" }]);
    await loadSanityRedirects();
    await loadSanityRedirects();
    expect(fetchMock).toHaveBeenCalledTimes(2); // a single in-flight refresh
    release([{ from: "/b", to: "/events" }]);
    await vi.advanceTimersByTimeAsync(1);
    expect(await loadSanityRedirects()).toEqual([{ from: "/b", to: "/events" }]);
  });
  it("a failed refresh keeps the stale list", async () => {
    live();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce([{ from: "/a", to: "/events" }]);
    await loadSanityRedirects();
    await vi.advanceTimersByTimeAsync(61_000);
    fetchMock.mockImplementation(async () => { throw new Error("down"); });
    await loadSanityRedirects();
    await vi.advanceTimersByTimeAsync(10);
    expect(await loadSanityRedirects()).toEqual([{ from: "/a", to: "/events" }]);
  });
});
