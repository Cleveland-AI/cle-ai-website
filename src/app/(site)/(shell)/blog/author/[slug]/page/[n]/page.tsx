import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArchive } from "@/components/posts/PostArchive";
import { getAuthor, getAuthorSlugs } from "@/lib/content/queries";
import { pageNumber } from "@/lib/posts";
import { buildMetadata, pageTitle } from "@/lib/seo";

type Props = { params: Promise<{ slug: string; n: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  // Cache Components needs a param per slug; page 2 stands in and 404s when there is only one page.
  const slugs = await getAuthorSlugs();
  return (slugs.length ? slugs : ["none-yet"]).map((slug) => ({ slug, n: "2" }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const c = await getAuthor(slug);
  return c ? buildMetadata({ title: pageTitle(c.name ?? "", Number(n)), path: `/blog/author/${slug}/page/${n}` }) : {};
}

/** Archive page n (n >= 2); page 1 redirects to the archive (next.config.ts). */
export default async function Page({ params }: Props) {
  const { slug, n } = await params;
  const page = pageNumber(n);
  const c = await getAuthor(slug);
  if (!page || !c) notFound();
  return <PostArchive page={page} base={`/blog/author/${slug}`} title={`Author: ${c.name}`} description={null} author={slug} />;
}
