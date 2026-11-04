import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { WayFinderView } from "./WayFinder.client";

export type WayFinderAttrs = { heading?: string | null; intro?: string | null; art?: string | null };

/**
 * cle/way-finder: three questions; the top-scoring way in is recommended with a link to its section of the
 * page. Without scripts the answers do nothing and the page's own sections are right below.
 */
export function WayFinder(props: BlockSupports & WayFinderAttrs) {
  const [supports, a] = splitSupports(props);
  return (
    <WayFinderView
      wrapper={wrapperProps("way-finder", "cle-finder", supports)}
      heading={a.heading ?? "Not sure where to start?"}
      intro={a.intro ?? "Three taps and we'll point you the right way."}
      art={a.art ?? "signpost"}
    />
  );
}
