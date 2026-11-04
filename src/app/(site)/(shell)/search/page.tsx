import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Mascot } from "@/blocks/mascot/Mascot";
import { Main } from "@/components/Main";
import { Pagination } from "@/components/Pagination";
import { SearchForm } from "@/components/SearchForm";
import { search, SEARCH_PER_PAGE, type SearchResult } from "@/lib/content/queries";
import { buildMetadata, searchTitle } from "@/lib/seo";
import { excerptOf, pageWindow, postAtom, postDate, postPath } from "@/lib/posts";

// WordPress keeps search results out of the index; the canonical is the bare search page.
type Props = { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// WordPress titles it "Search Results for “q”".
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = first((await searchParams).q).trim().slice(0, 200);
  return buildMetadata({ title: searchTitle(q), path: "/search", noindex: true });
}
const href = (r: SearchResult) => (r.type === "post" ? postPath(r.slug) : r.type === "event" ? `/events/${r.slug}` : `/${r.slug}`);

/** templates/search.html: "Search results for: “…”", the search box, then title, date and excerpt per hit. */
export default function SearchPage({ searchParams }: Props) {
  // The query string makes this page dynamic; everything that reads it sits inside the boundary.
  return (
    <Main>
      <Suspense fallback={null}>
        <Results searchParams={searchParams} />
      </Suspense>
    </Main>
  );
}

async function Results({ searchParams }: Props) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 200);
  const page = Math.max(1, Math.trunc(Number(first(sp.page))) || 1);
  const { results, total } = await search(q, page);
  const { pages } = pageWindow(total, SEARCH_PER_PAGE);
  const pageHref = (n: number) => `/search?q=${encodeURIComponent(q)}${n > 1 ? `&page=${n}` : ""}`;
  return (
    <>
      <h1 className="wp-block-query-title">{`Search results for: “${q}”`}</h1>
      <SearchForm defaultValue={q} />
      <div className="wp-block-query is-layout-flow wp-block-query-is-layout-flow">
        {results.length ? (
          <ul className="wp-block-post-template is-layout-flow wp-block-post-template-is-layout-flow">
            {results.map((r) => {
              const text = excerptOf({ excerpt: r.excerpt, body: r.body as never });
              return (
                <li key={r._id} className="wp-block-post">
                  <h2 className="wp-block-post-title has-xl-font-size">
                    <a href={href(r)} target="_self">
                      {r.title}
                    </a>
                  </h2>
                  {r.date ? (
                    <div className="wp-block-post-date">
                      <time dateTime={postAtom(r.date)}>{postDate(r.date)}</time>
                    </div>
                  ) : null}
                  {text ? (
                    <div className="wp-block-post-excerpt">
                      <p className="wp-block-post-excerpt__excerpt">{text}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          // core/query-no-results wraps them, so the flow layout's block gap doesn't reach them (as in WP).
          <div className="wp-block-query-no-results">
            <Mascot pose="search" width={220} />
            <p className="wp-block-paragraph">
              Dot looked everywhere and found nothing. Try different words, or browse the <Link href="/">homepage</Link>.
            </p>
          </div>
        )}
        <Pagination page={page} pages={pages} hrefFor={pageHref} />
      </div>
    </>
  );
}
