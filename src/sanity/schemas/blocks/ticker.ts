// The theme block cle/ticker: fields and defaults mirror cle-ai-theme/blocks/ticker/block.json.
import { defineField, defineType } from "sanity";

export const cleTicker = defineType({
  name: "cleTicker",
  title: "Ticker",
  type: "object",
  fields: [
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      options: { list: ["posts", "events", "both"] },
      initialValue: "posts",
    }),
    defineField({
      name: "count",
      title: "Count",
      type: "number",
      initialValue: 8,
    }),
    defineField({
      name: "showThumbnails",
      title: "Show thumbnails",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "duration",
      title: "Duration",
      type: "number",
      initialValue: 50,
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      initialValue: "Latest",
    }),
    defineField({
      name: "eventPrefix",
      title: "Event prefix",
      type: "string",
      initialValue: "Next:",
    }),
    defineField({
      name: "pauseLabel",
      title: "Pause label",
      type: "string",
      initialValue: "Pause",
    }),
    defineField({
      name: "playLabel",
      title: "Play label",
      type: "string",
      initialValue: "Play",
    }),
  ],
  preview: { prepare: () => ({ title: "Ticker", subtitle: "cle/ticker" }) },
});
