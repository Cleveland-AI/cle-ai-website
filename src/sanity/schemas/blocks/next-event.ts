// The theme block cle/next-event: fields and defaults mirror cle-ai-theme/blocks/next-event/block.json.
import { defineField, defineType } from "sanity";

export const cleNextEvent = defineType({
  name: "cleNextEvent",
  title: "Next event",
  type: "object",
  fields: [
    defineField({
      name: "layout",
      title: "Layout",
      type: "string",
      options: { list: ["callout", "bar"] },
      initialValue: "callout",
    }),
    defineField({
      name: "match",
      title: "Match",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      initialValue: "Next event",
    }),
    defineField({
      name: "rsvpLabel",
      title: "Rsvp label",
      type: "string",
      initialValue: "RSVP on Meetup",
    }),
    defineField({
      name: "showExcerpt",
      title: "Show excerpt",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "emptyText",
      title: "Empty text",
      type: "string",
      initialValue: "Nothing on the calendar yet. Join the Meetup group to hear about the next one.",
    }),
    defineField({
      name: "emptyLinkLabel",
      title: "Empty link label",
      type: "string",
      initialValue: "Join on Meetup",
    }),
    defineField({
      name: "emptyLink",
      title: "Empty link",
      type: "string",
      initialValue: "https://www.meetup.com/cleveland-ai-data/",
    }),
  ],
  preview: { prepare: () => ({ title: "Next event", subtitle: "cle/next-event" }) },
});
