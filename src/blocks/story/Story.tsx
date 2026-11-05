import { useId, type CSSProperties } from "react";
import { Hotspots, type MarkerStyle } from "@/blocks/hotspots/Hotspots";
import { toSpots, type SceneSpot } from "@/blocks/hotspot-scene/HotspotScene";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { RichBody } from "@/components/RichBody";
import { getEvents } from "@/lib/content/queries";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { findEvent } from "@/lib/events/find";
import { whenShort, type EventDoc } from "@/lib/events/time";
import { cleIcon } from "@/lib/icons";
import { siteNow } from "@/lib/now";
import { chapterAnchor, storyAssetUrl, StoryImg, type StoryChapterAttrs } from "./images";
import { StoryFrame } from "./StoryFrame.client";

type Layer = { _key?: string; slug?: string | null; label?: string | null; imageId?: number | null };

export type StoryAttrs = {
  mode?: string | null;
  layers?: Layer[] | null;
  nightId?: number | null;
  compositeId?: number | null;
  /** The theme's Media Library pattern; it can't carry over, so the bundled pattern is used. */
  patternId?: number | null;
  foregrounds?: Layer[] | null;
  tv?: { x?: number | null; y?: number | null; w?: number | null; h?: number | null } | null;
  tvLabel?: string | null;
  tvMatch?: string | null;
  sponsors?: string | null;
  hotspots?: SceneSpot[] | null;
  markerStyle?: string | null;
  railLabel?: string | null;
  children?: RichBodyValue | null;
};

// block.json defaults.
const LAYERS: Layer[] = ["lights", "room", "table-1", "table-2", "table-3", "table-4", "bar-staff", "counter"].map((slug) => ({ slug }));
const FOREGROUNDS: Layer[] = [{ slug: "hotdog-beer" }];
const TV = { x: 35.3, y: 9.9, w: 27.2, h: 22 };
const STYLES = ["numbered", "dot", "question", "icon"];

const pct = (v: unknown) => `${Number(v ?? 0) || 0}%`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** An icon's SVG followed by a <span> of escaped text, as the theme prints them inside one element. */
const iconThen = (slug: string, span?: { className?: string; text: string }) => ({
  __html: cleIcon(slug) + (span ? `<span${span.className ? ` class="${span.className}"` : ""}>${esc(span.text)}</span>` : ""),
});

/**
 * cle/story (blocks/story/render.php) for a given TV event: the chapter rail, the pinned stage and
 * the chapters. Each chapter carries its own scene state; StoryFrame applies the one on screen.
 */
export function StoryView(props: BlockSupports & StoryAttrs & { event: EventDoc | null }) {
  const [supports, a] = splitSupports({ ...props, align: props.align ?? "full" });
  const uid = `cle-story-${useId()}`;
  const chapters = (a.children ?? []).filter((c) => c._type === "cleStoryChapter") as StoryChapterAttrs[];
  const pattern = storyAssetUrl("pattern");
  const tv = a.tv ?? TV;
  const marker = (STYLES.includes(a.markerStyle ?? "") ? a.markerStyle : "icon") as MarkerStyle;
  const mode = a.mode === "stacked" ? "stacked" : "stage";
  const e = a.event;
  return (
    <StoryFrame {...wrapperProps("story", `is-mode-${mode}`, supports, { "--cle-pattern": `url("${pattern}")` } as CSSProperties)}>
      <nav className="cle-story__rail" aria-label={a.railLabel ?? "Story chapters"}>
        <ol>
          {chapters.map((ch, i) => {
            // Untitled: no anchor, no accessible name.
            const anchor = chapterAnchor(ch);
            return anchor ? (
              <li key={i}>
                <a
                  href={`#${anchor}`}
                  data-index={i}
                  dangerouslySetInnerHTML={iconThen(String(ch.icon ?? ""), { className: "screen-reader-text", text: String(ch.title ?? "") })}
                />
              </li>
            ) : null;
          })}
        </ol>
      </nav>

      <div className="cle-story__stage">
        <div className="cle-story__camera">
          <div className="cle-story__layers" aria-hidden="true">
            {(a.layers ?? LAYERS).map((layer, i) => (
              <div key={layer._key ?? i} className="cle-story__layer" data-layer={layer.slug ?? ""}>
                {i < 2 ? <StoryImg slug={String(layer.slug ?? "")} loading={false} fetchPriority="high" /> : <StoryImg slug={String(layer.slug ?? "")} />}
              </div>
            ))}
            <div className="cle-story__layer cle-story__layer--night" data-layer="neon">
              <StoryImg slug="neon" />
            </div>
          </div>

          {chapters.map((ch, i) => [
            ...(ch.bubbles ?? []).map((b, j) => (
              <p
                key={`b${i}-${b._key ?? j}`}
                className="cle-story__bubble"
                data-chapter={i}
                aria-hidden="true"
                style={{ "--x": pct(b.x ?? 50), "--y": pct(b.y ?? 50), "--i": j } as CSSProperties}
                dangerouslySetInnerHTML={iconThen("chat", { text: String(b.text ?? "") })}
              />
            )),
            ch.pin ? (
              <span
                key={`p${i}`}
                className="cle-story__pin"
                data-chapter={i}
                aria-hidden="true"
                style={{ "--x": pct(ch.pin.x ?? 50), "--y": pct(ch.pin.y ?? 50) } as CSSProperties}
                dangerouslySetInnerHTML={iconThen("pin")}
              />
            ) : null,
          ])}

          {a.hotspots?.length ? (
            <div className="cle-story__hotspots cle-hotspots" inert>
              <Hotspots spots={toSpots(a.hotspots)} markerStyle={marker} uid={`${uid}-hs`} />
            </div>
          ) : null}

          {e ? (
            <div className="cle-story__tv" aria-hidden="true" style={{ left: pct(tv.x), top: pct(tv.y), width: pct(tv.w), height: pct(tv.h) }}>
              <p className="cle-story__tv-label">{a.tvLabel ?? "Next big night"}</p>
              <p className="cle-story__tv-title">{e.title}</p>
              <p className="cle-story__tv-date">{whenShort(e, "EEE, MMM d")}</p>
              {a.sponsors ? (
                <div className="cle-story__crawl">
                  <div className="cle-story__crawl-track">
                    <span>{a.sponsors}</span>
                    <span>{a.sponsors}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="cle-story__horizon" aria-hidden="true"></div>

        {(a.foregrounds ?? FOREGROUNDS).map((fg, i) => (
          <div key={fg._key ?? i} className="cle-story__fg" data-foreground={fg.slug ?? ""} aria-hidden="true">
            <StoryImg slug={String(fg.slug ?? "")} />
          </div>
        ))}
      </div>

      <div className="cle-story__chapters">
        <RichBody value={a.children} />
      </div>
    </StoryFrame>
  );
}

/** cle/story: the TV shows the soonest upcoming event matching tvMatch (any event when none matches). */
export async function Story(props: BlockSupports & StoryAttrs) {
  const [events, now] = await Promise.all([getEvents(), siteNow()]);
  return <StoryView {...props} event={findEvent(events, props.tvMatch ?? "Mega", true, [], now)} />;
}
