export type GiftStep = { amount?: number | null; label?: string | null; art?: string | null };

export const DEFAULT_STEPS: GiftStep[] = [
  { amount: 25, label: "Name tags and markers for a night", art: "gift-name-tags" },
  { amount: 55, label: "Coffee for a morning workshop", art: "gift-coffee" },
  { amount: 100, label: "Pizza for a monthly social", art: "perk-pizza" },
  { amount: 250, label: "Chairs and setup for a workshop", art: "gift-chairs" },
  { amount: 500, label: "Projector and sound for a talk night", art: "perk-screen" },
  { amount: 1000, label: "The room for a big night", art: "perk-door" },
];

/** "$1,000": a fixed locale, so the server and the browser agree. */
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/** The steps that have an amount, smallest first. */
export const cleanSteps = (steps: GiftStep[]): { amount: number; label: string; art: string }[] =>
  steps
    .filter((s) => Number(s.amount ?? 0) > 0)
    .map((s) => ({ amount: Number(s.amount), label: s.label ?? "", art: s.art ?? "" }))
    .sort((a, b) => a.amount - b.amount);

/** The starting step, kept inside the list. */
export const clampStart = (start: number | null | undefined, length: number) =>
  Math.max(0, Math.min(length - 1, Math.trunc(Number(start ?? 2)) || 0));
