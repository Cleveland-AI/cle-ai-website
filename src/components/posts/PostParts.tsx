import { Fragment } from "react";
import { imageUrl } from "@/components/core/Image";
import type { PostCard } from "@/lib/content/queries";
import { authorPath, categoryPath, excerptOf, postAtom, postDate, postPath } from "@/lib/posts";

const FLEX = "is-layout-flex wp-block-group-is-layout-flex";

/** The "By <author> · <date>" line (the theme's cle-byline group). The author is dropped when unknown. */
export function Byline({ post }: { post: PostCard }) {
  const slug = post.author?.slug?.current;
  return (
    <div className={`wp-block-group cle-byline ${FLEX}`} style={{ gap: "var(--wp--preset--spacing--xxs)", flexWrap: "wrap" }}>
      <p className="wp-block-paragraph">By</p>
      {post.author?.name ? (
        <div className="wp-block-post-author-name">
          {slug ? (
            <a href={authorPath(slug)} target="_self" className="wp-block-post-author-name__link">
              {post.author.name}
            </a>
          ) : (
            post.author.name
          )}
        </div>
      ) : null}
      <p aria-hidden="true" className="wp-block-paragraph">
        ·
      </p>
      <PostDate iso={post.publishedAt} />
    </div>
  );
}

export function PostDate({ iso }: { iso: string }) {
  return (
    <div className="wp-block-post-date">
      <time dateTime={postAtom(iso)}>{postDate(iso)}</time>
    </div>
  );
}

/** One badge per category, linking to its archive. */
export function Badges({ post }: { post: PostCard }) {
  const cats = (post.categories ?? []).filter((c) => c?.slug?.current);
  if (!cats.length) return null;
  return (
    <div className="cle-badges taxonomy-category wp-block-post-terms">
      {cats.map((c, i) => (
        <Fragment key={c.slug!.current}>
          {i > 0 ? <span className="wp-block-post-terms__separator"> </span> : null}
          <a href={categoryPath(c.slug!.current!)} rel="tag">
            {c.title}
          </a>
        </Fragment>
      ))}
    </div>
  );
}

/** The featured image, or nothing at all (no wrapper) when the post has none. */
export function FeaturedImage({ post, wide, link }: { post: PostCard; wide?: boolean; link?: boolean }) {
  const src = post.featuredImage?.asset ? imageUrl(post.featuredImage, wide ? 1600 : 800) : undefined;
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- Sanity CDN already resizes
  const img = <img src={src} alt={post.title} style={link ? { height: "100%", objectFit: "cover" } : undefined} loading={link ? "lazy" : undefined} />;
  return (
    <figure
      className={`${wide ? "alignwide " : ""}wp-block-post-featured-image`}
      style={link ? { aspectRatio: "16/9" } : undefined}
    >
      {link ? (
        <a href={postPath(post.slug.current)} target="_self">
          {img}
        </a>
      ) : (
        img
      )}
    </figure>
  );
}

export function PostExcerpt({ post }: { post: PostCard }) {
  const text = excerptOf(post);
  if (!text) return null;
  return (
    <div className="wp-block-post-excerpt">
      <p className="wp-block-post-excerpt__excerpt">{text}</p>
    </div>
  );
}

export function PostTitleLink({ post }: { post: PostCard }) {
  return (
    <h2 className="wp-block-post-title has-xl-font-size">
      <a href={postPath(post.slug.current)} target="_self">
        {post.title}
      </a>
    </h2>
  );
}
