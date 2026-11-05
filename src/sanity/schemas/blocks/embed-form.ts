// The theme block cle/embed-form: fields and defaults mirror cle-ai-theme/blocks/embed-form/block.json.
import { defineField, defineType } from "sanity";

export const cleEmbedForm = defineType({
  name: "cleEmbedForm",
  title: "Embedded form",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Url",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "Form",
    }),
    defineField({
      name: "height",
      title: "Height",
      type: "number",
      initialValue: 720,
    }),
    defineField({
      name: "linkLabel",
      title: "Link label",
      type: "string",
      initialValue: "Open the form in a new tab",
    }),
    defineField({
      name: "linkUrl",
      title: "Link url",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "allowPayment",
      title: "Allow payment",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: { prepare: () => ({ title: "Embedded form", subtitle: "cle/embed-form" }) },
});
