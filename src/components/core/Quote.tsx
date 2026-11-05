import type { Quote as QuoteValue } from "@/lib/content/types";

export function Quote({ value }: { value: QuoteValue }) {
  const cite = [value.citeName, value.citeTitle].filter(Boolean).join(", ");
  return (
    // As WordPress renders core/quote: a flow-layout container whose text is a core/paragraph.
    <blockquote className="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow">
      <p className="wp-block-paragraph">{value.text}</p>
      {cite ? <cite>{cite}</cite> : null}
    </blockquote>
  );
}
