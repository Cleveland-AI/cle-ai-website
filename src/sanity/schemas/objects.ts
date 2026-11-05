// Shared object types: links, SEO, hotspots, and the core-block equivalents inside richBody.
import { defineArrayMember, defineField, defineType } from "sanity";

/** Palette slugs from cle-ai-theme/theme.json, for section colours. */
const PALETTE = [
  "accent",
  "indigo",
  "ink",
  "ink-soft",
  "surface",
  "surface-raised",
  "line",
  "paper",
  "white",
  "blue",
  "yellow",
  "green",
  "coral",
  "ink-blue",
  "pale-blue",
  "accent-deep",
  "navy-deep",
  "wood",
];

export const link = defineType({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Label", type: "string", validation: (r) => r.required() }),
    defineField({ name: "href", title: "URL or path", type: "string", validation: (r) => r.required() }),
  ],
  preview: { select: { title: "label", subtitle: "href" } },
});

export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Defaults to the page title.",
    }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
    defineField({ name: "image", title: "Social image", type: "image" }),
    defineField({ name: "noindex", title: "Hide from search engines", type: "boolean", initialValue: false }),
  ],
});

/** A tappable marker on an illustration (cle_render_hotspots in the theme). */
export const hotspot = defineType({
  name: "hotspot",
  title: "Hotspot",
  type: "object",
  fields: [
    defineField({ name: "id", title: "Id", type: "string" }),
    defineField({ name: "x", title: "X (%)", type: "number" }),
    defineField({ name: "y", title: "Y (%)", type: "number" }),
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "body", title: "Body", type: "text" }),
    defineField({ name: "icon", title: "Icon", type: "string" }),
  ],
  preview: { select: { title: "title", subtitle: "body" } },
});

// ---- Core-block equivalents ----

export const section = defineType({
  name: "section",
  title: "Section",
  type: "object",
  fields: [
    defineField({
      name: "tag",
      title: "HTML tag",
      type: "string",
      options: { list: ["div", "section", "header", "footer", "main", "aside"] },
      initialValue: "div",
    }),
    defineField({ name: "className", title: "CSS classes", type: "string" }),
    defineField({ name: "anchor", title: "Anchor", type: "string" }),
    defineField({
      name: "align",
      title: "Width",
      type: "string",
      options: { list: ["none", "wide", "full"] },
      initialValue: "none",
    }),
    defineField({
      name: "layout",
      title: "Layout",
      type: "string",
      options: { list: ["constrained", "default", "flex", "grid"] },
      initialValue: "constrained",
    }),
    defineField({
      name: "backgroundColor",
      title: "Background colour",
      type: "string",
      options: { list: PALETTE },
    }),
    defineField({ name: "textColor", title: "Text colour", type: "string", options: { list: PALETTE } }),
    defineField({
      name: "style",
      title: "Inline style",
      type: "string",
      description: "Saved CSS from WordPress (spacing, borders). Usually left alone.",
    }),
    defineField({
      name: "blockGap",
      title: "Space between blocks",
      type: "string",
      options: { list: [{ title: "None", value: "0" }] },
      description: "WordPress's block spacing. Empty uses the theme's default gap.",
    }),
    defineField({ name: "children", title: "Content", type: "richBody" }),
  ],
  preview: {
    select: { className: "className", anchor: "anchor" },
    prepare: ({ className, anchor }) => ({
      title: "Section",
      subtitle: [anchor && `#${anchor}`, className].filter(Boolean).join(" "),
    }),
  },
});

export const columns = defineType({
  name: "columns",
  title: "Columns",
  type: "object",
  fields: [
    defineField({ name: "className", title: "CSS classes", type: "string" }),
    defineField({
      name: "align",
      title: "Width",
      type: "string",
      options: { list: ["none", "wide", "full"] },
      initialValue: "none",
    }),
    defineField({
      name: "verticalAlignment",
      title: "Vertical alignment",
      type: "string",
      options: { list: ["top", "center", "bottom"] },
    }),
    defineField({
      name: "style",
      title: "Inline style",
      type: "string",
      description: "Saved CSS from WordPress (margins). Usually left alone.",
    }),
    defineField({
      name: "columns",
      title: "Columns",
      type: "array",
      of: [
        defineArrayMember({
          name: "column",
          type: "object",
          fields: [
            defineField({ name: "width", title: "Width", type: "string", description: "For example 40%." }),
            defineField({
              name: "verticalAlignment",
              title: "Vertical alignment",
              type: "string",
              options: { list: ["top", "center", "bottom"] },
            }),
            defineField({ name: "className", title: "CSS classes", type: "string" }),
            defineField({ name: "children", title: "Content", type: "richBody" }),
          ],
          preview: {
            select: { width: "width" },
            prepare: ({ width }) => ({ title: "Column", subtitle: width }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { columns: "columns" },
    prepare: ({ columns }) => ({ title: `Columns (${columns?.length ?? 0})` }),
  },
});

export const buttons = defineType({
  name: "buttons",
  title: "Buttons",
  type: "object",
  fields: [
    defineField({
      name: "items",
      title: "Buttons",
      type: "array",
      of: [
        defineArrayMember({
          name: "button",
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "href", title: "URL or path", type: "string" }),
            defineField({
              name: "style",
              title: "Style",
              type: "string",
              options: { list: ["fill", "outline"] },
              initialValue: "fill",
            }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "items.0.label" },
    prepare: ({ title }) => ({ title: "Buttons", subtitle: title }),
  },
});

export const figure = defineType({
  name: "figure",
  title: "Figure (big number)",
  type: "object",
  fields: [
    defineField({ name: "number", title: "Number", type: "string", description: "For example 4,284." }),
    defineField({ name: "label", title: "Label", type: "string" }),
  ],
  preview: { select: { title: "number", subtitle: "label" } },
});

export const table = defineType({
  name: "table",
  title: "Table",
  type: "object",
  fields: [
    defineField({
      name: "head",
      title: "Header row",
      description: "Header cells may contain inline HTML: links (<a href>), <strong>, <em> and <br>.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "rows",
      title: "Rows",
      type: "array",
      // Sanity can't nest arrays directly, so each row wraps its cells.
      of: [
        defineArrayMember({
          name: "tableRow",
          type: "object",
          fields: [
            defineField({
              name: "cells",
              title: "Cells",
              description: "Each cell may contain inline HTML: links (<a href>), <strong>, <em> and <br>. Other tags are not shown.",
              type: "array",
              of: [defineArrayMember({ type: "string" })],
            }),
          ],
          preview: {
            select: { cells: "cells" },
            prepare: ({ cells }) => ({ title: (cells ?? []).join(" | ") }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { head: "head" },
    prepare: ({ head }) => ({ title: "Table", subtitle: (head ?? []).join(" | ") }),
  },
});

export const quote = defineType({
  name: "quote",
  title: "Quote",
  type: "object",
  fields: [
    defineField({ name: "text", title: "Quote", type: "text", rows: 3 }),
    defineField({ name: "citeName", title: "Speaker name", type: "string" }),
    defineField({ name: "citeTitle", title: "Speaker title", type: "string" }),
  ],
  preview: { select: { title: "text", subtitle: "citeName" } },
});

export const separator = defineType({
  name: "separator",
  title: "Separator",
  type: "object",
  fields: [
    defineField({
      name: "style",
      title: "Style",
      type: "string",
      options: { list: ["default", "wide", "dots"] },
      initialValue: "default",
    }),
  ],
  preview: { prepare: () => ({ title: "Separator" }) },
});

export const spacer = defineType({
  name: "spacer",
  title: "Spacer",
  type: "object",
  fields: [
    defineField({
      name: "height",
      title: "Height",
      type: "string",
      description: "For example 40px.",
      initialValue: "40px",
    }),
  ],
  preview: { select: { height: "height" }, prepare: ({ height }) => ({ title: "Spacer", subtitle: height }) },
});

export const queryList = defineType({
  name: "queryList",
  title: "List of posts or events",
  type: "object",
  fields: [
    defineField({
      name: "source",
      title: "Show",
      type: "string",
      options: { list: ["posts", "events"] },
      initialValue: "posts",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "when",
      title: "Which events",
      type: "string",
      options: { list: ["upcoming", "past"] },
      hidden: ({ parent }) => parent?.source !== "events",
    }),
    defineField({ name: "count", title: "How many", type: "number", initialValue: 3 }),
    defineField({ name: "perPage", title: "Per page (paginates when set)", type: "number" }),
  ],
  preview: {
    select: { source: "source", when: "when", count: "count" },
    prepare: ({ source, when, count }) => ({
      title: `List: ${[when, source].filter(Boolean).join(" ")}`,
      subtitle: `${count ?? ""}`,
    }),
  },
});

export const rawHtml = defineType({
  name: "rawHtml",
  title: "HTML",
  type: "object",
  fields: [defineField({ name: "html", title: "HTML", type: "text", rows: 8 })],
  preview: {
    select: { html: "html" },
    prepare: ({ html }) => ({ title: "HTML", subtitle: String(html ?? "").slice(0, 80) }),
  },
});

export const objectTypes = [
  link,
  seo,
  hotspot,
  section,
  columns,
  buttons,
  figure,
  table,
  quote,
  separator,
  spacer,
  queryList,
  rawHtml,
];
