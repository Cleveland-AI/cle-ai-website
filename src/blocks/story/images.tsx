// Helpers for cle/story, cle/story-chapter and cle/world (port of cle-ai-theme/inc/story.php).
// The theme's story images are bundled in public/assets/story; their sizes come from art-sizes.json
// (a unit test keeps it in step with the files), so nothing reads the disk at render time. The
// theme's Media Library overrides (imageId, nightId, compositeId, patternId) don't carry over to
// Sanity: the bundled pictures are always used, which is what the theme falls back to as well.
import sizes from "@/lib/art-sizes.json";

export const STORY_SIZES: Record<string, number[]> = sizes.story;

/** URL of a bundled story image (public/assets/story/<slug>.webp), or "" if there is none. */
export function storyAssetUrl(slug: string, known: Record<string, number[]> = STORY_SIZES): string {
  return slug !== "" && Object.hasOwn(known, slug) ? `/assets/story/${slug}.webp` : "";
}

/** slug => URL for every bundled story image. */
export function storyAssetUrls(): Record<string, string> {
  return Object.fromEntries(Object.keys(STORY_SIZES).map((slug) => [slug, storyAssetUrl(slug)]));
}

/**
 * <img> for a bundled story image, always with width and height so nothing shifts while it loads;
 * lazy unless `loading` is false. Nothing for an unknown slug.
 *
 * A bundled <slug>-2x.webp (twice the width) goes to laptops and up, where the camera zooms the
 * picture well past its normal size. The picture is laid out at its own pixel size and scaled by the
 * camera, so `sizes` can't come from the layout: it names the large file's width from 1024px up, and
 * a third of the normal width below, so phones up to 3x density keep the smaller download.
 */
export function StoryImg({
  slug,
  className,
  alt = "",
  loading = "lazy",
  fetchPriority,
  sizes: known = STORY_SIZES,
}: {
  slug: string;
  className?: string;
  alt?: string;
  loading?: "lazy" | false;
  fetchPriority?: "high";
  sizes?: Record<string, number[]>;
}) {
  const src = storyAssetUrl(slug, known);
  if (!src) return null;
  const [width, height] = known[slug];
  const big = storyAssetUrl(`${slug}-2x`, known);
  const bigWidth = big ? (known[`${slug}-2x`][0] ?? 2 * width) : 0;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bundled theme art, already sized webp; the camera scales it
    <img
      alt={alt}
      {...(loading ? { loading } : {})}
      decoding="async"
      {...(className ? { className } : {})}
      {...(fetchPriority ? { fetchPriority } : {})}
      src={src}
      width={width}
      height={height}
      {...(big ? { srcSet: `${src} ${width}w, ${big} ${bigWidth}w`, sizes: `(min-width: 1024px) ${bigWidth}px, ${Math.round(width / 3)}px` } : {})}
    />
  );
}

/** sanitize_title(): lower-case words joined by hyphens. */
const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Anchor id for a chapter, from its title: "chapter-just-conversation"; "" without a title. */
export function chapterAnchor(attrs: { title?: string | null }): string {
  const slug = slugify(String(attrs.title ?? ""));
  return slug === "" ? "" : `chapter-${slug}`;
}

export type Camera = { x?: number | null; y?: number | null; zoom?: number | null };
export type Point = { x?: number | null; y?: number | null };

const num = (v: unknown, fallback: number) => {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) ? n : fallback;
};

/** A chapter's camera with the defaults filled in. */
export const cameraOf = (cam: Camera | null | undefined) => ({ x: num(cam?.x, 50), y: num(cam?.y, 50), zoom: num(cam?.zoom, 1) });

/** "x,y" for a point with both coordinates, else "". */
export function pointOf(p: Point | null | undefined): string {
  if (!p || p.x == null || p.y == null || p.x === ("" as never) || p.y === ("" as never)) return "";
  const x = Number(p.x);
  const y = Number(p.y);
  return Number.isFinite(x) && Number.isFinite(y) ? `${x},${y}` : "";
}

export type StoryChapterAttrs = {
  title?: string | null;
  icon?: string | null;
  layers?: (string | null)[] | null;
  camera?: Camera | null;
  reveal?: boolean | null;
  night?: boolean | null;
  foreground?: string | null;
  bubbles?: { _key?: string; x?: number | null; y?: number | null; text?: string | null }[] | null;
  hotspots?: boolean | null;
  pattern?: boolean | null;
  pin?: Point | null;
};

/** The part of a chapter's attributes the front end needs, normalised (cle_chapter_state). */
export function chapterState(a: StoryChapterAttrs) {
  return {
    icon: String(a.icon ?? ""),
    layers: (a.layers ?? []).map((l) => String(l ?? "")),
    camera: cameraOf(a.camera),
    reveal: !!a.reveal,
    night: !!a.night,
    foreground: String(a.foreground ?? ""),
    hotspots: !!a.hotspots,
    pattern: !!a.pattern,
  };
}

/**
 * Camera for a chapter's stacked crop. A crop can only zoom in, so a zoomed-out camera becomes the
 * whole scene, and the focus point is clamped so the image always fills its box.
 */
export function chapterCropCamera(cam: { x: number; y: number; zoom: number }) {
  const zoom = Math.max(1, cam.zoom);
  const reach = (50 * (zoom - 1)) / zoom;
  const clamp = (v: number) => Math.round(Math.min(50 + reach, Math.max(50 - reach, v)) * 100) / 100;
  return { x: clamp(cam.x), y: clamp(cam.y), zoom };
}

/** The crop's inline style: --cam-x/--cam-y in percent and --cam-z. */
export const cropStyle = (c: { x: number; y: number; zoom: number }) =>
  ({ "--cam-x": `${c.x}%`, "--cam-y": `${c.y}%`, "--cam-z": c.zoom }) as React.CSSProperties;
