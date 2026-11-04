// Clay illustrations in public/assets/illustrations, with a brand shape standing in for any that
// don't exist yet (port of cle-ai-theme/inc/art.php). Sizes come from art-sizes.json, which a unit
// test keeps in step with the files, so nothing reads the disk at render time.
import sizes from "./art-sizes.json";

/** The six brand shapes, in the order stand-ins cycle through them. */
export const SHAPES = ["blue", "coral", "yellow", "green", "navy", "pale"] as const;

const ILLUSTRATIONS: Record<string, number[]> = sizes.illustrations;
const SHAPE_SIZES: Record<string, number[]> = sizes.shapes;

/** True when public/assets/illustrations/<slug>.webp ships with the site. */
export function artExists(slug: string): boolean {
  return slug !== "" && Object.hasOwn(ILLUSTRATIONS, slug);
}

const shape = (i: number) => SHAPES[((i % SHAPES.length) + SHAPES.length) % SHAPES.length];

/** URL of the illustration, or of brand shape number `i` as its stand-in. */
export function artUrl(slug: string, i = 0): string {
  return artExists(slug) ? `/assets/illustrations/${slug}.webp` : `/assets/shapes/${shape(i)}.webp`;
}

/** Decorative <img> for an illustration (alt is empty unless given), lazy and sized, like cle_art_img(). */
export function ArtImg({ slug, i = 0, className = "", alt = "" }: { slug: string; i?: number; className?: string; alt?: string }) {
  const exists = artExists(slug);
  const [width, height] = (exists ? ILLUSTRATIONS[slug] : SHAPE_SIZES[shape(i)]) ?? [400, 400];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static theme art, already sized webp
    <img
      className={`${className}${exists ? "" : " is-stand-in"}`}
      src={artUrl(slug, i)}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
}
