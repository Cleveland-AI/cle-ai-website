// The theme block cle/gift-slider: fields and defaults mirror cle-ai-theme/blocks/gift-slider/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleGiftSlider = defineType({
  name: "cleGiftSlider",
  title: "What your gift covers",
  type: "object",
  fields: [
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      of: [
        defineArrayMember({
          name: "giftStep",
          type: "object",
          fields: [
            defineField({ name: "amount", title: "Amount", type: "number" }),
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "art", title: "Art", type: "string" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "giftStep",
          _key: "giftStep-0",
          amount: 25,
          label: "Name tags and markers for a night",
          art: "gift-name-tags",
        },
        {
          _type: "giftStep",
          _key: "giftStep-1",
          amount: 55,
          label: "Coffee for a morning workshop",
          art: "gift-coffee",
        },
        {
          _type: "giftStep",
          _key: "giftStep-2",
          amount: 100,
          label: "Pizza for a monthly social",
          art: "perk-pizza",
        },
        {
          _type: "giftStep",
          _key: "giftStep-3",
          amount: 250,
          label: "Chairs and setup for a workshop",
          art: "gift-chairs",
        },
        {
          _type: "giftStep",
          _key: "giftStep-4",
          amount: 500,
          label: "Projector and sound for a talk night",
          art: "perk-screen",
        },
        {
          _type: "giftStep",
          _key: "giftStep-5",
          amount: 1000,
          label: "The room for a big night",
          art: "perk-door",
        },
      ],
    }),
    defineField({
      name: "start",
      title: "Start",
      type: "number",
      initialValue: 2,
    }),
    defineField({
      name: "target",
      title: "Target",
      type: "string",
      initialValue: "#donate",
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      type: "string",
      initialValue: "Give %s",
    }),
  ],
  preview: { prepare: () => ({ title: "What your gift covers", subtitle: "cle/gift-slider" }) },
});
