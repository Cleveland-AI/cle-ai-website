// The theme block cle/menu: fields and defaults mirror cle-ai-theme/blocks/menu/block.json.
import { defineField, defineType } from "sanity";

export const cleMenu = defineType({
  name: "cleMenu",
  title: "Menu (text links)",
  type: "object",
  fields: [
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      options: { list: ["primary", "social"] },
      initialValue: "primary",
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      initialValue: "Main",
    }),
  ],
  preview: { prepare: () => ({ title: "Menu (text links)", subtitle: "cle/menu" }) },
});
