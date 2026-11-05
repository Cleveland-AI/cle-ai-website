import type { CSSProperties } from "react";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { ArtImg, artExists } from "@/lib/art";
import { fmt } from "@/lib/events/time";
import { siteNow } from "@/lib/now";
import { DotFrame } from "./DotFrame.client";

export const POSES = ["peek", "lost", "sleep", "stage", "social", "workshop", "hike", "search", "welcome"] as const;

export type MascotProps = BlockSupports & {
  pose?: string | null;
  width?: number | null;
  /** Today, for the winter hat (December to February, New York dates). Without it Dot never wears it. */
  now?: Date;
};

/**
 * cle/mascot: Dot in one of his poses (public/assets/illustrations/dot-<pose>.webp). Decorative, so
 * the image has empty alt text. The site ships still Dots only, so there is no animated <picture>.
 */
export function Mascot(props: MascotProps) {
  const [supports, { pose, width, now }] = splitSupports(props);
  const p = (POSES as readonly string[]).includes(pose ?? "") ? (pose as string) : "peek";
  let art = `dot-${p}`;
  if (p === "peek" && now && [12, 1, 2].includes(Number(fmt(now, "M"))) && artExists("dot-peek-winter")) {
    art = "dot-peek-winter";
  }
  if (!artExists(art)) return null;
  const w = Math.max(80, Math.min(600, Math.trunc(Number(width ?? 220)) || 0));
  const wrapper = wrapperProps("mascot", `cle-dot cle-dot--${p}`, supports, { "--dot-w": `${w}px` } as CSSProperties);
  return (
    <DotFrame {...wrapper} peek={p === "peek"}>
      <ArtImg slug={art} className="cle-dot__img" />
    </DotFrame>
  );
}

/** The registered cle/mascot block: reads today's date only for the peeking pose. */
export async function MascotBlock(props: MascotProps) {
  const now = (props.pose ?? "peek") === "peek" ? await siteNow() : undefined;
  return <Mascot {...props} now={now} />;
}
