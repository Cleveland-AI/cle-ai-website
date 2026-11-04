// The theme block cle/first-night: fields and defaults mirror cle-ai-theme/blocks/first-night/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleFirstNight = defineType({
  name: "cleFirstNight",
  title: "Your first night",
  type: "object",
  fields: [
    defineField({
      name: "visible",
      title: "Visible",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "align",
      title: "Align",
      type: "string",
      initialValue: "full",
    }),
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      initialValue: "Your first night",
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "What a social is actually like.",
    }),
    defineField({
      name: "match",
      title: "Match",
      type: "string",
      initialValue: "Social",
    }),
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      of: [
        defineArrayMember({
          name: "firstNightStep",
          type: "object",
          fields: [
            defineField({ name: "time", title: "Time", type: "string" }),
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "text", title: "Text", type: "text" }),
            defineField({ name: "art", title: "Art", type: "string" }),
            defineField({ name: "fallback", title: "Fallback", type: "string" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "firstNightStep",
          _key: "firstNightStep-0",
          time: "6:00 PM",
          title: "You arrive",
          text: "Happy Dog, 5801 Detroit Avenue in Gordon Square. Parking is free. Look for the table with the laptops and the name tags.",
          art: "night-arrive",
          fallback: "dot-welcome",
        },
        {
          _type: "firstNightStep",
          _key: "firstNightStep-1",
          time: "6:10",
          title: "You grab a dog",
          text: "Fifty-odd toppings, your call. Food and drinks are on you; nothing else costs a thing.",
          art: "night-dog",
          fallback: "dot-social",
        },
        {
          _type: "firstNightStep",
          _key: "firstNightStep-2",
          time: "6:30",
          title: "You talk",
          text: "No slides. Someone asks what you're curious about, and that is the evening. Beginners and people who build this for a living share a table.",
          art: "night-talk",
          fallback: "dot-stage",
        },
        {
          _type: "firstNightStep",
          _key: "firstNightStep-3",
          time: "7:30",
          title: "The hour after",
          text: "The part people come back for: the introductions, the “you should talk to…”, the project that could use a hand.",
          art: "night-after",
          fallback: "dot-workshop",
        },
        {
          _type: "firstNightStep",
          _key: "firstNightStep-4",
          time: "8:00",
          title: "You head home",
          text: "Three new names in your phone and a reason to come back next month.",
          art: "night-home",
          fallback: "dot-hike",
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Your first night", subtitle: "cle/first-night" }) },
});
