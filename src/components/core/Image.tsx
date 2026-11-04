import { createImageUrlBuilder } from "@sanity/image-url";
import { localAssetUrl } from "@/lib/content/assets";
import { fixturesAllowed } from "@/lib/forms/constants";
import { dataset, PLACEHOLDER_PROJECT_ID, projectId } from "@/sanity/env";

export type ImageValue = {
  asset?: { _ref?: string; _id?: string; url?: string };
  alt?: string;
  caption?: string;
  style?: "framed" | "plain";
  align?: "none" | "left" | "center" | "right" | "wide" | "full";
  hotspot?: unknown;
  crop?: unknown;
};

const builder = createImageUrlBuilder({ projectId, dataset });

/**
 * Without Sanity (fixtures, or no project configured) migrated images are served from
 * public/migrated, named after their asset id (src/lib/content/assets.ts); otherwise Sanity's CDN.
 */
export function imageUrl(source: unknown, width = 1600): string | undefined {
  const asset = (source as ImageValue | undefined)?.asset;
  if (fixturesAllowed() || projectId === PLACEHOLDER_PROJECT_ID) {
    const local = localAssetUrl(asset?._ref ?? asset?._id ?? "");
    if (local) return local;
  }
  try {
    return builder.image(source as never).width(width).auto("format").url();
  } catch {
    return undefined;
  }
}

export function Image({ value }: { value: ImageValue }) {
  const src = value.asset ? imageUrl(value) : undefined;
  if (!src) return null;
  const classes = [
    "wp-block-image",
    value.align && value.align !== "none" ? `align${value.align}` : "",
    "size-full",
    value.style === "plain" ? "is-style-plain" : "",
  ].filter(Boolean);
  return (
    <figure className={classes.join(" ")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Sanity CDN already resizes */}
      <img src={src} alt={value.alt ?? ""} loading="lazy" />
      {value.caption ? <figcaption className="wp-element-caption">{value.caption}</figcaption> : null}
    </figure>
  );
}
