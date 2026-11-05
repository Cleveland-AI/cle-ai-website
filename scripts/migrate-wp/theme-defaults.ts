// Theme blocks (cle/<name>) -> richBody objects (cle<Pascal>), by the naming rule: attribute names
// from block.json, and attributes absent from the saved markup take block.json's defaults (read
// from the repo at run time, so the newest team, bios and milestones win). Array items get the
// `_type` and `_key` the Sanity schema expects.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockTypes } from "../../src/sanity/schemas/blocks";
import { objectTypes } from "../../src/sanity/schemas/objects";

export const THEME_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../theme-source/cle-ai-theme");

type BlockJson = {
  name: string;
  attributes?: Record<string, { type?: string; default?: unknown }>;
  supports?: Record<string, unknown>;
};

// Sanity field definitions, loosely typed: we only read name/type/of/fields.
type FieldDef = { name: string; type: string; of?: MemberDef[]; fields?: FieldDef[] };
type MemberDef = { name?: string; type: string; fields?: FieldDef[] };
type TypeDef = { name: string; type: string; fields?: FieldDef[] };

const schemaTypes = new Map<string, TypeDef>(
  [...blockTypes, ...objectTypes].map((t) => [t.name, t as unknown as TypeDef]),
);

let blockJsonCache: { dir: string; blocks: Map<string, BlockJson> } | undefined;

/** block.json for every theme block, keyed by block name (`cle/team`). */
export function themeBlocks(themeDir = THEME_DIR): Map<string, BlockJson> {
  if (blockJsonCache?.dir === themeDir) return blockJsonCache.blocks;
  const blocks = new Map<string, BlockJson>();
  for (const dir of readdirSync(join(themeDir, "blocks"))) {
    try {
      const json = JSON.parse(readFileSync(join(themeDir, "blocks", dir, "block.json"), "utf8")) as BlockJson;
      blocks.set(json.name, json);
    } catch {
      // not a block folder
    }
  }
  blockJsonCache = { dir: themeDir, blocks };
  return blocks;
}

/** cle/bead-timeline -> cleBeadTimeline */
export const cleTypeName = (blockName: string) =>
  "cle" +
  blockName
    .replace(/^cle\//, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

/** The block.json defaults of a theme block (deep copies). */
export function blockDefaults(blockName: string, themeDir = THEME_DIR): Record<string, unknown> {
  const json = themeBlocks(themeDir).get(blockName);
  const out: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(json?.attributes ?? {}))
    if (def.default !== undefined) out[name] = structuredClone(def.default);
  return out;
}

/**
 * Block-supports attributes WordPress adds to a block (alignment, extra class, anchor, colours, font
 * size, spacing). They aren't in block.json's `attributes`, but they change the rendered wrapper, so
 * they're kept on the object under WordPress's names; `style` becomes the CSS WordPress would emit.
 */
const SUPPORT_ATTRS = ["align", "className", "anchor", "backgroundColor", "textColor", "fontSize", "style"];

const cssValue = (v: unknown) =>
  String(v).replace(/^var:preset\|([a-z-]+)\|([a-z0-9-]+)$/, (_, kind: string, slug: string) => `var(--wp--preset--${kind}--${slug})`);

/** WordPress's block `style` attribute -> the inline CSS it renders (spacing, typography, colour). */
export function wpStyleToCss(style: unknown): string {
  if (!style || typeof style !== "object") return "";
  const s = style as Record<string, Record<string, unknown>>;
  const decls: string[] = [];
  for (const box of ["margin", "padding"] as const) {
    const v = s.spacing?.[box];
    if (typeof v === "string") decls.push(`${box}:${cssValue(v)}`);
    else if (v && typeof v === "object")
      for (const side of ["top", "right", "bottom", "left"])
        if ((v as Record<string, unknown>)[side] !== undefined)
          decls.push(`${box}-${side}:${cssValue((v as Record<string, unknown>)[side])}`);
  }
  const typo = s.typography ?? {};
  for (const [k, prop] of [
    ["fontSize", "font-size"],
    ["lineHeight", "line-height"],
    ["fontWeight", "font-weight"],
    ["fontStyle", "font-style"],
    ["letterSpacing", "letter-spacing"],
    ["textTransform", "text-transform"],
  ] as const)
    if (typo[k] !== undefined) decls.push(`${prop}:${cssValue(typo[k])}`);
  const color = s.color ?? {};
  if (color.text !== undefined) decls.push(`color:${cssValue(color.text)}`);
  if (color.background !== undefined) decls.push(`background-color:${cssValue(color.background)}`);
  return decls.join(";");
}

/** Adds `_type`/`_key` to object items of array fields, recursively, following the schema. */
export function keyArrays(value: Record<string, unknown>, fields: FieldDef[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = { ...value };
  for (const field of fields) {
    const v = out[field.name];
    if (field.type === "array" && Array.isArray(v)) {
      const member = field.of?.[0];
      out[field.name] = v.map((item, i) => {
        if (!item || typeof item !== "object" || !member) return item;
        const memberName = member.name ?? member.type;
        const memberFields = member.fields ?? schemaTypes.get(member.type)?.fields;
        return { _type: memberName, _key: `${memberName}-${i}`, ...keyArrays(item as Record<string, unknown>, memberFields) };
      });
    } else if (v && typeof v === "object" && !Array.isArray(v) && field.fields) {
      out[field.name] = keyArrays(v as Record<string, unknown>, field.fields);
    }
  }
  return out;
}

/** Whether the schema has a richBody object type for this theme block. */
export const hasCleType = (blockName: string) => schemaTypes.has(cleTypeName(blockName));

/** The schema's field names for a cle type. */
export const cleFields = (typeName: string) => (schemaTypes.get(typeName)?.fields ?? []).map((f) => f.name);

/**
 * A theme block as a richBody object: defaults, overlaid with the saved attributes, plus its inner
 * blocks as `children` when the type has that field. Undefined when the schema has no such type.
 */
export function cleObject(
  blockName: string,
  saved: Record<string, unknown>,
  key: string,
  children?: unknown[],
  themeDir = THEME_DIR,
): Record<string, unknown> | undefined {
  const typeName = cleTypeName(blockName);
  const type = schemaTypes.get(typeName);
  if (!type) return undefined;
  const json = themeBlocks(themeDir).get(blockName);
  const declared = new Set(Object.keys(json?.attributes ?? {}));
  const attrs: Record<string, unknown> = blockDefaults(blockName, themeDir);
  for (const [name, v] of Object.entries(saved)) if (declared.has(name)) attrs[name] = v;
  for (const name of SUPPORT_ATTRS) {
    if (declared.has(name) || saved[name] === undefined) continue;
    const css = name === "style" ? wpStyleToCss(saved.style) : "";
    if (name === "style") {
      if (css) attrs.style = css;
    } else attrs[name] = saved[name];
  }
  if (blockName === "cle/hotspot-scene" && attrs.imageId && !attrs.image) {
    console.warn(`migrate: cle/hotspot-scene ${key} has imageId ${String(attrs.imageId)} but no image: choose its image in Studio.`);
  }
  const out: Record<string, unknown> = { _type: typeName, _key: key, ...keyArrays(attrs, type.fields) };
  if (children?.length && type.fields?.some((f) => f.name === "children")) out.children = children;
  return out;
}
