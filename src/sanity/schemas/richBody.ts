// richBody: the one Portable Text type every page, post and section uses. Its members mirror the
// WordPress blocks the theme's content is built from, so renderers can emit the same markup.
import { defineArrayMember, defineField, defineType } from "sanity";
import { LIST_STYLES, TEXT_STYLES } from "../../components/core/textStyles";
import { blockTypes } from "./blocks";

export const richBody = defineType({
  name: "richBody",
  title: "Content",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: Object.entries(TEXT_STYLES).map(([value, { title }]) => ({ title, value })),
      lists: Object.entries(LIST_STYLES).map(([value, { title }]) => ({ title, value })),
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
        ],
        annotations: [
          defineArrayMember({
            name: "link",
            title: "Link",
            type: "object",
            fields: [
              defineField({
                name: "href",
                title: "URL or path",
                type: "string",
                validation: (r) => r.required(),
              }),
              defineField({
                name: "blank",
                title: "Open in a new tab",
                type: "boolean",
                initialValue: false,
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({ type: "section" }),
    defineArrayMember({ type: "columns" }),
    defineArrayMember({ type: "buttons" }),
    defineArrayMember({ type: "figure" }),
    defineArrayMember({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt text", type: "string" }),
        defineField({ name: "caption", title: "Caption", type: "string" }),
        defineField({
          name: "style",
          title: "Style",
          type: "string",
          options: { list: ["framed", "plain"] },
          initialValue: "framed",
        }),
        defineField({
          name: "align",
          title: "Alignment",
          type: "string",
          options: { list: ["none", "left", "center", "right", "wide", "full"] },
          initialValue: "none",
        }),
      ],
    }),
    defineArrayMember({ type: "table" }),
    defineArrayMember({ type: "quote" }),
    defineArrayMember({ type: "separator" }),
    defineArrayMember({ type: "spacer" }),
    defineArrayMember({ type: "queryList" }),
    defineArrayMember({ type: "rawHtml" }),
    ...blockTypes.map((t) => defineArrayMember({ type: t.name })),
  ],
});
