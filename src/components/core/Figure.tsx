import type { Figure as FigureValue } from "@/lib/content/types";

/** The big-number figure: a group holding the number paragraph, then the label paragraph. */
export function Figure({ value }: { value: FigureValue }) {
  return (
    <div className="wp-block-group cle-figure is-layout-flow wp-block-group-is-layout-flow">
      <p className="wp-block-paragraph">{value.number}</p>
      <p className="wp-block-paragraph">{value.label}</p>
    </div>
  );
}
