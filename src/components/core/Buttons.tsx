import type { Buttons as ButtonsValue } from "@/lib/content/types";

export function Buttons({ value }: { value: ButtonsValue }) {
  const items = value.items ?? [];
  if (!items.length) return null;
  return (
    <div className="wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex">
      {items.map((b) => (
        <div key={b._key} className={b.style === "outline" ? "wp-block-button is-style-outline" : "wp-block-button"}>
          <a className="wp-block-button__link wp-element-button" href={b.href || undefined}>
            {b.label}
          </a>
        </div>
      ))}
    </div>
  );
}
