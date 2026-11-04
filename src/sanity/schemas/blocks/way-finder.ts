// The theme block cle/way-finder: fields and defaults mirror cle-ai-theme/blocks/way-finder/block.json.
import { defineField, defineType } from "sanity";

export const cleWayFinder = defineType({
  name: "cleWayFinder",
  title: "Find your way in",
  type: "object",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "Not sure where to start?",
    }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "text",
      initialValue: "Three taps and we'll point you the right way.",
    }),
    defineField({
      name: "art",
      title: "Art",
      type: "string",
      initialValue: "signpost",
    }),
  ],
  preview: { prepare: () => ({ title: "Find your way in", subtitle: "cle/way-finder" }) },
});
