"use client";

/** Sanity Studio, mounted at /studio (src/app/studio/[[...tool]]/page.tsx). */
import { defineConfig } from "sanity";
import { defineLocations, presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { dataset, projectId } from "./src/sanity/env";
import { schemaTypes } from "./src/sanity/schemas";
import { isSingleton, structure } from "./src/sanity/structure";
import { postTemplates } from "./src/sanity/templates";

const SINGLETON_ACTIONS = new Set(["publish", "discardChanges", "restore"]);

export default defineConfig({
  name: "default",
  title: "CLE AI & DATA",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    // Live preview of drafts: the Studio opens the site through /api/draft (draft mode on) and
    // /api/draft/disable turns it off again.
    presentationTool({
      previewUrl: { previewMode: { enable: "/api/draft", disable: "/api/draft/disable" } },
      resolve: {
        locations: {
          page: defineLocations({ select: { title: "title", slug: "slug.current" }, resolve: (d) => ({ locations: d?.slug ? [{ title: d.title || "Page", href: `/${d.slug}` }] : [] }) }),
          post: defineLocations({ select: { title: "title", slug: "slug.current" }, resolve: (d) => ({ locations: d?.slug ? [{ title: d.title || "Post", href: `/blog/${d.slug}` }, { title: "Blog", href: "/blog" }] : [] }) }),
          event: defineLocations({ select: { title: "title", slug: "slug.current" }, resolve: (d) => ({ locations: d?.slug ? [{ title: d.title || "Event", href: `/events/${d.slug}` }, { title: "Events", href: "/events" }] : [] }) }),
        },
      },
    }),
  ],
  schema: {
    types: schemaTypes,
    // No "new" for singletons; "New post" offers the four starters instead of a blank post.
    templates: (prev) => [
      ...prev.filter((t) => !isSingleton(t.schemaType) && t.id !== "post"),
      ...postTemplates,
    ],
  },
  document: {
    actions: (prev, { schemaType }) =>
      isSingleton(schemaType) ? prev.filter(({ action }) => action && SINGLETON_ACTIONS.has(action)) : prev,
  },
});
