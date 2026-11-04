// Image asset ids and where their files live without Sanity.
//
// Sanity names an uploaded image `image-<sha1>-<width>x<height>-<ext>` (sha1 of the file's bytes)
// and serves it at cdn.sanity.io/images/<project>/<dataset>/<sha1>-<width>x<height>.<ext>. The
// migration gives every image that same id, so a later upload lands on the same id. In fixtures mode
// (no Sanity) the file is copied to public/migrated/<sha1>-<width>x<height>.<ext> instead.

export const LOCAL_ASSET_DIR = "/migrated";

const ASSET_REF = /^image-([a-f0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/;

/** `image-<sha1>-<w>x<h>-<ext>` -> `<sha1>-<w>x<h>.<ext>`, or undefined for anything else. */
export function assetFileName(ref: string): string | undefined {
  const m = ASSET_REF.exec(ref);
  return m ? `${m[1]}-${m[2]}x${m[3]}.${m[4]}` : undefined;
}

/** The local URL of a migrated image in fixtures mode. */
export function localAssetUrl(ref: string): string | undefined {
  const file = assetFileName(ref);
  return file ? `${LOCAL_ASSET_DIR}/${file}` : undefined;
}

/** The URL Sanity serves an asset at. */
export function sanityCdnUrl(ref: string, projectId: string, dataset: string): string | undefined {
  const file = assetFileName(ref);
  return file ? `https://cdn.sanity.io/images/${projectId}/${dataset}/${file}` : undefined;
}
