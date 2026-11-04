import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArchive } from "@/components/posts/PostArchive";
import { getCategory, getCategorySlugs } from "@/lib/content/queries";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return (slugs.length ? slugs : ["none-yet"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  return c ? buildMetadata({ title: c.title ?? "", excerpt: c.description, path: `/blog/category/${slug}` }) : {};
}

/** templates/archive.html for a category. */
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) notFound();
  return <PostArchive page={1} base={`/blog/category/${slug}`} title={`Category: ${c.title}`} description={c.description} category={slug} />;
}
