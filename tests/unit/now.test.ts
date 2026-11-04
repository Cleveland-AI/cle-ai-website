import { afterEach, describe, expect, it, vi } from "vitest";
import { pinnedNow } from "@/lib/now";

afterEach(() => vi.unstubAllEnvs());

describe("pinnedNow / siteNow's test clock", () => {
  it("is FIXTURES_NOW with the fixtures source", () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_NOW", "2026-10-26T18:00:00-04:00");
    expect(pinnedNow()?.toISOString()).toBe("2026-10-26T22:00:00.000Z");
  });

  it("is ignored outside the fixtures source, so production's clock can't freeze", () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("FIXTURES_NOW", "2026-10-26T18:00:00-04:00");
    expect(pinnedNow()).toBeNull();
    vi.stubEnv("CONTENT_SOURCE", "");
    expect(pinnedNow()).toBeNull();
  });

  it("is ignored on Vercel even with the fixtures source (I3, R30)", () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_NOW", "2026-10-26T18:00:00-04:00");
    vi.stubEnv("VERCEL", "1");
    expect(pinnedNow()).toBeNull();
  });

  it("is null when unpinned and refuses a malformed value", () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_NOW", "");
    expect(pinnedNow()).toBeNull();
    vi.stubEnv("FIXTURES_NOW", "next tuesday");
    expect(() => pinnedNow()).toThrow(/FIXTURES_NOW/);
  });
});
