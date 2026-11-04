// The theme block cle/story-chapter: fields and defaults mirror cle-ai-theme/blocks/story-chapter/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleStoryChapter = defineType({
  name: "cleStoryChapter",
  title: "Story chapter",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "layers",
      title: "Layers",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      initialValue: [],
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
      name: "reveal",
      title: "Reveal",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "night",
      title: "Night",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "foreground",
      title: "Foreground",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "bubbles",
      title: "Bubbles",
      type: "array",
      of: [
        defineArrayMember({
          name: "chapterBubble",
          type: "object",
          fields: [
            defineField({ name: "x", title: "X", type: "number" }),
            defineField({ name: "y", title: "Y", type: "number" }),
            defineField({ name: "text", title: "Text", type: "text" }),
          ],
        }),
      ],
      initialValue: [],
    }),
    defineField({
      name: "hotspots",
      title: "Hotspots",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "pattern",
      title: "Pattern",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "pin",
      title: "Pin",
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
  preview: { prepare: () => ({ title: "Story chapter", subtitle: "cle/story-chapter" }) },
});
