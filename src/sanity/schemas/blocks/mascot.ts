// The theme block cle/mascot: fields and defaults mirror cle-ai-theme/blocks/mascot/block.json.
import { defineField, defineType } from "sanity";

export const cleMascot = defineType({
  name: "cleMascot",
  title: "Dot (mascot)",
  type: "object",
  fields: [
    defineField({
      name: "pose",
      title: "Pose",
      type: "string",
      options: {
        list: ["peek", "lost", "sleep", "stage", "social", "workshop", "hike", "search", "welcome"],
      },
      initialValue: "peek",
    }),
    defineField({
      name: "width",
      title: "Width",
      type: "number",
      initialValue: 220,
    }),
  ],
  preview: { prepare: () => ({ title: "Dot (mascot)", subtitle: "cle/mascot" }) },
});
