import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArchive } from "@/components/posts/PostArchive";
import { getPostMonths } from "@/lib/content/queries";
import { monthTitle, pageNumber, parseMonth } from "@/lib/posts";
import { buildMetadata, pageTitle } from "@/lib/seo";

type Props = { params: Promise<{ slug: string; month: string; n: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  // Page 2 of each month with posts stands in for the rest and 404s when the month has one page.
  const months = await getPostMonths();
  return (months.length ? months : [{ year: 1970, month: 1 }]).map((m) => ({
    slug: String(m.year),
    month: String(m.month).padStart(2, "0"),
    n: "2",
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, month, n } = await params;
  const m = parseMonth(slug, month);
  return m ? buildMetadata({ title: pageTitle(monthTitle(m.year, m.month), Number(n)), path: `/blog/${slug}/${month}/page/${n}` }) : {};
}

/** Date archive page n (n >= 2); page 1 redirects to the month (next.config.ts). */
export default async function DateArchivePage({ params }: Props) {
  const { slug, month, n } = await params;
  const m = parseMonth(slug, month);
  const page = pageNumber(n);
  if (!m || !page) notFound();
  return (
    <PostArchive page={page} base={`/blog/${slug}/${month}`} title={`Month: ${monthTitle(m.year, m.month)}`} month={m} />
  );
}
