import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/content/client";
import { VISIBLE_NOW } from "@/lib/content/filters";

const NOW = "2026-11-03T12:00:00.000Z";
const minute = 60_000;
const at = (offset: number) => new Date(Date.parse(NOW) + offset).toISOString();

const docs = [
  { _id: "post-future", _type: "post", title: "Future", publishOn: at(minute) },
  { _id: "post-past", _type: "post", title: "Past", publishOn: at(-minute) },
  { _id: "post-plain", _type: "post", title: "Plain" },
];

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cle-content-"));
  const file = join(dir, "dataset.ndjson");
  writeFileSync(file, docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
  vi.stubEnv("CONTENT_SOURCE", "fixtures");
  vi.stubEnv("FIXTURES_PATH", file);
  vi.stubEnv("FIXTURES_NOW", NOW);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const visibleIds = async () =>
  (await query<{ _id: string }[]>(`*[_type == "post" && ${VISIBLE_NOW}] | order(_id)`)).map((d) => d._id);

describe("query() over fixtures with VISIBLE_NOW", () => {
  it("excludes a post whose publishOn is one minute after now", async () => {
    expect(await visibleIds()).not.toContain("post-future");
  });

  it("includes a post whose publishOn is one minute before now", async () => {
    expect(await visibleIds()).toContain("post-past");
  });

  it("includes a post with no publishOn", async () => {
    expect(await visibleIds()).toContain("post-plain");
  });

  it("reads FIXTURES_NOW on every call, so a later now() shows the scheduled post", async () => {
    expect(await visibleIds()).toEqual(["post-past", "post-plain"]);
    vi.stubEnv("FIXTURES_NOW", at(2 * minute));
    expect(await visibleIds()).toEqual(["post-future", "post-past", "post-plain"]);
  });

  it("passes params through", async () => {
    const title = await query<string | null>(`*[_id == $id][0].title`, { id: "post-past" });
    expect(title).toBe("Past");
  });

  it("treats a missing fixtures file as an empty dataset and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("FIXTURES_PATH", join(dir, "nope.ndjson"));
    expect(await query(`*[_type == "post"]`)).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("nope.ndjson");
  });
});

describe("query() without a Sanity project", () => {
  it("refuses to call Sanity with the placeholder project id", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    await expect(query(`*[_type == "post"]`)).rejects.toThrow(/no Sanity project configured/);
  });
});

describe("VISIBLE_NOW", () => {
  it("is the publishOn filter", () => {
    expect(VISIBLE_NOW).toBe("(!defined(publishOn) || publishOn <= now())");
  });
});
