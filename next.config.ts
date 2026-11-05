import type { NextConfig } from "next";
import { securityHeaders, studioHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  /* config options here */
  // `npm run visual` builds with its own clock into its own folder, so it never clobbers the e2e build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // The proxy (src/proxy.ts) tidies trailing slashes itself, so an old URL gets one 308, not Next's strip-the-slash hop and then ours.
  skipTrailingSlashRedirect: true,
  // One 404 for every unmatched URL, built from the site document (there is no single root layout).
  experimental: { globalNotFound: true },
  async headers() {
    return [
      // The public site: every path except /studio (R33).
      { source: "/((?!studio(?:/|$)).*)", headers: securityHeaders() },
      // The Studio needs Sanity's API, websockets and eval, so it gets no site CSP (R34), only frame-ancestors.
      { source: "/studio/:path*", headers: studioHeaders() },
    ];
  },
  async redirects() {
    // Page 1 of the past events is the archive itself (the route is /events/page/<n>, n >= 2).
    return [
      { source: "/events/page/1", destination: "/events", permanent: true },
      // Same for the blog and its category and author archives.
      { source: "/blog/page/1", destination: "/blog", permanent: true },
      { source: "/blog/category/:slug/page/1", destination: "/blog/category/:slug", permanent: true },
      { source: "/blog/author/:slug/page/1", destination: "/blog/author/:slug", permanent: true },
      { source: "/blog/:year(\\d{4})/:month(\\d{2})/page/1", destination: "/blog/:year/:month", permanent: true },
    ];
  },
};

export default nextConfig;
