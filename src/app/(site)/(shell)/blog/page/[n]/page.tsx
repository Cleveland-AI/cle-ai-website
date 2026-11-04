import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/posts/PostArchive";
import { listPosts } from "@/lib/content/queries";
import { pageNumber, pageWindow } from "@/lib/posts";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ n: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const { pages } = pageWindow((await listPosts()).total);
  return Array.from({ length: Math.max(1, pages - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return buildMetadata({ title: `Blog – Page ${n}`, path: `/blog/page/${n}` });
}

/** Blog page n (n >= 2). /blog/page/1 redirects to /blog (next.config.ts). */
export default async function BlogPageN({ params }: Props) {
  const page = pageNumber((await params).n);
  if (!page) notFound();
  return <BlogIndex page={page} />;
}
