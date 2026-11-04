import { createClient } from "@sanity/client";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { fetchEventsWithFallback } from "@/lib/meetup/client";
import { syncEvents } from "@/lib/meetup/sync";
import { createSanityTokenStore } from "@/lib/meetup/token-store";
import { apiVersion, dataset, PLACEHOLDER_PROJECT_ID, projectId } from "@/sanity/env";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

/** Vercel Cron calls this daily (vercel.json) with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (process.env.CONTENT_SOURCE === "fixtures" || projectId === PLACEHOLDER_PROJECT_ID || !token) {
    return Response.json(
      { error: "Meetup sync needs a real Sanity project and SANITY_API_WRITE_TOKEN; it never runs against fixtures or the placeholder project." },
      { status: 503 },
    );
  }

  try {
    const writer = createClient({ projectId, dataset, apiVersion, token, useCdn: false });
    const { events, source } = await fetchEventsWithFallback(process.env.MEETUP_GROUP_URLNAME || "cleveland-ai-data", {
      tokenStore: createSanityTokenStore(writer),
    });
    const counts = await syncEvents(events, writer, { source });
    if (counts.created + counts.updated > 0) revalidateTag("sanity", "max");
    return Response.json({ source, fetched: events.length, ...counts });
  } catch (err) {
    console.error("meetup sync failed", err);
    return Response.json({ error: err instanceof Error ? err.message : "sync failed" }, { status: 502 });
  }
}
