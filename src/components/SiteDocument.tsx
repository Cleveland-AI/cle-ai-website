import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";
import { DraftBanner } from "@/components/DraftBanner";
import "@/styles/tokens.css";
// Block styles come before WordPress's global and core styles and the theme's style.css, as WordPress
// prints them.
import "@/styles/blocks/next-event.css";
import "@/styles/blocks/logo.css";
import "@/styles/blocks/menu.css";
import "@/styles/blocks/nav.css";
import "@/styles/blocks/hotspots.css";
import "@/styles/blocks/venue-map.css";
import "@/styles/blocks/event-meta.css";
import "@/styles/blocks/confetti.css";
import "@/styles/blocks/mascot.css";
import "@/styles/blocks/team.css";
import "@/styles/blocks/bead-timeline.css";
import "@/styles/blocks/hotspot-scene.css";
import "@/styles/blocks/embed-form.css";
import "@/styles/blocks/form.css";
import "@/styles/blocks/ticker.css";
import "@/styles/blocks/timeline.css";
import "@/styles/blocks/sponsor-builder.css";
import "@/styles/blocks/gift-slider.css";
import "@/styles/blocks/way-finder.css";
import "@/styles/blocks/coming-up.css";
import "@/styles/blocks/world.css";
import "@/styles/blocks/world-chapter.css";
import "@/styles/blocks/story.css";
import "@/styles/blocks/story-chapter.css";
import "@/styles/blocks/first-night.css";
import "@/styles/core.css";
import "@/styles/theme.css";
import { poptinSrc } from "@/lib/poptin";
import { HEAD_SCRIPT } from "@/lib/headScript";
import { CountUp } from "@/lib/figures.client";
import { SkipLink } from "@/components/SkipLink.client";

// Lexend 400, 600 and 700 from the bundled files; no network. core.css points the theme's
// --wp--preset--font-family--body token at this variable.
const lexend = localFont({
  src: [
    { path: "../../public/fonts/lexend-400-latin.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/lexend-600-latin.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/lexend-700-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-lexend",
  display: "swap",
});

/**
 * The document every site page shares, as the block theme prints it: the skip link, then
 * .wp-site-blocks holding the template parts and <main id="wp--skip-link--target">. The head script
 * adds html.cle-js / html.cle-logo-seen before first paint, hence suppressHydrationWarning on <html>.
 */
export function SiteDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={lexend.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body>
        <SkipLink />
        <div className="wp-site-blocks">{children}</div>
        <CountUp />
        <Suspense fallback={null}>
          <DraftBanner />
        </Suspense>
        {/* Popups (Poptin) on every site page, the 404 included, and not in the Studio. */}
        <Script src={poptinSrc()} strategy="afterInteractive" />
      </body>
    </html>
  );
}
