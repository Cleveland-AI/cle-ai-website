import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsArchive, pastPageCount } from "@/components/events/EventsArchive";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ n: string }> };

// Static like /events. A page number that wasn't prerendered renders before the response starts, so
// one past the last page is a real 404.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const pages = await pastPageCount();
  // At least one param (Cache Components): with a single page, /events/page/2 stands in and 404s.
  return Array.from({ length: Math.max(1, pages - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return buildMetadata({ title: `Meetup Events – Page ${n}`, path: `/events/page/${n}` });
}

/** Past events, page n (n ≥ 2). /events/page/1 redirects to /events (next.config.ts). */
export default async function EventsPageN({ params }: Props) {
  const { n } = await params;
  if (!/^[1-9]\d{0,3}$/.test(n) || n === "1") notFound();
  return <EventsArchive page={Number(n)} />;
}
