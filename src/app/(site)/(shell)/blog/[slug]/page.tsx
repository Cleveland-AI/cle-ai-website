import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Main } from "@/components/Main";
import { Badges, Byline, FeaturedImage } from "@/components/posts/PostParts";
import { RichBody } from "@/components/RichBody";
import { HydrationPending } from "@/lib/hydrating.client";
import { adjacentPosts, getPost, getPostSlugs } from "@/lib/content/queries";
import { excerptOf, postPath } from "@/lib/posts";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return (slugs.length ? slugs : ["no-posts-yet"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return buildMetadata({ title: post.title, excerpt: excerptOf(post), seo: post.seo, image: post.featuredImage, path: postPath(slug), type: "article" });
}

/** templates/single.html, without the comments area. */
export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const { previous, next } = await adjacentPosts(post);
  return (
    <Main>
      <h1 className="wp-block-post-title">{post.title}</h1>
      <Byline post={post} />
      <Badges post={post} />
      <FeaturedImage post={post} wide />
      <div className="entry-content wp-block-post-content has-global-padding is-layout-constrained wp-block-post-content-is-layout-constrained">
        <RichBody value={post.body} />
        {/* Figures in the body count up only once this page has hydrated (the layout hydrates first). */}
        <HydrationPending />
      </div>
      <hr className="wp-block-separator has-alpha-channel-opacity" />
      <div className="wp-block-group is-content-justification-space-between is-layout-flex wp-container-core-group-is-layout-ae898cc6 wp-block-group-is-layout-flex">
        {previous ? (
          <div className="post-navigation-link-previous wp-block-post-navigation-link">
            <a href={postPath(previous.slug)} rel="prev">
              Previous
            </a>
          </div>
        ) : null}
        {next ? (
          <div className="post-navigation-link-next wp-block-post-navigation-link">
            <a href={postPath(next.slug)} rel="next">
              Next
            </a>
          </div>
        ) : null}
      </div>
    </Main>
  );
}
