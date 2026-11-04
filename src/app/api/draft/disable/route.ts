import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Turns draft mode off (sanity.config.ts: previewMode.disable) and goes back to a page on this site. */
export async function GET(req: Request): Promise<Response> {
  if (process.env.CONTENT_SOURCE === "fixtures") return new Response("Not found", { status: 404 });
  (await draftMode()).disable();
  const asked = new URL(req.url).searchParams.get("redirect") || "/";
  // Resolve it the way a browser would (it drops tabs and newlines and reads "\\" as "/"), and only
  // follow it when it stays on this origin: "/%09/evil.example" is "//evil.example" to a browser.
  const here = new URL(req.url);
  const target = new URL(asked, here);
  // A path that normalizes to "//host" (from "/.//host", "/x/..//host") would be a protocol-relative
  // Location, so collapse leading slashes (and backslashes, in case a runtime reads them as slashes).
  const path = target.pathname.replace(/^[/\\]+/, "/");
  redirect(target.origin === here.origin ? `${path}${target.search}${target.hash}` : "/");
}
