// The theme block cle/logo: fields and defaults mirror cle-ai-theme/blocks/logo/block.json.
import { defineField, defineType } from "sanity";

export const cleLogo = defineType({
  name: "cleLogo",
  title: "Logo (animated)",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      initialValue: "CLE AI & DATA home",
    }),
  ],
  preview: { prepare: () => ({ title: "Logo (animated)", subtitle: "cle/logo" }) },
});
