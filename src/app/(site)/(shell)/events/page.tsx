import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { EventsArchive } from "@/components/events/EventsArchive";

// WordPress titles the archive after the post type's label.
export const metadata: Metadata = buildMetadata({ title: "Meetup Events", path: "/events" });

// Fully static (cached events and clock); later pages of past events are /events/page/<n>.
export const ensureStatic = "navigation";

export default function EventsPage() {
  return <EventsArchive page={1} />;
}
