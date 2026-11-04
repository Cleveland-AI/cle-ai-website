import { describe, expect, it, vi } from "vitest";

const draft = { isEnabled: false };
vi.mock("next/headers", () => ({ draftMode: async () => draft }));

describe("the draft-mode banner", () => {
  it("renders nothing unless draft mode is on", async () => {
    const { DraftBanner } = await import("@/components/DraftBanner");
    draft.isEnabled = false;
    expect(await DraftBanner()).toBeNull();
    draft.isEnabled = true;
    expect(await DraftBanner()).not.toBeNull();
  });

  it("is hidden when framed (Studio's Presentation tool) and keeps the redirect in the href", async () => {
    const { shouldShowBanner } = await import("@/components/DraftBanner.client");
    const top = {};
    expect(shouldShowBanner({ top } as never, top as never)).toBe(true);
    expect(shouldShowBanner({ top: {} } as never, {} as never)).toBe(false);
    expect(shouldShowBanner({ get top(): never { throw new Error("cross-origin"); } } as never, {} as never)).toBe(false);
  });

  it("exits through /api/draft/disable and comes back to the same page", async () => {
    const { exitPreviewHref } = await import("@/components/DraftBanner.client");
    expect(exitPreviewHref("/blog/a post", "?x=1")).toBe("/api/draft/disable?redirect=%2Fblog%2Fa%20post%3Fx%3D1");
    expect(exitPreviewHref("/", "")).toBe("/api/draft/disable?redirect=%2F");
  });
});
