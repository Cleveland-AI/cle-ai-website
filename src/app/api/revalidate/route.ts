import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";

/**
 * Sanity's publish webhook (project settings -> API -> Webhooks, POST, projection-less, same secret as
 * SANITY_REVALIDATE_SECRET). The signature is checked before anything else (R35); with no secret
 * configured it refuses everything rather than letting anyone refresh the cache.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();
  if (!secret) return Response.json({ error: "SANITY_REVALIDATE_SECRET is not set" }, { status: 503 });

  let valid: boolean | null;
  try {
    ({ isValidSignature: valid } = await parseBody(req, secret));
  } catch {
    return Response.json({ error: "bad request body" }, { status: 400 });
  }
  if (!valid) return Response.json({ error: "invalid signature" }, { status: 401 });

  // { expire: 0 }: a webhook means the content changed, so expire the tag now (Next 16: webhooks and
  // other third-party triggers), rather than serving stale while revalidating.
  revalidateTag("sanity", { expire: 0 });
  return Response.json({ revalidated: true });
}
