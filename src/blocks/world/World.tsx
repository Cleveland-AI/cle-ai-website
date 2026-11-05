import { useId } from "react";
import { Hotspots } from "@/blocks/hotspots/Hotspots";
import { toSpots, type SceneSpot } from "@/blocks/hotspot-scene/HotspotScene";
import { pointOf, StoryImg, type Camera, type Point } from "@/blocks/story/images";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { RichBody } from "@/components/RichBody";
import { ArtImg, artExists } from "@/lib/art";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { WorldFrame } from "./WorldFrame.client";

export type WorldChapterAttrs = {
  _type?: string;
  _key?: string;
  title?: string | null;
  camera?: Camera | null;
  fadeBelow?: number | null;
  hotspots?: SceneSpot[] | null;
  tag?: Point | null;
  tagPhone?: Point | null;
  tagShort?: string | null;
  stop?: Point | null;
  children?: RichBodyValue | null;
};

export type WorldAttrs = {
  mode?: string | null;
  /** The theme's Media Library override; the bundled world picture is always used here. */
  imageId?: number | null;
  alt?: string | null;
  children?: RichBodyValue | null;
};

const ALT =
  "Illustration of Cleveland: the downtown skyline above a museum auditorium, the Happy Dog bar, a training room and a park trail, all busy with people.";

/**
 * cle/world (blocks/world/render.php): one illustration pinned behind the chapters; WorldFrame moves
 * a camera across it. Hotspots are grouped by chapter, and finale tags lead back to each chapter;
 * WorldFrame positions both over the stage. Dot walks through the picture from one chapter's "stop"
 * to the next; he lives inside the view, so he moves and zooms with it. Without JS, with reduced
 * motion or in stacked mode, CSS hides the stage and each chapter shows its own crop.
 */
export function World(props: BlockSupports & WorldAttrs) {
  const [supports, a] = splitSupports({ ...props, align: props.align ?? "full" });
  const uid = `cle-world-${useId()}`;
  const chapters = (a.children ?? []).filter((c) => c._type === "cleWorldChapter") as WorldChapterAttrs[];
  // Finale tags: one per chapter that has a tag position, labelled with the chapter title.
  const tags = chapters.flatMap((ch, i) => {
    const at = pointOf(ch.tag);
    const title = String(ch.title ?? "");
    if (at === "" || title.trim() === "") return [];
    const phone = pointOf(ch.tagPhone);
    const short = String(ch.tagShort ?? "").trim() !== "" ? String(ch.tagShort) : title;
    return [{ i, at, phone: phone !== "" ? phone : at, long: title, short }];
  });
  // Dot walks the city when a chapter has a stop and the walker pictures are bundled.
  const walks = artExists("dot-walker") && artExists("dot-walker-wave") && chapters.some((ch) => pointOf(ch.stop) !== "");
  const mode = a.mode === "stacked" ? "stacked" : "stage";

  return (
    <WorldFrame {...wrapperProps("world", `is-mode-${mode}`, supports)}>
      <div className="cle-world__stage">
        <div className="cle-world__view">
          <StoryImg slug="world" className="cle-world__img" alt={a.alt ?? ALT} loading={false} fetchPriority="high" />
          {walks ? (
            <div className="cle-world__walker" aria-hidden="true">
              <ArtImg slug="dot-walker" className="cle-world__walker-side" />
              <ArtImg slug="dot-walker-wave" className="cle-world__walker-front" />
            </div>
          ) : null}
        </div>
        <div className="cle-world__cut" aria-hidden="true"></div>
        {chapters.map((ch, i) =>
          ch.hotspots?.length ? (
            <div key={ch._key ?? i} className="cle-world__hotspots cle-hotspots" data-chapter={i} inert>
              <Hotspots spots={toSpots(ch.hotspots)} markerStyle="numbered" uid={`${uid}-${i}`} />
            </div>
          ) : null,
        )}
        {tags.length ? (
          <div className="cle-world__tags" aria-label="Places in the story" role="group" inert>
            {tags.map((t) => (
              <button key={t.i} type="button" className="cle-world__tag" data-chapter={t.i} data-at={t.at} data-at-phone={t.phone}>
                <span className="cle-world__tag-long">{t.long}</span>
                <span className="cle-world__tag-short">{t.short}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="cle-world__chapters">
        <RichBody value={a.children} />
      </div>
    </WorldFrame>
  );
}
