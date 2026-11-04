// The theme block cle/sponsor-builder: fields and defaults mirror cle-ai-theme/blocks/sponsor-builder/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleSponsorBuilder = defineType({
  name: "cleSponsorBuilder",
  title: "Sponsorship builder",
  type: "object",
  fields: [
    defineField({
      name: "perks",
      title: "Perks",
      type: "array",
      of: [
        defineArrayMember({
          name: "sponsorPerk",
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "desc", title: "Desc", type: "text" }),
            defineField({ name: "art", title: "Art", type: "string" }),
            defineField({ name: "weight", title: "Weight", type: "number" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "sponsorPerk",
          _key: "sponsorPerk-0",
          label: "Your logo on the big screen",
          desc: "Before every talk, at every big night this season.",
          art: "perk-screen",
          weight: 1,
        },
        {
          _type: "sponsorPerk",
          _key: "sponsorPerk-1",
          label: "A table at a big night",
          desc: "Meet a few hundred people in the hour after the talks.",
          art: "perk-table",
          weight: 2,
        },
        {
          _type: "sponsorPerk",
          _key: "sponsorPerk-2",
          label: "A speaking slot",
          desc: "Twenty minutes on what your team built.",
          art: "microphone",
          weight: 3,
        },
        {
          _type: "sponsorPerk",
          _key: "sponsorPerk-3",
          label: "Cover the food",
          desc: "Pizza and drinks for a night, with a thank-you from the stage.",
          art: "perk-pizza",
          weight: 1,
        },
        {
          _type: "sponsorPerk",
          _key: "sponsorPerk-4",
          label: "Host a night in your space",
          desc: "Your office, our crowd.",
          art: "perk-door",
          weight: 2,
        },
      ],
    }),
    defineField({
      name: "tiers",
      title: "Tiers",
      type: "array",
      of: [
        defineArrayMember({
          name: "sponsorTier",
          type: "object",
          fields: [
            defineField({ name: "name", title: "Name", type: "string" }),
            defineField({ name: "min", title: "Min", type: "number" }),
            defineField({ name: "price", title: "Price", type: "string" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "sponsorTier",
          _key: "sponsorTier-0",
          name: "Event sponsor",
          min: 1,
          price: "$800",
        },
        {
          _type: "sponsorTier",
          _key: "sponsorTier-1",
          name: "Season sponsor",
          min: 3,
          price: "$1,800",
        },
        {
          _type: "sponsorTier",
          _key: "sponsorTier-2",
          name: "Presenting sponsor",
          min: 5,
          price: "$2,500",
        },
      ],
    }),
    defineField({
      name: "formUrl",
      title: "Form url",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      initialValue: "info@cle-ai.com",
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      type: "string",
      initialValue: "Ask about this package",
    }),
  ],
  preview: { prepare: () => ({ title: "Sponsorship builder", subtitle: "cle/sponsor-builder" }) },
});
