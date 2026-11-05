/** One Meetup event as the sync sees it, whether it came from the GraphQL API or the iCal feed. */
export type MeetupEvent = {
  /** Meetup's numeric event id (a string). */
  id: string;
  title: string;
  /** Meetup's description: HTML, or plain text with blank lines between paragraphs. */
  description?: string | null;
  /** Start: ISO 8601 with an offset, a UTC "Z" time, or a bare local (New York) time. */
  dateTime: string;
  endTime?: string | null;
  eventUrl: string;
  /** Meetup's status (ACTIVE, CANCELLED, PAST, ...); matched case-insensitively. */
  status: string;
  venue?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
  imageUrl?: string | null;
  organizer?: string | null;
  organizerUrl?: string | null;
};
