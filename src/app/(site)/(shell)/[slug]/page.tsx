import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { imageUrl } from "@/components/core/Image";
import { RichBody } from "@/components/RichBody";
import { HydrationPending } from "@/lib/hydrating.client";
import { getPage, getPageSlugs } from "@/lib/content/queries";
import { hasOwnHeadline } from "@/lib/pages";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// Static like the events pages: an unknown slug is a real 404, not the App Shell's 200.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = await getPageSlugs();
  // Cache Components needs at least one param to validate the route; with no pages yet, a slug
  // that 404s stands in.
  return (slugs.length ? slugs : ["no-pages-yet"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page?.title) return {};
  return buildMetadata({ title: page.title, seo: page.seo, image: page.featuredImage, path: `/${slug}` });
}

const FLUSH = "wp-block-group alignfull cle-flush is-layout-flow wp-block-group-is-layout-flow";
const CONTENT =
  "entry-content alignfull wp-block-post-content has-global-padding is-layout-constrained wp-block-post-content-is-layout-constrained";

/**
 * templates/page.html (title, featured image, full-width content) or templates/page-landing.html
 * (content only). A body with its own h1 drops the title and the main's top padding, whichever
 * template the page uses (functions.php's post-title filter and cle-has-own-headline body class;
 * here the class sits on <main>, where theme.css matches it).
 */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page?.title) notFound();
  const ownHeadline = hasOwnHeadline(page.body as never);
  const landing = page.template === "landing";
  const image = !landing && page.featuredImage?.asset ? imageUrl(page.featuredImage) : undefined;
  const showTitle = !landing && !ownHeadline;
  return (
    <main
      id="wp--skip-link--target"
      className={`${FLUSH}${ownHeadline ? " cle-has-own-headline" : ""}`}
      style={landing ? undefined : { paddingTop: "var(--wp--preset--spacing--section)", paddingBottom: "var(--wp--preset--spacing--section)" }}
    >
      {showTitle || image ? (
        <div className="wp-block-group has-global-padding is-layout-constrained wp-block-group-is-layout-constrained">
          {showTitle ? <h1 className="wp-block-post-title">{page.title}</h1> : null}
          {image ? (
            <figure className="alignwide wp-block-post-featured-image">
              {/* eslint-disable-next-line @next/next/no-img-element -- Sanity CDN already resizes */}
              <img src={image} alt="" />
            </figure>
          ) : null}
        </div>
      ) : null}
      <div className={CONTENT}>
        <RichBody value={page.body as never} />
        {/* Figures in the body count up only once this page has hydrated (the layout hydrates first). */}
        <HydrationPending />
      </div>
    </main>
  );
}
