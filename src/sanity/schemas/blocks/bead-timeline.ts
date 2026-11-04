// The theme block cle/bead-timeline: fields and defaults mirror cle-ai-theme/blocks/bead-timeline/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleBeadTimeline = defineType({
  name: "cleBeadTimeline",
  title: "Story beads",
  type: "object",
  fields: [
    defineField({
      name: "milestones",
      title: "Milestones",
      type: "array",
      of: [
        defineArrayMember({
          name: "beadMilestone",
          type: "object",
          fields: [
            defineField({ name: "year", title: "Year", type: "string" }),
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "body", title: "Body", type: "text" }),
          ],
        }),
      ],
      initialValue: [
        {
          _type: "beadMilestone",
          _key: "beadMilestone-0",
          year: "2010",
          title: "Cleveland Big Data begins",
          body: 'Doug Meil starts a Hadoop user group, years before anyone had "data engineer" on a business card.',
        },
        {
          _type: "beadMilestone",
          _key: "beadMilestone-1",
          year: "2017",
          title: "Cleveland AI forms",
          body: "A second group starts as machine learning moves out of the lab and into everyday software.",
        },
        {
          _type: "beadMilestone",
          _key: "beadMilestone-2",
          year: "2024",
          title: "CLE AI & DATA",
          body: "In November the two groups merge. AI and data had stopped being separate conversations.",
        },
        {
          _type: "beadMilestone",
          _key: "beadMilestone-3",
          year: "2026",
          title: "A nonprofit, officially",
          body: "We incorporate and become a registered 501(c)(3) nonprofit. Still run by volunteers, still free to attend, and now donations are tax-deductible.",
        },
      ],
    }),
    defineField({
      name: "open",
      title: "Open",
      type: "number",
      initialValue: -1,
    }),
  ],
  preview: { prepare: () => ({ title: "Story beads", subtitle: "cle/bead-timeline" }) },
});
