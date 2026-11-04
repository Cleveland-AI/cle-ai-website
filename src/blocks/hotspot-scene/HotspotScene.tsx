import { useId } from "react";
import { HotspotFrame } from "@/blocks/hotspots/HotspotFrame.client";
import { Hotspots, type MarkerStyle, type Spot } from "@/blocks/hotspots/Hotspots";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { RichBody } from "@/components/RichBody";
import { imageUrl } from "@/components/core/Image";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { sanitize } from "@/lib/sanitize";

export type SceneSpot = { _key?: string; id?: string | null; x?: number | null; y?: number | null; title?: string | null; body?: string | null; icon?: string | null };
export type HotspotSceneAttrs = {
  /** The picture the markers sit on (a Sanity image; the theme's media-library `imageId` can't carry over). */
  image?: { asset?: { _ref?: string; _id?: string }; alt?: string } | null;
  imageAlt?: string | null;
  heading?: string | null;
  intro?: string | null;
  markerStyle?: string | null;
  hotspots?: SceneSpot[] | null;
  /** The blocks that sat inside it in WordPress, shown under the picture. */
  children?: RichBodyValue | null;
  _key?: string;
};

const STYLES = ["numbered", "dot", "question", "icon"];
const html = (s: string | null | undefined) => <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: sanitize(s, "inline") }} />;
/** Plain text of an inline-markup string: tags dropped, entities decoded once (`&amp;` last, so `&amp;lt;` stays `&lt;`). */
export const plain = (s: string | null | undefined) =>
  sanitize(s, "inline")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (m, h: string) => codePoint(parseInt(h, 16), m))
    .replace(/&#(\d+);/g, (m, d: string) => codePoint(parseInt(d, 10), m))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const codePoint = (n: number, fallback: string) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : fallback);

/** Saved markers (inline markup in title and body) as Hotspots items: plain-text label, sanitized popover. */
export const toSpots = (spots: SceneSpot[]): Spot[] =>
  spots.map((s) => ({ x: s.x, y: s.y, icon: s.icon, title: plain(s.title), titleNode: html(s.title), body: html(s.body) }));

/**
 * cle/hotspot-scene: intro, an image with percentage-positioned markers, and inner blocks. Nothing
 * venue-specific lives here; it is all block attributes. The list under the picture has the same text
 * for everyone; with no picture there is neither.
 */
export function HotspotScene(props: BlockSupports & HotspotSceneAttrs) {
  const [supports, a] = splitSupports(props);
  const uid = `cle-scene-${useId()}`;
  const spots = a.hotspots ?? [];
  const marker = (STYLES.includes(a.markerStyle ?? "") ? a.markerStyle : "numbered") as MarkerStyle;
  const src = a.image?.asset ? imageUrl(a.image, 2280) : undefined;
  const dims = /-(\d+)x(\d+)-[a-z0-9]+$/.exec(a.image?.asset?._ref ?? a.image?.asset?._id ?? "");
  const items = toSpots(spots);
  return (
    <section {...wrapperProps("hotspot-scene", `cle-scene cle-scene--${marker}`, supports)}>
      {a.heading || a.intro ? (
        <div className="cle-scene__intro">
          {a.heading ? <h2 dangerouslySetInnerHTML={{ __html: sanitize(a.heading, "inline") }} /> : null}
          {a.intro ? <p dangerouslySetInnerHTML={{ __html: sanitize(a.intro, "inline") }} /> : null}
        </div>
      ) : null}

      {src ? (
        <>
          <HotspotFrame className="cle-scene__frame cle-hotspots">
            {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's CDN already resizes */}
            <img
              className="cle-scene__img"
              src={src}
              alt={a.imageAlt || a.image?.alt || ""}
              {...(dims ? { width: Number(dims[1]), height: Number(dims[2]) } : {})}
              sizes="(min-width: 1140px) 1140px, 100vw"
              loading="lazy"
              decoding="async"
            />
            <Hotspots spots={items} markerStyle={marker} uid={uid} />
          </HotspotFrame>

          {spots.length ? (
            <ol className="cle-scene__list">
              {spots.map((s, i) => (
                <li key={s._key ?? i}>
                  <strong>{html(s.title)}</strong> {html(s.body)}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : null}

      {a.children?.length ? (
        <div className="cle-scene__actions">
          <RichBody value={a.children} />
        </div>
      ) : null}
    </section>
  );
}
