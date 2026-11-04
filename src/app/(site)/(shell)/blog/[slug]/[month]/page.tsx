import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArchive } from "@/components/posts/PostArchive";
import { getPostMonths } from "@/lib/content/queries";
import { monthTitle, parseMonth } from "@/lib/posts";
import { buildMetadata } from "@/lib/seo";

// The date archive, /blog/<yyyy>/<mm>. The segment is named [slug] because it shares its parent with
// the post route /blog/[slug]; here it is the year.
type Props = { params: Promise<{ slug: string; month: string }> };
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const months = await getPostMonths();
  return (months.length ? months : [{ year: 1970, month: 1 }]).map((m) => ({
    slug: String(m.year),
    month: String(m.month).padStart(2, "0"),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, month } = await params;
  const m = parseMonth(slug, month);
  return m ? buildMetadata({ title: monthTitle(m.year, m.month), path: `/blog/${slug}/${month}` }) : {};
}

/** archive.html for a month. An empty month, or a year/month that isn't one, is a 404. */
export default async function DateArchive({ params }: Props) {
  const { slug, month } = await params;
  const m = parseMonth(slug, month);
  if (!m) notFound();
  return <PostArchive page={1} base={`/blog/${slug}/${month}`} title={`Month: ${monthTitle(m.year, m.month)}`} month={m} />;
}
