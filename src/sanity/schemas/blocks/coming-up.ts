// The theme block cle/coming-up: fields and defaults mirror cle-ai-theme/blocks/coming-up/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleComingUp = defineType({
  name: "cleComingUp",
  title: "Coming up",
  type: "object",
  fields: [
    defineField({
      name: "events",
      title: "Events",
      type: "array",
      of: [
        defineArrayMember({
          name: "comingUpEvent",
          type: "object",
          fields: [
            defineField({ name: "match", title: "Match", type: "string" }),
            defineField({ name: "label", title: "Label", type: "string" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "comingUpEvent",
          _key: "comingUpEvent-0",
          match: "Mega",
          label: "Next big night",
        },
        {
          _type: "comingUpEvent",
          _key: "comingUpEvent-1",
          match: "Social",
          label: "Next social",
        },
      ],
    }),
    defineField({
      name: "showPost",
      title: "Show post",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "postLabel",
      title: "Post label",
      type: "string",
      initialValue: "Latest post",
    }),
  ],
  preview: { prepare: () => ({ title: "Coming up", subtitle: "cle/coming-up" }) },
});
