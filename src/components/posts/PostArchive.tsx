import { notFound } from "next/navigation";
import { Main } from "@/components/Main";
import { Pagination } from "@/components/Pagination";
import { listPosts } from "@/lib/content/queries";
import { BLOG_PATH, pageWindow, POSTS_PER_PAGE } from "@/lib/posts";
import { Badges, Byline, FeaturedImage, PostDate, PostExcerpt, PostTitleLink } from "./PostParts";

const QUERY = "wp-block-query is-layout-flow wp-block-query-is-layout-flow";
const LIST = "wp-block-post-template is-layout-flow wp-block-post-template-is-layout-flow";

const hrefFrom = (base: string) => (n: number) => (n <= 1 ? base : `${base}/page/${n}`);

// core/query-no-results: WordPress wraps the message in its own div.
const NoResults = () => (
  <div className="wp-block-query-no-results">
    <p className="wp-block-paragraph">Nothing here yet.</p>
  </div>
);

/** templates/index.html: the Blog page: title, date and excerpt per post. */
export async function BlogIndex({ page }: { page: number }) {
  const { posts, total } = await listPosts({ page });
  const { pages } = pageWindow(total, POSTS_PER_PAGE);
  if (page > pages) notFound();
  return (
    <Main>
      <h1 className="wp-block-heading">Blog</h1>
      <div className={QUERY}>
        {posts.length ? (
          <ul className={LIST}>
            {posts.map((p) => (
              <li key={p._id} className="wp-block-post">
                <PostTitleLink post={p} />
                <PostDate iso={p.publishedAt} />
                <PostExcerpt post={p} />
              </li>
            ))}
          </ul>
        ) : (
          <NoResults />
        )}
        <Pagination page={page} pages={pages} hrefFor={hrefFrom(BLOG_PATH)} />
      </div>
    </Main>
  );
}

/**
 * templates/archive.html (category and author): archive title, optional description, then each post
 * with image, title, byline, badges and excerpt. `base` is the archive's own path, the root of its pages.
 */
export async function PostArchive({
  page,
  base,
  title,
  description,
  category,
  author,
  month,
}: {
  page: number;
  base: string;
  title: string;
  description?: string | null;
  category?: string;
  author?: string;
  /** A date archive: a month with no posts is a 404 rather than an empty page. */
  month?: { year: number; month: number };
}) {
  const { posts, total } = await listPosts({ page, category, author, month });
  if (month && !total) notFound();
  const { pages } = pageWindow(total, POSTS_PER_PAGE);
  if (page > pages) notFound();
  return (
    <Main>
      <h1 className="wp-block-query-title">{title}</h1>
      {description ? (
        <div className="wp-block-term-description">
          <p>{description}</p>
        </div>
      ) : null}
      <div className={QUERY}>
        {posts.length ? (
          <ul className={LIST}>
            {posts.map((p) => (
              <li key={p._id} className="wp-block-post">
                <FeaturedImage post={p} link />
                <PostTitleLink post={p} />
                <Byline post={p} />
                <Badges post={p} />
                <PostExcerpt post={p} />
              </li>
            ))}
          </ul>
        ) : (
          <NoResults />
        )}
        <Pagination page={page} pages={pages} hrefFor={hrefFrom(base)} />
      </div>
    </Main>
  );
}
