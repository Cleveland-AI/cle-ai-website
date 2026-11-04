import { Fragment } from "react";

const END_SIZE = 1;
const MID_SIZE = 2;

/** paginate_links' window (end_size 1, mid_size 2): page numbers with "dots" where a run is skipped. */
export function pageItems(page: number, pages: number): (number | "dots")[] {
  const items: (number | "dots")[] = [];
  let dots = false;
  for (let n = 1; n <= pages; n++) {
    if (n === page || n <= END_SIZE || (n >= page - MID_SIZE && n <= page + MID_SIZE) || n > pages - END_SIZE) {
      items.push(n);
      dots = true;
    } else if (dots) {
      items.push("dots");
      dots = false;
    }
  }
  return items;
}

/** core/query-pagination: Previous Page, the numbers, Next Page. Nothing when there is one page. */
export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (n: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="wp-block-query-pagination is-layout-flex wp-block-query-pagination-is-layout-flex" aria-label="Pagination">
      {page > 1 ? (
        <a href={hrefFor(page - 1)} className="wp-block-query-pagination-previous">
          Previous Page
        </a>
      ) : null}
      <div className="wp-block-query-pagination-numbers">
        {pageItems(page, pages).map((item, i) => (
          <Fragment key={`${item}-${i}`}>
            {i > 0 ? "\n" : null}
            {item === "dots" ? (
              <span className="page-numbers dots">…</span>
            ) : item === page ? (
              <span aria-current="page" className="page-numbers current">
                {item}
              </span>
            ) : (
              <a className="page-numbers" href={hrefFor(item)}>
                {item}
              </a>
            )}
          </Fragment>
        ))}
      </div>
      {page < pages ? (
        <a href={hrefFor(page + 1)} className="wp-block-query-pagination-next">
          Next Page
        </a>
      ) : null}
    </nav>
  );
}
