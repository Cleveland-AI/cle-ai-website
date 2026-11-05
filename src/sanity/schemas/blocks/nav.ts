// The theme block cle/nav: fields and defaults mirror cle-ai-theme/blocks/nav/block.json.
import { defineField, defineType } from "sanity";

export const cleNav = defineType({
  name: "cleNav",
  title: "Header navigation",
  type: "object",
  fields: [
    defineField({
      name: "openLabel",
      title: "Open label",
      type: "string",
      initialValue: "Menu",
    }),
    defineField({
      name: "closeLabel",
      title: "Close label",
      type: "string",
      initialValue: "Close",
    }),
    defineField({
      name: "children",
      title: "Inner blocks",
      description: "What the WordPress block held inside it.",
      type: "richBody",
    }),
  ],
  preview: { prepare: () => ({ title: "Header navigation", subtitle: "cle/nav" }) },
});
