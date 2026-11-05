import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";

/**
 * Changes that never alter a page (I4): form submissions, the sync's private token state, drafts (draft mode
 * reads uncached anyway) and bare asset uploads (a page changes only when a document referencing it does).
 * The runbook's webhook filter excludes these too; this is the cheap second line.
 */
const IGNORED_TYPES = new Set(["submission", "meetupSyncState", "sanity.imageAsset", "sanity.fileAsset"]);
const IGNORED_ID = /^(drafts|secrets|submission)\./;

/**
 * Sanity's publish webhook (project settings -> API -> Webhooks, POST, projection-less, same secret as
 * SANITY_REVALIDATE_SECRET). The signature is checked before anything else (R35); with no secret
 * configured it refuses everything rather than letting anyone refresh the cache.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();
  if (!secret) return Response.json({ error: "SANITY_REVALIDATE_SECRET is not set" }, { status: 503 });

  let valid: boolean | null;
  let body: { _type?: unknown; _id?: unknown } | null;
  try {
    ({ isValidSignature: valid, body } = await parseBody<{ _type?: unknown; _id?: unknown }>(req, secret));
  } catch {
    return Response.json({ error: "bad request body" }, { status: 400 });
  }
  if (!valid) return Response.json({ error: "invalid signature" }, { status: 401 });

  const type = typeof body?._type === "string" ? body._type : "";
  const id = typeof body?._id === "string" ? body._id : "";
  if (IGNORED_TYPES.has(type) || IGNORED_ID.test(id)) return Response.json({ revalidated: false, ignored: type });

  // { expire: 0 }: a webhook means the content changed, so expire the tag now (Next 16: webhooks and
  // other third-party triggers), rather than serving stale while revalidating.
  revalidateTag("sanity", { expire: 0 });
  return Response.json({ revalidated: true });
}
