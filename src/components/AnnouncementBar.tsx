import { NextEvent } from "@/blocks/next-event/NextEvent";
import { getSiteSettings } from "@/lib/content/queries";

/**
 * parts/announcement-bar.html: the next event as an indigo bar above the header, on every page but
 * the homepage. The label, RSVP label and empty message come from site settings.
 */
export async function AnnouncementBar() {
  const { announcement } = await getSiteSettings();
  return (
    <div className="wp-block-template-part">
      <NextEvent
        layout="bar"
        eyebrow={announcement?.label || "Next"}
        rsvpLabel={announcement?.rsvpLabel || "RSVP on Meetup"}
        emptyText={announcement?.emptyMessage || "No meetup on the calendar yet."}
        emptyLinkLabel="Read the newsletter"
        emptyLink="https://timcleaidata.substack.com/"
        align="full"
        backgroundColor="indigo"
        textColor="paper"
      />
    </div>
  );
}
