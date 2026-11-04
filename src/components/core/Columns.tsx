import type { ReactNode } from "react";
import type { Columns as ColumnsValue } from "@/lib/content/types";
import { parseStyle } from "@/components/core/Section";

type ColumnItem = NonNullable<ColumnsValue["columns"]>[number];

export function Columns({ value, children }: { value: ColumnsValue; children: ReactNode }) {
  const classes = [
    "wp-block-columns",
    value.align && value.align !== "none" ? `align${value.align}` : "",
    value.verticalAlignment ? `are-vertically-aligned-${value.verticalAlignment}` : "",
    value.className ?? "",
    "is-layout-flex",
    // WordPress's block-supports class for a columns block that stacks on mobile: flex-wrap: nowrap
    // above the breakpoint (every columns block in the theme carries one of these equivalent hashes).
    "wp-container-core-columns-is-layout-e22c4a5e",
    "wp-block-columns-is-layout-flex",
  ].filter(Boolean);
  return (
    <div className={classes.join(" ")} style={parseStyle(value.style)}>
      {children}
    </div>
  );
}

export function Column({ value, children }: { value: ColumnItem; children?: ReactNode }) {
  const classes = [
    "wp-block-column",
    value.verticalAlignment ? `is-vertically-aligned-${value.verticalAlignment}` : "",
    value.className ?? "",
    "is-layout-flow",
    "wp-block-column-is-layout-flow",
  ].filter(Boolean);
  return (
    <div className={classes.join(" ")} style={value.width ? { flexBasis: value.width } : undefined}>
      {children}
    </div>
  );
}
