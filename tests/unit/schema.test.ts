import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { groupProblems, validateSchema } from "@sanity/schema/_internal";
import { describe, expect, it } from "vitest";
import { schemaTypes } from "@/sanity/schemas";
import { postTemplates } from "@/sanity/templates";

const blocksDir = resolve(__dirname, "../../theme-source/cle-ai-theme/blocks");

type Attr = { type?: string; default?: unknown };
type Block = { name: string; attributes?: Record<string, Attr> };
type Field = { name: string; type: string; initialValue?: unknown };
type TypeDef = { name: string; type: string; fields?: Field[]; of?: { type: string; name?: string }[] };

const blocks: Block[] = readdirSync(blocksDir).map((dir) =>
  JSON.parse(readFileSync(resolve(blocksDir, dir, "block.json"), "utf8")),
);

/** `cle/sponsor-builder` → `cleSponsorBuilder`. */
const typeName = (block: string) =>
  "cle" +
  block
    .replace(/^cle\//, "")
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

/** Array items carry Sanity `_key`s and `_type`s; block.json defaults don't. */
const withoutKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== "_key" && k !== "_type")
        .map(([k, v]) => [k, withoutKeys(v)]),
    );
  }
  return value;
};

const types = schemaTypes as unknown as TypeDef[];
const byName = new Map(types.map((t) => [t.name, t]));

describe("block types follow the naming rule", () => {
  it("finds all 22 theme blocks", () => {
    expect(blocks).toHaveLength(22);
  });

  for (const block of blocks) {
    const name = typeName(block.name);

    describe(name, () => {
      it("is an object type", () => {
        expect(byName.get(name)?.type, name).toBe("object");
      });

      for (const [attr, def] of Object.entries(block.attributes ?? {})) {
        it(`has field ${attr}${"default" in def ? " with its default" : ""}`, () => {
          const field = byName.get(name)?.fields?.find((f) => f.name === attr);
          expect(field, `${name}.${attr}`).toBeDefined();
          if ("default" in def && def.default !== null) {
            expect(withoutKeys(field?.initialValue), `${name}.${attr}`).toEqual(def.default);
          }
        });
      }
    });
  }
});

describe("richBody", () => {
  const members = (byName.get("richBody")?.of ?? []).map((m) => m.name ?? m.type);

  it("accepts every cle block type", () => {
    for (const block of blocks) expect(members, typeName(block.name)).toContain(typeName(block.name));
  });

  it("accepts the core objects", () => {
    for (const t of [
      "block",
      "section",
      "columns",
      "buttons",
      "figure",
      "image",
      "table",
      "quote",
      "separator",
      "spacer",
      "queryList",
      "rawHtml",
    ]) {
      expect(members).toContain(t);
    }
  });
});

describe("schema", () => {
  it("has the document types", () => {
    for (const t of [
      "siteSettings",
      "homepage",
      "page",
      "post",
      "person",
      "category",
      "event",
      "submission",
      "redirect",
    ]) {
      expect(byName.get(t)?.type, t).toBe("document");
    }
  });

  it("validates with no errors", () => {
    const problems = groupProblems(validateSchema(schemaTypes).getTypes());
    const errors = problems.flatMap((group) =>
      group.problems
        .filter((p) => p.severity === "error")
        .map((p) => `${group.path.map((seg) => ("name" in seg ? seg.name : "")).join(".")}: ${p.message}`),
    );
    expect(errors).toEqual([]);
  });
});

describe("New post templates", () => {
  it("offers one starter per kind, each pre-filling kind and a body", () => {
    expect(postTemplates.map((t) => t.id)).toEqual([
      "post-recap",
      "post-newsletter",
      "post-article",
      "post-announcement",
    ]);
    for (const t of postTemplates) {
      const value = (t.value as () => { kind: string; body: { _type: string; _key: string }[] })();
      expect(t.schemaType).toBe("post");
      expect(`post-${value.kind}`).toBe(t.id);
      expect(value.body.length).toBeGreaterThan(0);
      for (const item of value.body) expect(item._key).toBeTruthy();
    }
  });

  it("gives the recap a write-up section, a photo gallery section and a quote", () => {
    const recap = postTemplates.find((t) => t.id === "post-recap")!;
    const body = (recap.value as () => { body: { _type: string; className?: string }[] })().body;
    expect(body.map((b) => [b._type, b.className])).toEqual([
      ["section", "cle-recap-writeup"],
      ["section", "cle-recap-gallery"],
      ["quote", undefined],
    ]);
  });
});
