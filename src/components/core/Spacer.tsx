import type { Spacer as SpacerValue } from "@/lib/content/types";

export function Spacer({ value }: { value: SpacerValue }) {
  return <div style={{ height: value.height || "40px" }} aria-hidden="true" className="wp-block-spacer" />;
}
