// Final review C1: Sanity hides any document whose _id contains a dot from unauthenticated queries,
// and the public site's client has no token. So every content id must be dot-free, and only the two
// private kinds (secrets.meetupSync, submission.<uuid>) keep a dot.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { query } from "@/lib/content/client";
import { contentId, isHiddenPublicId } from "@/lib/content/ids";
import { toEventDoc } from "@/lib/meetup/map";
import { TOKEN_DOC_ID } from "@/lib/meetup/token-store";

type Doc = { _id: string; _type: string; [k: string]: unknown };
const read = (f: string): Doc[] =>
  readFileSync(f, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

const FIXTURES = ["tests/fixtures/dataset.ndjson", "tests/fixtures/extra.ndjson", "tests/fixtures/redirects-fixture.ndjson"];

/** Every `_ref` anywhere in a value. */
function refs(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => refs(x, out));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o._ref === "string") out.push(o._ref);
    Object.values(o).forEach((x) => refs(x, out));
  }
  return out;
}

afterEach(() => vi.unstubAllEnvs());

describe("public document ids are dot-free (C1)", () => {
  it.each(FIXTURES)("%s: every non-private id", (file) => {
    const bad = read(file).filter((d) => isHiddenPublicId(d._id, d._type)).map((d) => d._id);
    expect(bad).toEqual([]);
  });

  it.each(FIXTURES)("%s: every reference resolves to a dot-free id", (file) => {
    const docs = read(file);
    const bad = docs.flatMap((d) => refs(d)).filter((r) => r.replace(/^drafts\./, "").includes("."));
    expect(bad).toEqual([]);
  });

  it("references in the dataset point at documents that exist", () => {
    const docs = read("tests/fixtures/dataset.ndjson");
    const ids = new Set(docs.map((d) => d._id));
    const missing = docs.flatMap((d) => refs(d)).filter((r) => !r.startsWith("image-") && !ids.has(r));
    expect(missing).toEqual([]);
  });

  it("contentId never produces a dot", () => {
    for (const key of ["about", "wp-140", "1219926102", "a.b.c", "x/y z", "émile"]) {
      for (const type of ["page", "post", "person", "category", "event"] as const) {
        const id = contentId(type, key);
        expect(id).not.toContain(".");
        expect(id.startsWith(`${type}-`)).toBe(true);
        expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    }
    expect(contentId("event", "1219926102")).toBe("event-1219926102");
  });

  it("the Meetup sync writes dot-free event ids", () => {
    const doc = toEventDoc({ id: "310000001", title: "Monthly social", dateTime: "2026-11-12T18:00:00-05:00", eventUrl: "https://www.meetup.com/x/events/310000001/", status: "ACTIVE" });
    expect(doc._id).toBe("event-310000001");
    expect(isHiddenPublicId(doc._id, doc._type)).toBe(false);
  });

  it("the migration and the sync build ids with contentId, never a dotted template", () => {
    for (const file of ["scripts/migrate-wp/index.ts", "src/lib/meetup/map.ts"]) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/_id:\s*[`"'](page|post|person|category|event|redirect)\./);
      expect(src).not.toMatch(/drafts\.(page|post)\./);
    }
  });

  it("the private kinds stay dotted on purpose", () => {
    expect(TOKEN_DOC_ID).toBe("secrets.meetupSync");
    expect(readFileSync("src/lib/forms/handle.ts", "utf8")).toContain("_id: `submission.${key}`");
    expect(isHiddenPublicId(TOKEN_DOC_ID, "meetupSyncState")).toBe(false);
    expect(isHiddenPublicId("submission.abc", "submission")).toBe(false);
    expect(isHiddenPublicId("drafts.recap-x", "post")).toBe(false);
    expect(isHiddenPublicId("post.x", "post")).toBe(true);
  });
});

describe("fixtures mode rejects dotted public ids", () => {
  const withDataset = (docs: Doc[]) => {
    const dir = mkdtempSync(join(tmpdir(), "cle-ids-"));
    const file = join(dir, "dataset.ndjson");
    writeFileSync(file, docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("FIXTURES_PATH", file);
    vi.stubEnv("FIXTURES_NOW", "2026-11-03T12:00:00Z");
  };

  it("throws on a page with a dotted id", async () => {
    withDataset([{ _id: "page.about", _type: "page", title: "About" }]);
    await expect(query(`*[_type == "page"]`)).rejects.toThrow(/page\.about/);
  });

  it("accepts dot-free content plus the private kinds", async () => {
    withDataset([
      { _id: "page-about", _type: "page", title: "About" },
      { _id: "drafts.page-privacy", _type: "page", title: "Privacy" },
      { _id: "secrets.meetupSync", _type: "meetupSyncState" },
      { _id: "submission.1234", _type: "submission" },
    ]);
    expect(await query(`count(*)`)).toBe(4);
  });
});
