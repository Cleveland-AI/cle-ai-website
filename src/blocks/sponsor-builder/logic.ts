// The sponsorship builder's rules (blocks/sponsor-builder/render.php and view.js), free of React so the
// server render, the client component and the unit tests share them.

export type Perk = { label?: string | null; desc?: string | null; art?: string | null; weight?: number | null };
export type Tier = { name?: string | null; min?: number | null; price?: string | null };
/** What the inquiry form is told: the tier the result text names (always a string) and the picked perks' labels. */
export type PackageDetail = { tier: string; perks: string[] };

export const DEFAULT_PERKS: Perk[] = [
  { label: "Your logo on the big screen", desc: "Before every talk, at every big night this season.", art: "perk-screen", weight: 1 },
  { label: "A table at a big night", desc: "Meet a few hundred people in the hour after the talks.", art: "perk-table", weight: 2 },
  { label: "A speaking slot", desc: "Twenty minutes on what your team built.", art: "microphone", weight: 3 },
  { label: "Cover the food", desc: "Pizza and drinks for a night, with a thank-you from the stage.", art: "perk-pizza", weight: 1 },
  { label: "Host a night in your space", desc: "Your office, our crowd.", art: "perk-door", weight: 2 },
];
export const DEFAULT_TIERS: Tier[] = [
  { name: "Event sponsor", min: 1, price: "$800" },
  { name: "Season sponsor", min: 3, price: "$1,800" },
  { name: "Presenting sponsor", min: 5, price: "$2,500" },
];

export const INTRO = "Pick one or more and we will suggest a package.";
export const SUBJECT = "Sponsoring CLE AI & DATA";

/** Perks that have a label, as render.php keeps them. */
export const cleanPerks = (perks: Perk[]): (Perk & { label: string })[] =>
  perks.filter((p): p is Perk & { label: string } => (p.label ?? "").trim() !== "");

/** Tiers that have a name, lowest minimum first. */
export const cleanTiers = (tiers: Tier[]): (Tier & { name: string })[] =>
  tiers
    .filter((t): t is Tier & { name: string } => (t.name ?? "").trim() !== "")
    .sort((a, b) => (a.min ?? 0) - (b.min ?? 0));

/** Index of the highest tier whose minimum the total reaches, or -1 (nothing picked, or below every minimum). */
export function tierIndex(tiers: Tier[], total: number): number {
  let at = -1;
  tiers.forEach((t, i) => {
    if (total > 0 && total >= (t.min ?? 0)) at = i;
  });
  return at;
}

export type PickState = { picked: boolean[]; celebrated: boolean };

/** Toggles perk `i`. `celebrate` is true the first time the picks reach the top tier. */
export function pickPerk(state: PickState, i: number, weights: number[], tiers: Tier[]): { state: PickState; celebrate: boolean } {
  const picked = state.picked.map((p, k) => (k === i ? !p : p));
  const total = picked.reduce((sum, p, k) => sum + (p ? (weights[k] ?? 0) : 0), 0);
  const at = tierIndex(tiers, total);
  const celebrate = at >= 0 && at === tiers.length - 1 && !state.celebrated;
  return { state: { picked, celebrated: state.celebrated || celebrate }, celebrate };
}

/** The sentence under the perks. */
export function resultText(labels: string[], tier: (Tier & { name: string }) | undefined): string {
  if (!labels.length) return INTRO;
  const price = tier?.price && !tier.price.includes("[") ? ` (${tier.price})` : "";
  return `${labels.length} ${labels.length === 1 ? "pick" : "picks"}${tier ? `: that sounds like a ${tier.name.toLowerCase()}${price}.` : "."}`;
}

/** A valid-looking address, else the default (sanitize_email). */
export const cleanEmail = (email: string | null | undefined) =>
  /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test((email ?? "").trim()) ? (email as string).trim() : "info@cle-ai.com";

export const mailtoBase = (email: string) => `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}`;

/** Only https form links are accepted. */
export const cleanForm = (url: string | null | undefined) => {
  try {
    return new URL((url ?? "").trim()).protocol === "https:" ? (url as string).trim() : "";
  } catch {
    return "";
  }
};

/** The tier a package is suggested as: the highest one reached, or the first when the picks fall below every minimum ("" with no tiers). */
export const packageTier = (tiers: (Tier & { name: string })[], total: number): string => tiers[Math.max(tierIndex(tiers, total), 0)]?.name ?? "";

/**
 * The form link: its PACKAGE placeholder is replaced by the picks once there are some (until then the
 * link is left as written). Deliberately not the theme's behaviour, which also rewrote it for an empty list.
 */
export const formHref = (form: string, labels: string[]) => (labels.length ? form.replace("PACKAGE", encodeURIComponent(labels.join(", "))) : form);

/** The mailto with the picks (and the tier they add up to) already in the body. */
export function mailtoHref(base: string, labels: string[], tier: string): string {
  if (!labels.length) return base;
  const body = `We are interested in: ${labels.join(", ")}.${tier ? `\nSuggested package: ${tier}.` : ""}\n\nCompany:\nContact:\n`;
  return `${base}&body=${encodeURIComponent(body)}`;
}

/**
 * The button. When the sponsor inquiry form (#sponsor-inquiry, Task 13) is on the page: tell it the
 * package (`cle:sponsor-package` on window, detail {tier, perks}; not sent when nothing is picked), scroll
 * to it, and return true so the click's default is cancelled. Otherwise return false and the link (the form URL or the mailto) is followed.
 */
export function requestPackage(detail: PackageDetail): boolean {
  const target = document.getElementById("sponsor-inquiry");
  if (!target) return false;
  if (detail.perks.length) window.dispatchEvent(new CustomEvent("cle:sponsor-package", { detail }));
  target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return true;
}
