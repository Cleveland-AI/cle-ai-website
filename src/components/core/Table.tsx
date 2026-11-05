import type { Table as TableValue } from "@/lib/content/types";
import { texturizeHtml } from "@/components/core/texturize";
import { sanitize } from "@/lib/sanitize";

// Cells hold inline HTML as WordPress saved it (links in the privacy policy's tables, entities),
// cut down to links, strong, em and line breaks by the shared sanitizer (R15), with WordPress's
// smart quotes and dashes in their text (R12; Task 17 found the cells untexturized).
const html = (cell: string) => ({ dangerouslySetInnerHTML: { __html: sanitize(texturizeHtml(cell), "tableCell") } });

export function Table({ value }: { value: TableValue }) {
  const head = value.head ?? [];
  const rows = value.rows ?? [];
  return (
    // The figure scrolls sideways on phones (core table CSS), so keyboard users must be able to focus
    // it (axe scrollable-region-focusable; the theme lacks it): a named, focusable region. The table
    // schema has no caption, so the name is "Table". Invisible unless focused.
    <figure className="wp-block-table cle-table" tabIndex={0} role="region" aria-label="Table">
      <table className="has-fixed-layout">
        {head.length ? (
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} {...html(h)} />
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((r) => (
            <tr key={r._key}>
              {(r.cells ?? []).map((c, i) => (
                <td key={i} {...html(c)} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
