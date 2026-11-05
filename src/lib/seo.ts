import { createImageUrlBuilder } from "@sanity/image-url";
import type { Metadata } from "next";
import { texturize } from "@/components/core/texturize";
import { localAssetUrl } from "@/lib/content/assets";
import { fixturesAllowed } from "@/lib/forms/constants";
import { siteUrl } from "@/lib/posts";
import { dataset, PLACEHOLDER_PROJECT_ID, projectId } from "@/sanity/env";

export const SITE_NAME = "CLE AI & DATA";
// Texturized (curly apostrophe), as WordPress prints the tagline.
export const SITE_TAGLINE = "Cleveland’s community for AI and data";
/** The description of any page with no excerpt or SEO description of its own. */
export const DEFAULT_DESCRIPTION = `${SITE_TAGLINE}.`;
export const DEFAULT_OG_IMAGE = "/assets/og-default.png";
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The separator WordPress prints between title and site name (an en dash). */
const SEP = "–";

type SanityImage = { asset?: { _ref?: string; _id?: string } | null } | null | undefined;

/** What buildMetadata reads from a page, post, event or archive. Every field is optional. */
export type SeoInput = {
  /** The document's title; absent on the homepage. */
  title?: string | null;
  excerpt?: string | null;
  /** The editor's SEO object (title, description, image, noindex). */
  seo?: { title?: string | null; description?: string | null; image?: SanityImage; noindex?: boolean | null } | null;
  /** The document's own image (featured image, event image). */
  image?: SanityImage;
  /** The page's path, e.g. "/blog/page/2". The canonical is this on the site origin, so paginated archives point at themselves. */
  path: string;
  /** The homepage prints the site name and tagline instead of "title – site name". */
  home?: boolean;
  noindex?: boolean;
  type?: "website" | "article";
};

const builder = createImageUrlBuilder({ projectId, dataset });

/** A 1200x630 crop of a Sanity image as an absolute URL, or undefined with no usable image. */
function ogImage(image: SanityImage): string | undefined {
  const ref = image?.asset?._ref ?? image?.asset?._id;
  if (!ref) return undefined;
  if (fixturesAllowed() || projectId === PLACEHOLDER_PROJECT_ID) {
    const local = localAssetUrl(ref);
    if (local) return `${siteUrl()}${local}`;
  }
  try {
    return builder.image(image as never).width(OG_SIZE.width).height(OG_SIZE.height).fit("crop").format("jpg").url();
  } catch {
    return undefined;
  }
}

/** The title of page `n` of an archive, as WordPress adds it ("Meetup – Page 2"); page 1 is the bare name. */
export const pageTitle = (name: string, n = 1) => (n > 1 ? `${name} ${SEP} Page ${n}` : name);

/** The search page's title for a query: Search Results for “q” (WordPress's wording and curly quotes). */
export const searchTitle = (q: string) => `Search Results for “${q}”`;

const clip = (s: string | null | undefined) => s?.trim() || undefined;

/** Title, description, canonical, Open Graph and Twitter data for one page. */
export function buildMetadata(doc: SeoInput): Metadata {
  const origin = siteUrl();
  // wp_get_document_title runs the whole title through wptexturize.
  const own = clip(doc.seo?.title) ?? clip(doc.title);
  const title = texturize(doc.home ? `${SITE_NAME} ${SEP} ${SITE_TAGLINE}` : own ? `${own} ${SEP} ${SITE_NAME}` : SITE_NAME);
  const description = clip(doc.seo?.description) ?? clip(doc.excerpt) ?? DEFAULT_DESCRIPTION;
  const canonical = `${origin}${doc.path === "/" ? "/" : doc.path.replace(/\/+$/, "")}`;
  const imageUrl = ogImage(doc.seo?.image) ?? ogImage(doc.image);
  const images = imageUrl
    ? [{ url: imageUrl, ...OG_SIZE }]
    : [{ url: `${origin}${DEFAULT_OG_IMAGE}`, ...OG_SIZE, alt: SITE_NAME }];
  const noindex = doc.noindex || doc.seo?.noindex;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { type: doc.type ?? "website", siteName: SITE_NAME, locale: "en_US", title, description, url: canonical, images },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
