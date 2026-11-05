import type { Separator as SeparatorValue } from "@/lib/content/types";

export function Separator({ value }: { value: SeparatorValue }) {
  const style = value.style && value.style !== "default" ? ` is-style-${value.style}` : "";
  return <hr className={`wp-block-separator has-alpha-channel-opacity${style}`} />;
}
