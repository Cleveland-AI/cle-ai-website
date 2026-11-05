// The theme block cle/world: fields and defaults mirror cle-ai-theme/blocks/world/block.json.
import { defineField, defineType } from "sanity";

export const cleWorld = defineType({
  name: "cleWorld",
  title: "Story world",
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
      name: "imageId",
      title: "Image id",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "alt",
      title: "Alt",
      type: "string",
      initialValue:
        "Illustration of Cleveland: the downtown skyline above a museum auditorium, the Happy Dog bar, a training room and a park trail, all busy with people.",
    }),
    defineField({
      name: "children",
      title: "Inner blocks",
      description: "What the WordPress block held inside it.",
      type: "richBody",
    }),
  ],
  preview: { prepare: () => ({ title: "Story world", subtitle: "cle/world" }) },
});
