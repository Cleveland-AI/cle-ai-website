// The six story icons, inlined so their strokes can be animated with CSS (port of
// cle-ai-theme/inc/icons.php). The strings are public/assets/icons/<slug>.svg, trimmed; a unit test
// keeps them identical to the files.

export const ICON_SLUGS = ["chat","beer","hotdog","calendar","pin","headphones"] as const;
export type IconSlug = (typeof ICON_SLUGS)[number];

const SVG: Record<IconSlug, string> = {
  chat:
    "<svg class=\"cle-icon cle-icon--chat\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path pathLength=\"1\" d=\"M24 8C14 8 6 14.3 6 22.2c0 4.4 2.5 8.3 6.4 10.9L10 40l8.3-4.3c1.8.5 3.7.7 5.7.7 10 0 18-6.3 18-14.2S34 8 24 8z\"/></svg>",
  beer:
    "<svg class=\"cle-icon cle-icon--beer\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path pathLength=\"1\" d=\"M14 14h20s1 9-2 15c-1.6 3.2-4.6 5-8 5s-6.4-1.8-8-5c-3-6-2-15-2-15z\"/><path pathLength=\"1\" d=\"M24 34v7M17 42h14\"/><path pathLength=\"1\" d=\"M14 14c-1.2-3.4 1.6-6 4.2-5.2.9-2.6 4.4-3.3 6-1.4 1.9-1.6 5.2-.8 5.9 1.6 2.8-.5 4.8 1.8 3.9 5\"/><circle pathLength=\"1\" cx=\"21\" cy=\"21\" r=\"1\"/><circle pathLength=\"1\" cx=\"26\" cy=\"25\" r=\"1\"/><circle pathLength=\"1\" cx=\"22.5\" cy=\"28\" r=\"1\"/></svg>",
  hotdog:
    "<svg class=\"cle-icon cle-icon--hotdog\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><rect pathLength=\"1\" x=\"4\" y=\"15\" width=\"40\" height=\"9\" rx=\"4.5\"/><path pathLength=\"1\" d=\"M7 22c0 6 3 10 8 10h18c5 0 8-4 8-10\"/><path pathLength=\"1\" d=\"M11 19.5c2-2 4 2 6 0s4 2 6 0 4 2 6 0 4 2 6 0\"/></svg>",
  calendar:
    "<svg class=\"cle-icon cle-icon--calendar\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><rect pathLength=\"1\" x=\"7\" y=\"10\" width=\"34\" height=\"31\" rx=\"4\"/><path pathLength=\"1\" d=\"M7 18h34M16 6v8M32 6v8\"/><rect pathLength=\"1\" x=\"13\" y=\"23\" width=\"4\" height=\"4\" rx=\"1\"/><rect pathLength=\"1\" x=\"22\" y=\"23\" width=\"4\" height=\"4\" rx=\"1\"/><rect pathLength=\"1\" x=\"31\" y=\"23\" width=\"4\" height=\"4\" rx=\"1\"/><rect pathLength=\"1\" x=\"13\" y=\"31\" width=\"4\" height=\"4\" rx=\"1\"/><rect pathLength=\"1\" x=\"22\" y=\"31\" width=\"4\" height=\"4\" rx=\"1\"/><rect pathLength=\"1\" x=\"31\" y=\"31\" width=\"4\" height=\"4\" rx=\"1\"/></svg>",
  pin:
    "<svg class=\"cle-icon cle-icon--pin\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path pathLength=\"1\" d=\"M24 43s13-12.6 13-23a13 13 0 0 0-26 0c0 10.4 13 23 13 23z\"/><circle pathLength=\"1\" cx=\"24\" cy=\"20\" r=\"5\"/></svg>",
  headphones:
    "<svg class=\"cle-icon cle-icon--headphones\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path pathLength=\"1\" d=\"M8 31v-7a16 16 0 0 1 32 0v7\"/><rect pathLength=\"1\" x=\"6\" y=\"29\" width=\"7\" height=\"12\" rx=\"3\"/><rect pathLength=\"1\" x=\"35\" y=\"29\" width=\"7\" height=\"12\" rx=\"3\"/></svg>",
};

const isSlug = (slug: string): slug is IconSlug => (ICON_SLUGS as readonly string[]).includes(slug);

/** Inline SVG markup for one icon, or "" for an unknown slug. An extra class goes before "cle-icon". */
export function cleIcon(slug: string, className = ""): string {
  if (!isSlug(slug)) return "";
  const svg = SVG[slug];
  return className === "" ? svg : svg.replace('class="cle-icon', `class="${escapeAttr(className)} cle-icon`);
}

/** slug => inline SVG, for every icon. */
export function iconsAll(): Record<IconSlug, string> {
  return Object.fromEntries(ICON_SLUGS.map((slug) => [slug, cleIcon(slug)])) as Record<IconSlug, string>;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
