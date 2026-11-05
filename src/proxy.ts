import { NextResponse, type NextRequest } from "next/server";
import { resolveRedirect } from "@/lib/redirects/map";
import { loadSanityRedirects } from "@/lib/redirects/sanity";

/**
 * Old WordPress URLs and people-added redirects: one permanent (308) hop to the final address.
 * Next 16 calls this file `proxy` (it was `middleware`). Everything else passes straight through.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = resolveRedirect(pathname, search, await loadSanityRedirects());
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url), 308);
}

// Not /_next, /studio, /api, or the folders under public/. It must see "/" with ?p= and /events with ?query-2-page=,
// so the matcher is by path only (never by file extension: /wp-content/uploads/*.jpg are old URLs).
export const config = {
  matcher: ["/((?!_next/|studio(?:/|$)|api/|assets/|fonts/|migrated/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|feed\\.xml$).*)"],
};
