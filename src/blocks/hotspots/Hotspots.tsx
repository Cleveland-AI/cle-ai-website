import type { CSSProperties, ReactNode } from "react";
import { cleIcon } from "@/lib/icons";

export type Spot = {
  x?: number | null;
  y?: number | null;
  /** Plain text: the button's screen-reader label. */
  title: string;
  /** The popover's heading when it carries markup; `title` otherwise. */
  titleNode?: ReactNode;
  body: ReactNode;
  icon?: string | null;
};
export type MarkerStyle = "numbered" | "dot" | "question" | "icon";

const clamp = (v: number | null | undefined) => Math.max(0, Math.min(100, Number.isFinite(Number(v ?? 50)) ? Number(v ?? 50) : 50));

/**
 * Marker buttons and their popovers (inc/hotspots.php cle_render_hotspots), shared by the venue map,
 * hotspot scenes and the story. x/y are percent of the image box; HotspotFrame adds the behaviour.
 */
export function Hotspots({ spots, markerStyle, uid }: { spots: Spot[]; markerStyle: MarkerStyle; uid: string }) {
  return (
    <>
      {spots.map((spot, i) => {
        const id = `${uid}-${i}`;
        const x = clamp(spot.x);
        const y = clamp(spot.y);
        const pos = { "--x": `${x}%`, "--y": `${y}%` } as CSSProperties;
        const marker =
          markerStyle === "numbered" ? (
            String(i + 1)
          ) : markerStyle === "question" ? (
            "?"
          ) : markerStyle === "icon" ? (
            <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: cleIcon(spot.icon ?? "") || cleIcon("chat") }} />
          ) : (
            ""
          );
        return [
          <button
            key={`${id}-btn`}
            type="button"
            className="cle-scene__pin"
            style={pos}
            id={`${id}-btn`}
            aria-expanded="false"
            aria-controls={id}
            aria-describedby={`${id}-body`}
          >
            <span className="screen-reader-text">{spot.title}</span>
            <span aria-hidden="true">{marker}</span>
          </button>,
          <div
            key={id}
            className={`cle-scene__pop ${y < 50 ? "is-below" : "is-above"}`}
            style={pos}
            id={id}
            role="dialog"
            aria-labelledby={`${id}-title`}
            hidden
          >
            <h3 id={`${id}-title`}>{spot.titleNode ?? spot.title}</h3>
            <p id={`${id}-body`}>{spot.body}</p>
          </div>,
        ];
      })}
    </>
  );
}
