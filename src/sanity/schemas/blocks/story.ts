// The theme block cle/story: fields and defaults mirror cle-ai-theme/blocks/story/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleStory = defineType({
  name: "cleStory",
  title: "Story stage",
  type: "object",
  fields: [
    defineField({
      name: "align",
      title: "Align",
      type: "string",
      initialValue: "full",
    }),
    defineField({
      name: "mode",
      title: "Mode",
      type: "string",
      options: { list: ["stage", "stacked"] },
      initialValue: "stage",
    }),
    defineField({
      name: "layers",
      title: "Layers",
      type: "array",
      of: [
        defineArrayMember({
          name: "storyLayer",
          type: "object",
          fields: [
            defineField({ name: "slug", title: "Slug", type: "string" }),
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "imageId", title: "Image id", type: "number" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "storyLayer",
          _key: "storyLayer-0",
          slug: "lights",
          label: "String lights and lamps",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-1",
          slug: "room",
          label: "Room and TV",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-2",
          slug: "table-1",
          label: "Table 1 (top left)",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-3",
          slug: "table-2",
          label: "Table 2 (bottom left)",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-4",
          slug: "table-3",
          label: "Table 3 (centre)",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-5",
          slug: "table-4",
          label: "Table 4 (at the counter)",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-6",
          slug: "bar-staff",
          label: "Bartender and back bar",
          imageId: 0,
        },
        {
          _type: "storyLayer",
          _key: "storyLayer-7",
          slug: "counter",
          label: "Counter and hot dogs",
          imageId: 0,
        },
      ],
    }),
    defineField({
      name: "nightId",
      title: "Night id",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "compositeId",
      title: "Composite id",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "patternId",
      title: "Pattern id",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "foregrounds",
      title: "Foregrounds",
      type: "array",
      of: [
        defineArrayMember({
          name: "storyForeground",
          type: "object",
          fields: [
            defineField({ name: "slug", title: "Slug", type: "string" }),
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "imageId", title: "Image id", type: "number" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "storyForeground",
          _key: "storyForeground-0",
          slug: "hotdog-beer",
          label: "Hot dog and beer",
          imageId: 0,
        },
      ],
    }),
    defineField({
      name: "tv",
      title: "Tv",
      type: "object",
      fields: [
        defineField({ name: "x", title: "X", type: "number" }),
        defineField({ name: "y", title: "Y", type: "number" }),
        defineField({ name: "w", title: "W", type: "number" }),
        defineField({ name: "h", title: "H", type: "number" }),
      ],
      initialValue: {
        x: 35.3,
        y: 9.9,
        w: 27.2,
        h: 22,
      },
    }),
    defineField({
      name: "tvLabel",
      title: "Tv label",
      type: "string",
      initialValue: "Next big night",
    }),
    defineField({
      name: "tvMatch",
      title: "Tv match",
      type: "string",
      initialValue: "Mega",
    }),
    defineField({
      name: "sponsors",
      title: "Sponsors",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "hotspots",
      title: "Hotspots",
      type: "array",
      of: [defineArrayMember({ type: "hotspot" })],
      initialValue: [],
    }),
    defineField({
      name: "markerStyle",
      title: "Marker style",
      type: "string",
      options: { list: ["numbered", "dot", "question", "icon"] },
      initialValue: "icon",
    }),
    defineField({
      name: "railLabel",
      title: "Rail label",
      type: "string",
      initialValue: "Story chapters",
    }),
    defineField({
      name: "children",
      title: "Inner blocks",
      description: "What the WordPress block held inside it.",
      type: "richBody",
    }),
  ],
  preview: { prepare: () => ({ title: "Story stage", subtitle: "cle/story" }) },
});
