// "New post" starters: one per post kind, each pre-filling `kind` and a starter body.
// Bracketed text is for the writer to replace.
import type { Template } from "sanity";

const key = () => Math.random().toString(36).slice(2, 10);

const text = (value: string, style = "normal") => ({
  _type: "block",
  _key: key(),
  style,
  markDefs: [],
  children: [{ _type: "span", _key: key(), text: value, marks: [] }],
});

export const starterBodies = {
  recap: () => [
    {
      _type: "section",
      _key: key(),
      className: "cle-recap-writeup",
      children: [
        text("What happened", "h2"),
        text("[The write-up: who spoke, what they covered, what people asked.]"),
      ],
    },
    {
      _type: "section",
      _key: key(),
      className: "cle-recap-gallery",
      children: [text("Photos", "h2")],
    },
    {
      _type: "quote",
      _key: key(),
      text: "[A line a speaker said, word for word.]",
      citeName: "[Speaker name]",
      citeTitle: "[Speaker title]",
    },
  ],
  newsletter: () => [
    text("This month", "h2"),
    text("[The month in a few lines.]"),
    text("Coming up", "h2"),
    text("[Next events.]"),
  ],
  article: () => [text("[Start writing.]")],
  announcement: () => [
    text("[What's happening, when and where.]"),
    {
      _type: "buttons",
      _key: key(),
      items: [
        {
          _type: "button",
          _key: key(),
          label: "RSVP on Meetup",
          href: "https://www.meetup.com/cleveland-ai-data/",
          style: "fill",
        },
      ],
    },
  ],
} as const;

const TITLES: Record<keyof typeof starterBodies, string> = {
  recap: "Event recap",
  newsletter: "Newsletter",
  article: "Article",
  announcement: "Announcement",
};

export const postTemplates: Template[] = (Object.keys(starterBodies) as (keyof typeof starterBodies)[]).map(
  (kind) => ({
    id: `post-${kind}`,
    title: TITLES[kind],
    schemaType: "post",
    value: () => ({ kind, body: starterBodies[kind]() }),
  }),
);
