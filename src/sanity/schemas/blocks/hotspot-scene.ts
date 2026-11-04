// The theme block cle/hotspot-scene: fields and defaults mirror cle-ai-theme/blocks/hotspot-scene/block.json.
import { defineArrayMember, defineField, defineType } from "sanity";

export const cleHotspotScene = defineType({
  name: "cleHotspotScene",
  title: "Hotspot Scene",
  type: "object",
  fields: [
    defineField({
      name: "imageId",
      title: "Image id (WordPress)",
      description: "The WordPress media-library id from before the move. It can't show an image here: pick one in Image instead.",
      type: "number",
      hidden: true,
    }),
    defineField({
      name: "image",
      title: "Image",
      description: "The picture the markers sit on. Replaces the WordPress media-library id (imageId).",
      type: "image",
    }),
    defineField({
      name: "imageAlt",
      title: "Image alt",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "text",
      initialValue: "",
    }),
    defineField({
      name: "markerStyle",
      title: "Marker style",
      type: "string",
      options: { list: ["numbered", "dot", "question", "icon"] },
      initialValue: "numbered",
    }),
    defineField({
      name: "hotspots",
      title: "Hotspots",
      type: "array",
      of: [defineArrayMember({ type: "hotspot" })],
      initialValue: [],
    }),
    defineField({
      name: "children",
      title: "Inner blocks",
      description: "What the WordPress block held inside it.",
      type: "richBody",
    }),
  ],
  preview: { prepare: () => ({ title: "Hotspot Scene", subtitle: "cle/hotspot-scene" }) },
});
