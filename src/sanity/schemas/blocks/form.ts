// cle/form: the pitch-a-talk and sponsor-inquiry forms. The one block the rewrite adds to the theme's set (R10).
import { defineField, defineType } from "sanity";

export const cleForm = defineType({
  name: "cleForm",
  title: "Form",
  type: "object",
  fields: [
    defineField({
      name: "form",
      title: "Which form",
      type: "string",
      options: { list: ["pitch", "sponsor"], layout: "radio" },
      initialValue: "pitch",
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { form: "form" }, prepare: ({ form }) => ({ title: form === "sponsor" ? "Sponsor inquiry form" : "Pitch a talk form", subtitle: "cle/form" }) },
});
