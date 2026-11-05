// The way-finder's questions and scoring (blocks/way-finder/render.php and view.js).

/** The six ways in, in tie-break order: someone unsure is pointed at an event first. Each is the id of a section on Get involved. */
export const ANCHORS = ["events", "newsletter", "speak", "volunteer", "sponsor", "donate"] as const;
export type Anchor = (typeof ANCHORS)[number];

export const WAYS: Record<Anchor, [string, string]> = {
  events: ["Come to an event", "Start at a monthly social or a big night. Free, and no experience needed."],
  newsletter: ["Get the newsletter", "One email a month with dates, recaps and jobs. The lightest way to keep in touch."],
  speak: ["Give a talk", "Tell the room what you built. First-time speakers welcome; we help you shape it."],
  volunteer: ["Volunteer", "An evening a month at the door or with a camera keeps the whole thing running."],
  sponsor: ["Sponsor or partner", "Bring your company in: sponsor a night, host us, run a workshop or share openings."],
  donate: ["Donate", "Cover a night of name tags, pizza or the room. Every dollar goes to events."],
};

/** Each question, with its answers as [label, the ways it scores for, space separated]. */
export const QUESTIONS: [string, [string, string][]][] = [
  ["Which sounds most like you?", [
    ["I'm curious about AI", "events newsletter"],
    ["I build things with data or AI", "speak events"],
    ["I lead a team or a company", "sponsor events"],
    ["I want to give back", "volunteer donate"],
  ]],
  ["How much time do you have?", [
    ["A few minutes", "newsletter donate"],
    ["An evening now and then", "events volunteer"],
    ["I'd like to put real time in", "speak volunteer sponsor"],
  ]],
  ["What sounds most fun?", [
    ["Meeting people", "events volunteer"],
    ["Learning something new", "events newsletter"],
    ["Sharing what I know", "speak"],
    ["Making it possible for others", "sponsor donate"],
  ]],
];

/** The way with the most points across the chosen answers' score strings; ties go to the earlier way. */
export function recommend(chosen: string[]): Anchor {
  const score: Record<string, number> = {};
  for (const value of chosen) for (const w of value.split(" ").filter(Boolean)) score[w] = (score[w] ?? 0) + 1;
  return ANCHORS.reduce((best, w) => ((score[w] ?? 0) > (score[best] ?? 0) ? w : best), ANCHORS[0]);
}
