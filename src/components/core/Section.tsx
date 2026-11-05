import type { CSSProperties, ReactNode } from "react";
import type { Section as SectionValue } from "@/lib/content/types";

/** Parses the CSS string WordPress saved (`padding-top:var(--x);margin:0`) into a React style object. */
export function parseStyle(css?: string): CSSProperties | undefined {
  if (!css) return undefined;
  const style: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 1) continue;
    const prop = decl.slice(0, i).trim();
    const key = prop.startsWith("--") ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[key] = decl.slice(i + 1).trim();
  }
  return Object.keys(style).length ? (style as CSSProperties) : undefined;
}

export function Section({ value, children }: { value: SectionValue; children?: ReactNode }) {
  const Tag = (value.tag ?? "div") as "div";
  const layout = value.layout ?? "constrained";
  const layoutClass = layout === "default" ? "flow" : layout;
  const classes = [
    "wp-block-group",
    value.align && value.align !== "none" ? `align${value.align}` : "",
    value.className ?? "",
    value.textColor ? `has-${value.textColor}-color` : "",
    value.backgroundColor ? `has-${value.backgroundColor}-background-color` : "",
    value.textColor ? "has-text-color" : "",
    value.backgroundColor ? "has-background" : "",
    layout === "constrained" ? "has-global-padding" : "",
    `is-layout-${layoutClass}`,
    // WordPress's block-supports class for blockGap 0 (core.css): no margins between children.
    value.blockGap === "0" ? "wp-container-core-group-is-layout-59e8d3b3" : "",
    `wp-block-group-is-layout-${layoutClass}`,
  ].filter(Boolean);
  return (
    <Tag id={value.anchor || undefined} className={classes.join(" ")} style={parseStyle(value.style)}>
      {children}
    </Tag>
  );
}
