// The theme block cle/venue-map: fields and defaults mirror cle-ai-theme/blocks/venue-map/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleVenueMap = defineType({
  name: "cleVenueMap",
  title: "Where we meet",
  type: "object",
  fields: [
    defineField({
      name: "art",
      title: "Art",
      type: "string",
      initialValue: "venue-map",
    }),
    defineField({
      name: "alt",
      title: "Alt",
      type: "string",
      initialValue: "Clay map of Greater Cleveland with our regular venues marked.",
    }),
    defineField({
      name: "pins",
      title: "Pins",
      type: "array",
      of: [
        defineArrayMember({
          name: "venuePin",
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "place", title: "Place", type: "text" }),
            defineField({ name: "match", title: "Match", type: "string" }),
            defineField({ name: "x", title: "X", type: "number" }),
            defineField({ name: "y", title: "Y", type: "number" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "venuePin",
          _key: "venuePin-0",
          title: "Happy Dog",
          place: "5801 Detroit Avenue, Gordon Square. Monthly socials.",
          match: "Social",
          x: 25,
          y: 41,
        },
        {
          _type: "venuePin",
          _key: "venuePin-1",
          title: "Cleveland Museum of Natural History",
          place: "1 Wade Oval Drive, University Circle. Big nights.",
          match: "Mega",
          x: 87,
          y: 38,
        },
        {
          _type: "venuePin",
          _key: "venuePin-2",
          title: "On the trail",
          place: "Hikes in the Cuyahoga Valley and the Metroparks.",
          match: "Hike",
          x: 51,
          y: 79,
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Where we meet", subtitle: "cle/venue-map" }) },
});
