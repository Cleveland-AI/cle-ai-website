import { createClient } from "next-sanity";
import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Turns on Next draft mode for Studio's Presentation tool (sanity.config.ts: previewMode.enable). The
 * request must carry the one-time preview secret the Studio created; the client with the drafts token
 * is what checks it. Never available in fixtures mode, and without a token it refuses.
 */
export async function GET(req: Request): Promise<Response> {
  if (process.env.CONTENT_SOURCE === "fixtures") return new Response("Not found", { status: 404 });
  const token = process.env.SANITY_API_DRAFTS_TOKEN;
  if (!token) return new Response("Draft mode needs SANITY_API_DRAFTS_TOKEN.", { status: 503 });
  const { GET: enable } = defineEnableDraftMode({ client: createClient({ projectId, dataset, apiVersion, useCdn: false, token }) });
  return enable(req);
}
