/**
 * A port of the theme's clay style audit (tests/browser/clay-audit.js at the repo root), kept rule
 * for rule: run in the page with page.evaluate(clayAudit). It lists components that break the clay
 * rules: hard 1px borders, flat or square buttons, flat fields, cards without the raised shadow, and
 * shadows heavier than subtle. Each entry is "<tag.classes> | <issues>", one per distinct signature.
 */
export function clayAudit(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const page = getComputedStyle(document.body).backgroundColor;
  const isVis = (el: Element) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };
  const parseShadow = (s: string) => (s === "none" ? [] : s.split(/,(?![^(]*\))/).map((x) => x.trim()));
  const maxBlur = (s: string) =>
    Math.max(
      0,
      ...parseShadow(s)
        .filter((x) => !x.includes("inset"))
        .map((x) => {
          const n = x
            .replace(/rgba?\([^)]*\)|color-mix\([^)]*\)/g, "")
            .trim()
            .split(/\s+/)
            .map(parseFloat)
            .filter((v) => !isNaN(v));
          return (n[2] || 0) + Math.abs(n[3] || 0);
        }),
    );
  const sig = (el: Element) =>
    (
      el.tagName.toLowerCase() +
      "." +
      [...el.classList]
        .filter((c) => !/^(wp-container|is-layout|wp-elements|has-|is-style-[a-z-]*-[0-9]|align)/.test(c))
        .slice(0, 3)
        .join(".")
    ).replace(/\.$/, "");
  const els = document.querySelectorAll("body *:not(script):not(style):not(svg *):not(br)");
  for (const el of Array.from(els)) {
    if (!isVis(el) || el.closest("#wpadminbar")) continue;
    const s = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const type = (el as HTMLInputElement).type ?? "";
    const side = ["Top", "Right", "Bottom", "Left"] as const;
    const bw = side.map((k) =>
      parseFloat(s[`border${k}Width`]) && s[`border${k}Style`] !== "none" ? parseFloat(s[`border${k}Width`]) : 0,
    );
    const hasBorder = bw.some((w) => w > 0);
    const bg = s.backgroundColor;
    const hasBg = bg !== "rgba(0, 0, 0, 0)" && bg !== page;
    const radius = parseFloat(s.borderTopLeftRadius) || 0;
    const shadow = s.boxShadow;
    const control =
      /^(button|input|select|textarea|summary)$/.test(tag) ||
      el.classList.contains("wp-element-button") ||
      el.classList.contains("wp-block-button__link");
    const boxy = hasBg && (parseFloat(s.paddingTop) >= 8 || parseFloat(s.paddingLeft) >= 8) && el.getBoundingClientRect().width > 40;
    const issues: string[] = [];
    if (hasBorder && !["hr"].includes(tag)) {
      const thin = bw.filter((w) => w > 0 && w <= 1.5).length;
      if (thin) issues.push("hard " + bw.join("/") + "px border " + s.borderTopColor);
    }
    if ((control && tag !== "input" && tag !== "summary") || (tag === "input" && /submit|button/.test(type))) {
      if (radius < 12) issues.push("button radius " + radius);
      if (shadow === "none") issues.push("flat button");
      if (maxBlur(shadow) > 20) issues.push("heavy shadow " + maxBlur(shadow).toFixed(0) + "px");
    } else if (/^(input|select|textarea)$/.test(tag) && !/checkbox|radio|hidden|range/.test(type)) {
      if (shadow === "none") issues.push("flat field (no inset)");
      if (radius < 8) issues.push("field radius " + radius);
    } else if (boxy) {
      if (radius < 8) issues.push("square card r=" + radius);
      if (shadow === "none" && radius >= 8) issues.push("flat card");
      if (maxBlur(shadow) > 22) issues.push("heavy shadow " + maxBlur(shadow).toFixed(0) + "px");
    } else if (shadow !== "none" && maxBlur(shadow) > 22) {
      issues.push("heavy shadow " + maxBlur(shadow).toFixed(0) + "px");
    }
    if (
      /^(img)$/.test(tag) &&
      el.closest(".wp-block-image, figure") &&
      radius < 6 &&
      el.getBoundingClientRect().width > 120 &&
      !(el as HTMLImageElement).src.includes("illustrations")
    )
      issues.push("square photo");
    if (/^(table|th|td)$/.test(tag) && hasBorder) issues.push("table rules");
    if (!issues.length) continue;
    const key = sig(el) + " | " + issues.join("; ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
