import { NextRequest } from "next/server";
import { encodeSignatureHeader } from "@sanity/webhook";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const draft = { isEnabled: false, enable: vi.fn(), disable: vi.fn() };
vi.mock("next/cache", () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a) }));
vi.mock("next/headers", () => ({ draftMode: async () => draft, cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { to });
  },
}));

beforeEach(() => {
  revalidateTag.mockReset();
  draft.disable.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

const SECRET = "whsec-test";
const BODY = JSON.stringify({ _type: "post", _id: "post-a", slug: { current: "a" } });

async function hook(opts: { secret?: string | null; sign?: boolean | "wrong"; body?: string } = {}) {
  const { POST } = await import("@/app/api/revalidate/route");
  const body = opts.body ?? BODY;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.sign !== false) headers["sanity-webhook-signature"] = await encodeSignatureHeader(body, Date.now(), opts.sign === "wrong" ? "other-secret" : SECRET);
  return POST(new NextRequest("http://localhost/api/revalidate", { method: "POST", headers, body }));
}

describe("/api/revalidate (R35)", () => {
  it("fails closed when SANITY_REVALIDATE_SECRET is not set", async () => {
    vi.stubEnv("SANITY_REVALIDATE_SECRET", "");
    const res = await hook();
    expect(res.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a missing signature and a wrong one with 401", async () => {
    vi.stubEnv("SANITY_REVALIDATE_SECRET", SECRET);
    expect((await hook({ sign: false })).status).toBe(401);
    expect((await hook({ sign: "wrong" })).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates the sanity tag for a validly signed body", async () => {
    vi.stubEnv("SANITY_REVALIDATE_SECRET", SECRET);
    const res = await hook();
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("sanity", { expire: 0 });
  }, 15_000);

  it("ignores form submissions, the sync's private state, drafts and assets (I4)", async () => {
    vi.stubEnv("SANITY_REVALIDATE_SECRET", SECRET);
    for (const doc of [
      { _type: "submission", _id: "submission.1f0e" },
      { _type: "meetupSyncState", _id: "secrets.meetupSync" },
      { _type: "post", _id: "drafts.post-a" },
      { _type: "sanity.imageAsset", _id: "image-abc-1x1-png" },
    ]) {
      const res = await hook({ body: JSON.stringify(doc) });
      expect(res.status, doc._id).toBe(200);
      expect(await res.json(), doc._id).toEqual({ revalidated: false, ignored: doc._type });
    }
    expect(revalidateTag).not.toHaveBeenCalled();
  }, 15_000);
});

describe("/api/draft", () => {
  it("is a 404 in fixtures mode, enable and disable alike", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    const enable = await import("@/app/api/draft/route");
    const disable = await import("@/app/api/draft/disable/route");
    expect((await enable.GET(new Request("http://localhost/api/draft?sanity-preview-secret=x"))).status).toBe(404);
    expect((await disable.GET(new Request("http://localhost/api/draft/disable"))).status).toBe(404);
  });

  it("fails closed without a drafts token", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("SANITY_API_DRAFTS_TOKEN", "");
    const { GET } = await import("@/app/api/draft/route");
    expect((await GET(new Request("http://localhost/api/draft?sanity-preview-secret=x"))).status).toBe(503);
  });

  it("rejects a request with no preview secret", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("SANITY_API_DRAFTS_TOKEN", "tok");
    const { GET } = await import("@/app/api/draft/route");
    expect((await GET(new Request("http://localhost/api/draft"))).status).toBe(401);
    expect(draft.enable).not.toHaveBeenCalled();
  });

  it("disable turns draft mode off and goes only to a path on this site", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    const { GET } = await import("@/app/api/draft/disable/route");
    const go = async (redirect: string) => {
      draft.disable.mockClear();
      const err = await GET(new Request(`http://localhost/api/draft/disable?redirect=${redirect}`)).then(
        () => ({ to: "(returned)" }),
        (e) => e as { to: string },
      );
      expect(draft.disable).toHaveBeenCalled();
      return err.to;
    };
    expect(await go(encodeURIComponent("/blog/x?y#z"))).toBe("/blog/x?y#z");
    expect(await go("")).toBe("/");
    // Each of these would leave the site: a tab inside "//" (browsers strip it), backslashes, protocol-relative,
    // absolute and script URLs.
    for (const bad of ["/%09/evil.example", "/%5C%5Cevil", "%5C%5Cevil", "//evil", "https://evil.example", "javascript:alert(1)", "/%0A/evil.example", "http://localhost.evil.example/"]) {
      expect(await go(bad), bad).toBe("/");
    }
    // Same origin, but the path normalizes to one starting "//", which a Location header makes protocol-relative.
    for (const sneaky of ["/.//evil.example", "/x/..//evil.example", "/%2E//evil.example", "http://localhost:3000//evil.example", "http://localhost//evil.example", "/\\/evil.example", "/%5C/evil.example"]) {
      const to = await go(encodeURIComponent(sneaky));
      expect(to, sneaky).toMatch(/^\/(?![/\\])/);
      expect(to, sneaky).not.toMatch(/^\/[/\\]/);
    }
    // Same origin, spelled out: fine, and reduced to a path.
    expect(await go(encodeURIComponent("http://localhost/about?a=1"))).toBe("/about?a=1");
  });
});
