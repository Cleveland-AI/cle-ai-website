// The theme block cle/event-meta: fields and defaults mirror cle-ai-theme/blocks/event-meta/block.json.
import { defineField, defineType } from "sanity";

export const cleEventMeta = defineType({
  name: "cleEventMeta",
  title: "Event details",
  type: "object",
  fields: [
    defineField({
      name: "showStatus",
      title: "Show status",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "statusUpcoming",
      title: "Status upcoming",
      type: "string",
      initialValue: "Upcoming",
    }),
    defineField({
      name: "statusPast",
      title: "Status past",
      type: "string",
      initialValue: "Past",
    }),
    defineField({
      name: "showDate",
      title: "Show date",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "dateStyle",
      title: "Date style",
      type: "string",
      options: { list: ["short", "long"] },
      initialValue: "short",
    }),
    defineField({
      name: "showVenue",
      title: "Show venue",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "venueStyle",
      title: "Venue style",
      type: "string",
      options: { list: ["full", "name"] },
      initialValue: "full",
    }),
    defineField({
      name: "showRsvp",
      title: "Show rsvp",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "rsvpLabel",
      title: "Rsvp label",
      type: "string",
      initialValue: "RSVP on Meetup",
    }),
    defineField({
      name: "showOrganizer",
      title: "Show organizer",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "organizerLabel",
      title: "Organizer label",
      type: "string",
      initialValue: "Organized by",
    }),
    defineField({
      name: "showBackLink",
      title: "Show back link",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "backLabel",
      title: "Back label",
      type: "string",
      initialValue: "← All events",
    }),
  ],
  preview: { prepare: () => ({ title: "Event details", subtitle: "cle/event-meta" }) },
});
