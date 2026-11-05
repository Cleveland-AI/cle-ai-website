import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventMeta } from "@/blocks/event-meta/EventMeta";
import { imageUrl } from "@/components/core/Image";
import { Main } from "@/components/Main";
import { RichBody } from "@/components/RichBody";
import { HydrationPending } from "@/lib/hydrating.client";
import { query } from "@/lib/content/client";
import { EVENT_SLUGS_QUERY, getEvent } from "@/lib/content/queries";
import { eventJsonLd } from "@/lib/events/jsonld";
import { siteNow } from "@/lib/now";
import { sanitize } from "@/lib/sanitize";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// The whole page is static: a slug that wasn't prerendered is rendered before the response starts,
// so an unknown slug gets a real 404 rather than the App Shell's 200.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = (await query<string[] | null>(EVENT_SLUGS_QUERY)) ?? [];
  // Cache Components needs at least one param to validate the route; with no events yet, a slug
  // that 404s stands in and real events render on first visit.
  return (slugs.length ? slugs : ["no-events-yet"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  return event ? buildMetadata({ title: event.title, excerpt: event.excerpt, image: event.image, path: `/events/${slug}` }) : {};
}

/** templates/single-meetup_events.html, plus the event JSON-LD that functions.php printed in wp_head. */
export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const [event, now] = await Promise.all([getEvent(slug), siteNow()]);
  if (!event) notFound();
  const image = event.image?.asset ? imageUrl(event.image) : undefined;
  const ld = eventJsonLd(event, { imageUrl: image });
  return (
    <>
      <Main>
        <h1 className="wp-block-post-title">{event.title}</h1>
        <EventMeta event={event} now={now} showStatus dateStyle="long" fontSize="m" />
        {image ? (
          <figure className="alignwide wp-block-post-featured-image">
            {/* eslint-disable-next-line @next/next/no-img-element -- Sanity CDN already resizes */}
            <img src={image} alt="" />
          </figure>
        ) : null}
        {/* Meetup's description HTML, as WordPress printed the post content, sanitized (R15). */}
        <div
          className="entry-content wp-block-post-content has-global-padding is-layout-constrained wp-block-post-content-is-layout-constrained"
          dangerouslySetInnerHTML={{ __html: sanitize(event.descriptionHtml, "eventDescription") }}
        />
        {event.notes?.length ? (
          <div className="wp-block-group cle-event-notes has-global-padding is-layout-constrained wp-block-group-is-layout-constrained">
            <RichBody value={event.notes} />
            <HydrationPending />
          </div>
        ) : null}
        <EventMeta event={event} now={now} showDate={false} showVenue={false} showRsvp={false} showOrganizer showBackLink />
      </Main>
      {ld ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      ) : null}
    </>
  );
}
