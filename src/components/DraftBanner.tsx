import { draftMode } from "next/headers";
import { ExitPreview } from "@/components/DraftBanner.client";

/**
 * A small fixed link so an editor who is in draft mode (a cookie that outlives the Studio tab) can see
 * it and leave. Renders only with draft mode on; visitors get nothing.
 */
export async function DraftBanner() {
  if (!(await draftMode()).isEnabled) return null;
  return <ExitPreview />;
}
