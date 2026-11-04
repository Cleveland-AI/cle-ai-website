import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { Beads } from "./Beads.client";

export type BeadMilestone = { _key?: string; year?: string | null; title?: string | null; body?: string | null };
export type BeadTimelineAttrs = { milestones?: BeadMilestone[] | null; open?: number | null };

/**
 * cle/bead-timeline: one clay bead per milestone on a cord. Each bead is a button that opens its story
 * below the cord; the latest is open to start (or `open`, counting from 0). Without JavaScript every
 * story shows as a list.
 */
export function BeadTimeline(props: BlockSupports & BeadTimelineAttrs) {
  const [supports, a] = splitSupports(props);
  const items = (a.milestones ?? []).filter((m) => (m.year ?? "").trim() !== "");
  if (!items.length) return null;
  const open = Number.isInteger(a.open ?? -1) && (a.open ?? -1) >= 0 && (a.open ?? -1) < items.length ? (a.open as number) : items.length - 1;
  return (
    <Beads
      wrapper={wrapperProps("bead-timeline", "cle-beads", supports)}
      open={open}
      items={items.map((m) => ({ year: m.year ?? "", title: m.title ?? "", body: m.body ?? "" }))}
    />
  );
}
