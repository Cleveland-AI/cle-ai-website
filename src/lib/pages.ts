import { TEXT_STYLES } from "@/components/core/textStyles";
import type { RichBody } from "@/lib/content/types";

type Node = { _type?: string; style?: string; html?: string; children?: unknown[]; columns?: unknown[] };

/**
 * Port of functions.php's `str_contains( post_content, '<h1' )`: a page whose body brings its own
 * headline (an h1-style text block, or raw HTML with an <h1) doesn't repeat the page title above it.
 */
export function hasOwnHeadline(body: RichBody | null | undefined): boolean {
  const walk = (nodes: unknown[] | undefined): boolean =>
    (nodes ?? []).some((n) => {
      const node = n as Node;
      if (node?._type === "block") return node.style != null && TEXT_STYLES[node.style]?.tag === "h1";
      if (node?._type === "rawHtml") return /<h1[\s>]/i.test(node.html ?? "");
      return walk(node?.children) || walk(node?.columns);
    });
  return walk(body ?? undefined);
}
