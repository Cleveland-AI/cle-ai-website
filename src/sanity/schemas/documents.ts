// Document types. siteSettings and homepage are singletons (see src/sanity/structure.ts).
import { defineArrayMember, defineField, defineType, type SlugRule } from "sanity";
import { reservedPageSlug, reservedPostSlug } from "./reservedSlugs";

const slugField = (source: string, validate?: (r: SlugRule) => SlugRule) =>
  defineField({
    name: "slug",
    title: "Slug",
    type: "slug",
    options: { source },
    validation: (r) => (validate ? validate(r.required()) : r.required()),
  });

const links = (name: string, title: string) =>
  defineField({ name, title, type: "array", of: [defineArrayMember({ type: "link" })] });

/** "2026-11-19T18:00:00-05:00": a local time that keeps its offset, unlike Sanity's UTC datetime. */
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)$/;

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    links("primaryMenu", "Main menu"),
    links("socialMenu", "Social menu"),
    links("footerLegalLinks", "Footer legal links"),
    defineField({ name: "einLine", title: "501(c)(3) / EIN line", type: "string" }),
    defineField({
      name: "announcement",
      title: "Announcement bar",
      type: "object",
      fields: [
        defineField({ name: "label", title: "Label", type: "string" }),
        defineField({ name: "rsvpLabel", title: "RSVP label", type: "string" }),
        defineField({ name: "emptyMessage", title: "Message when nothing is coming up", type: "string" }),
      ],
    }),
    defineField({
      name: "substackEmbedUrl",
      title: "Substack embed URL",
      type: "url",
      initialValue: "https://timcleaidata.substack.com/embed",
    }),
    defineField({
      name: "givebutterEmbedUrl",
      title: "Givebutter embed URL",
      type: "url",
      initialValue: "https://givebutter.com/embed/c/cle-ai",
    }),
    defineField({
      name: "poptinId",
      title: "Poptin pixel id",
      type: "string",
      initialValue: "52c969b3a6878",
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [defineField({ name: "body", title: "Content", type: "richBody" })],
  preview: { prepare: () => ({ title: "Homepage" }) },
});

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    slugField("title", (r) => r.custom(reservedPageSlug)),
    defineField({
      name: "template",
      title: "Template",
      type: "string",
      description: "Landing pages hide the page title.",
      options: { list: ["default", "landing"], layout: "radio" },
      initialValue: "default",
    }),
    defineField({
      name: "featuredImage",
      title: "Featured image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({ name: "body", title: "Content", type: "richBody" }),
    defineField({
      name: "reviewStatus",
      title: "Review status",
      type: "string",
      description:
        "For pages that need sign-off before they count as final, such as the privacy policy: " +
        "\"Draft, awaiting counsel\" until the board and counsel approve the wording, then \"Approved\". Leave empty for ordinary pages.",
      options: {
        list: [
          { title: "Draft, awaiting counsel", value: "draft-awaiting-counsel" },
          { title: "Approved", value: "approved" },
        ],
        layout: "radio",
      },
    }),
    defineField({ name: "seo", title: "SEO", type: "seo" }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});

export const POST_KINDS = ["recap", "newsletter", "article", "announcement"] as const;

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    slugField("title", (r) => r.custom(reservedPostSlug)),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      options: { list: [...POST_KINDS], layout: "radio" },
      initialValue: "article",
      validation: (r) => r.required(),
    }),
    defineField({ name: "author", title: "Author", type: "reference", to: [{ type: "person" }] }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "category" }] })],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "publishOn",
      title: "Publish on",
      type: "datetime",
      description:
        "Leave empty to show the post as soon as it's published. Set a future time to keep it hidden until then.",
    }),
    defineField({
      name: "featuredImage",
      title: "Featured image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({ name: "excerpt", title: "Excerpt", type: "text", rows: 3 }),
    defineField({ name: "body", title: "Content", type: "richBody" }),
    defineField({
      name: "event",
      title: "Event",
      description: "For recaps: the event this post is about.",
      type: "reference",
      to: [{ type: "event" }],
    }),
    defineField({ name: "seo", title: "SEO", type: "seo" }),
  ],
  orderings: [
    { title: "Newest", name: "publishedAtDesc", by: [{ field: "publishedAt", direction: "desc" }] },
  ],
  preview: { select: { title: "title", subtitle: "kind", media: "featuredImage" } },
});

export const person = defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    slugField("name"),
    defineField({ name: "role", title: "Role", type: "string" }),
    defineField({ name: "lead", title: "Leadership", type: "boolean", initialValue: false }),
    defineField({ name: "bio", title: "Bio", type: "text", rows: 5 }),
    defineField({ name: "linkedin", title: "LinkedIn", type: "url" }),
    defineField({ name: "site", title: "Website", type: "url" }),
    defineField({ name: "photo", title: "Photo", type: "image", options: { hotspot: true } }),
    defineField({ name: "hidden", title: "Hide from the team list", type: "boolean", initialValue: false }),
    defineField({ name: "order", title: "Order", type: "number" }),
  ],
  orderings: [{ title: "Team order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "name", subtitle: "role", media: "photo" } },
});

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    slugField("title"),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
  ],
});

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  description: "Synced daily from Meetup. Notes and extra photos are yours; the sync never changes them.",
  fields: [
    defineField({ name: "meetupId", title: "Meetup id", type: "string", readOnly: true }),
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    slugField("title"),
    defineField({
      name: "start",
      title: "Start",
      type: "string",
      description: "ISO time with offset, for example 2026-11-19T18:00:00-05:00.",
      validation: (r) => r.required().regex(ISO_WITH_OFFSET, { name: "ISO time with offset" }),
    }),
    defineField({
      name: "end",
      title: "End",
      type: "string",
      validation: (r) => r.regex(ISO_WITH_OFFSET, { name: "ISO time with offset" }),
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "object",
      fields: [
        defineField({ name: "name", title: "Name", type: "string" }),
        defineField({ name: "address", title: "Address", type: "string" }),
        defineField({ name: "city", title: "City", type: "string" }),
        defineField({ name: "state", title: "State", type: "string" }),
        defineField({ name: "zip", title: "ZIP code", type: "string" }),
        defineField({ name: "lat", title: "Latitude", type: "number" }),
        defineField({ name: "lng", title: "Longitude", type: "number" }),
      ],
    }),
    defineField({ name: "rsvpUrl", title: "RSVP URL", type: "url" }),
    defineField({ name: "image", title: "Image", type: "image" }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "Short summary for cards. Migrated events carry WordPress's excerpt.",
    }),
    defineField({ name: "descriptionHtml", title: "Description (HTML from Meetup)", type: "text", rows: 8 }),
    defineField({ name: "organizer", title: "Organizer", type: "string" }),
    defineField({
      name: "organizerUrl",
      title: "Organizer link",
      type: "url",
      description: "Where the organizer's name links on the event page. Synced from Meetup.",
    }),
    defineField({
      name: "meetupStatus",
      title: "Status",
      type: "string",
      options: { list: ["active", "cancelled"] },
      initialValue: "active",
    }),
    defineField({ name: "notes", title: "Notes", type: "richBody" }),
    defineField({
      name: "extraPhotos",
      title: "Extra photos",
      type: "array",
      of: [defineArrayMember({ type: "image", options: { hotspot: true } })],
    }),
  ],
  orderings: [{ title: "Start, newest", name: "startDesc", by: [{ field: "start", direction: "desc" }] }],
  preview: { select: { title: "title", subtitle: "start", media: "image" } },
});

export const submission = defineType({
  name: "submission",
  title: "Form submission",
  type: "document",
  readOnly: true,
  fields: [
    defineField({ name: "form", title: "Form", type: "string", options: { list: ["pitch", "sponsor"] } }),
    defineField({
      name: "fields",
      title: "Fields",
      type: "object",
      // The fields of both forms (spec: "The two new forms' fields"). Task 13 owns the exact set.
      fields: [
        defineField({ name: "name", title: "Name", type: "string" }),
        defineField({ name: "email", title: "Email", type: "string" }),
        defineField({ name: "talkTitle", title: "Talk title", type: "string" }),
        defineField({ name: "description", title: "Description", type: "text" }),
        defineField({ name: "format", title: "Format", type: "string" }),
        defineField({ name: "link", title: "LinkedIn or website", type: "string" }),
        defineField({ name: "months", title: "Preferred months", type: "string" }),
        defineField({ name: "company", title: "Company", type: "string" }),
        defineField({ name: "role", title: "Role", type: "string" }),
        defineField({ name: "message", title: "Message", type: "text" }),
        defineField({ name: "package", title: "Sponsor package", type: "text" }),
      ],
    }),
    defineField({
      name: "emailStatus",
      title: "Email",
      type: "string",
      options: { list: ["sent", "failed"] },
    }),
    defineField({ name: "receivedAt", title: "Received at", type: "datetime" }),
  ],
  orderings: [{ title: "Newest", name: "receivedAtDesc", by: [{ field: "receivedAt", direction: "desc" }] }],
  preview: {
    select: { form: "form", name: "fields.name", receivedAt: "receivedAt" },
    prepare: ({ form, name, receivedAt }) => ({
      title: `${form ?? "form"}: ${name ?? ""}`,
      subtitle: receivedAt,
    }),
  },
});

export const redirect = defineType({
  name: "redirect",
  title: "Redirect",
  type: "document",
  fields: [
    defineField({ name: "from", title: "From path", type: "string", validation: (r) => r.required() }),
    defineField({ name: "to", title: "To path or URL", type: "string", validation: (r) => r.required() }),
  ],
  preview: { select: { title: "from", subtitle: "to" } },
});

/**
 * Every image from the WordPress media library, kept so each old /wp-content/uploads/ address still
 * resolves to its file (ruling R13). Written once by the migration's import mode.
 */
export const mediaLibrary = defineType({
  name: "mediaLibrary",
  title: "Migrated media",
  type: "document",
  readOnly: true,
  fields: [
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [
        defineArrayMember({
          type: "image",
          fields: [defineField({ name: "originalUrl", title: "WordPress URL", type: "string" })],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Migrated media" }) },
});

export const documentTypes = [
  siteSettings,
  homepage,
  page,
  post,
  person,
  category,
  event,
  submission,
  redirect,
  mediaLibrary,
];
