// The theme block cle/world-chapter: fields and defaults mirror cle-ai-theme/blocks/world-chapter/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleWorldChapter = defineType({
  name: "cleWorldChapter",
  title: "World chapter",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "camera",
      title: "Camera",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
        defineField({ name: "zoom", title: "Zoom", type: "number" }),
      ],
      initialValue: {
        x: 50,
        y: 50,
        zoom: 1,
      },
    }),
    defineField({
      name: "fadeBelow",
      title: "Fade below",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "hotspots",
      title: "Hotspots",
      type: "array",
      of: [defineArrayMember({ type: "hotspot" })],
      initialValue: [],
    }),
    defineField({
      name: "tag",
      title: "Tag",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
      ],
    }),
    defineField({
      name: "tagPhone",
      title: "Tag phone",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
      ],
    }),
    defineField({
      name: "tagShort",
      title: "Tag short",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "stop",
      title: "Stop",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
      ],
    }),
    defineField({
      name: "children",
      title: "Inner blocks",
      description: "What the WordPress block held inside it.",
      type: "richBody",
    }),
  ],
  preview: { prepare: () => ({ title: "World chapter", subtitle: "cle/world-chapter" }) },
});
