import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchSpy = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ ok: true }));
const configs: Record<string, unknown>[] = [];
const draft = { isEnabled: false };

vi.mock("next/headers", () => ({ draftMode: async () => draft }));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/sanity/env", () => ({ PLACEHOLDER_PROJECT_ID: "placeholder", projectId: "realproj", dataset: "test", apiVersion: "2026-11-01" }));
vi.mock("next-sanity", () => {
  const make = (cfg: Record<string, unknown>) => ({
    withConfig: (extra: Record<string, unknown>) => make({ ...cfg, ...extra }),
    fetch: async (...a: unknown[]) => {
      configs.push(cfg);
      return fetchSpy(...a);
    },
  });
  return { createClient: (cfg: Record<string, unknown>) => make(cfg), defineQuery: (q: string) => q };
});

beforeEach(() => {
  configs.length = 0;
  fetchSpy.mockClear();
  vi.stubEnv("CONTENT_SOURCE", "sanity");
  vi.stubEnv("SANITY_API_DRAFTS_TOKEN", "drafts-token");
});
afterEach(() => vi.unstubAllEnvs());

describe("query() and draft mode", () => {
  it("draft mode off: the published perspective, no token", async () => {
    draft.isEnabled = false;
    const { query } = await import("@/lib/content/client");
    await query("*[_type == 'page']");
    expect(configs[0]).toMatchObject({ perspective: "published" });
    expect(configs[0].token).toBeUndefined();
  });

  it("draft mode on: the drafts perspective with the token, uncached", async () => {
    draft.isEnabled = true;
    const { query } = await import("@/lib/content/client");
    await query("*[_type == 'page']");
    expect(configs[0]).toMatchObject({ perspective: "drafts", token: "drafts-token", useCdn: false });
    expect(fetchSpy.mock.calls[0][2]).toMatchObject({ cache: "no-store" });
  });
});
