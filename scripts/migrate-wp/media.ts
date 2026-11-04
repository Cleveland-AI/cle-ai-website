// Media: WordPress uploads and theme files -> Sanity image assets.
//
// Every image gets Sanity's own asset id, `image-<sha1>-<w>x<h>-<ext>` (src/lib/content/assets.ts).
// Two modes:
// - `local` (fixtures): the file is copied to <media-dir>/<sha1>-<w>x<h>.<ext> (public/migrated by
//   default) and a `sanity.imageAsset` document with that local `url` is written, so GROQ's
//   `asset->url` and the Image component agree without Sanity.
// - `import` (production, `sanity dataset import`): image fields carry `_sanityAsset:
//   "image@file://<path>"`, which the importer uploads; Sanity then assigns the same id.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { assetFileName, LOCAL_ASSET_DIR, sanityCdnUrl } from "../../src/lib/content/assets";

export type ImageInfo = { width: number; height: number; ext: "png" | "jpg" | "gif" | "webp"; mimeType: string };

/** Width, height and format from the file header (PNG, JPEG, GIF, WebP), or undefined. */
export function imageInfo(buf: Buffer): ImageInfo | undefined {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47)
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), ext: "png", mimeType: "image/png" };
  if (buf.length > 10 && buf.toString("ascii", 0, 3) === "GIF")
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), ext: "gif", mimeType: "image/gif" };
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    const webp = (width: number, height: number): ImageInfo => ({ width, height, ext: "webp", mimeType: "image/webp" });
    if (chunk === "VP8X") return webp(1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3));
    if (chunk === "VP8 ") return webp(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return webp(1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff));
    }
    return undefined;
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return undefined;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5), ext: "jpg", mimeType: "image/jpeg" };
      i += 2 + len;
    }
  }
  return undefined;
}

export type Asset = {
  /** Sanity asset id. */
  id: string;
  sha1: string;
  info: ImageInfo;
  size: number;
  originalFilename: string;
  buf: Buffer;
};

export function assetFor(buf: Buffer, originalFilename: string): Asset | undefined {
  const info = imageInfo(buf);
  if (!info) return undefined;
  const sha1 = createHash("sha1").update(buf).digest("hex");
  return { id: `image-${sha1}-${info.width}x${info.height}-${info.ext}`, sha1, info, size: buf.length, originalFilename, buf };
}

export type MediaMode = "local" | "import";

export class MediaLibrary {
  private used = new Map<string, Asset>();
  readonly mode: MediaMode;
  readonly dir: string;
  readonly projectId: string;
  readonly dataset: string;

  constructor(opts: { mode: MediaMode; dir: string; projectId: string; dataset: string }) {
    this.mode = opts.mode;
    this.dir = resolve(opts.dir);
    this.projectId = opts.projectId;
    this.dataset = opts.dataset;
  }

  /** Marks an asset as used by the content: its file is written and (local mode) its asset document kept. */
  use(asset: Asset): Asset {
    if (!this.used.has(asset.id)) {
      mkdirSync(this.dir, { recursive: true });
      const path = this.pathOf(asset);
      if (!existsSync(path)) writeFileSync(path, asset.buf);
      this.used.set(asset.id, asset);
    }
    return asset;
  }

  private pathOf(asset: Asset) {
    return join(this.dir, assetFileName(asset.id)!);
  }

  /** An image field value for the asset (marks it used). */
  image(asset: Asset): { _type: "image"; [k: string]: unknown } {
    this.use(asset);
    return this.mode === "import"
      ? { _type: "image", _sanityAsset: `image@file://${this.pathOf(asset)}` }
      : { _type: "image", asset: { _type: "reference", _ref: asset.id } };
  }

  /** Where the file is served: locally in fixtures mode, Sanity's CDN after an import. */
  url(asset: Asset): string {
    return this.mode === "import" ? this.cdnUrl(asset) : `${LOCAL_ASSET_DIR}/${assetFileName(asset.id)}`;
  }

  cdnUrl(asset: Asset): string {
    return sanityCdnUrl(asset.id, this.projectId, this.dataset)!;
  }

  /** sanity.imageAsset documents for the used assets (local mode only; an import creates its own). */
  assetDocuments(): Record<string, unknown>[] {
    if (this.mode === "import") return [];
    return [...this.used.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => ({
        _id: a.id,
        _type: "sanity.imageAsset",
        assetId: a.sha1,
        sha1hash: a.sha1,
        extension: a.info.ext,
        mimeType: a.info.mimeType,
        originalFilename: a.originalFilename,
        size: a.size,
        url: this.url(a),
        path: `images/${this.projectId}/${this.dataset}/${assetFileName(a.id)}`,
        metadata: {
          _type: "sanity.imageMetadata",
          dimensions: {
            _type: "sanity.imageDimensions",
            width: a.info.width,
            height: a.info.height,
            aspectRatio: a.info.width / a.info.height,
          },
        },
      }));
  }

  usedCount() {
    return this.used.size;
  }
}

/** An asset for a repo file (theme headshots and illustrations). */
export function assetFromFile(path: string): Asset | undefined {
  return existsSync(path) ? assetFor(readFileSync(path), basename(path)) : undefined;
}
