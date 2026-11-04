import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArchive } from "@/components/posts/PostArchive";
import { getAuthor, getAuthorSlugs } from "@/lib/content/queries";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = await getAuthorSlugs();
  return (slugs.length ? slugs : ["none-yet"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getAuthor(slug);
  return c ? buildMetadata({ title: c.name ?? "", path: `/blog/author/${slug}` }) : {};
}

/** templates/archive.html for a author. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const c = await getAuthor(slug);
  if (!c) notFound();
  return <PostArchive page={1} base={`/blog/author/${slug}`} title={`Author: ${c.name}`} description={null} author={slug} />;
}
