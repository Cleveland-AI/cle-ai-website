import type { Metadata } from "next";
import { NotFound } from "@/components/NotFound";
import { buildMetadata } from "@/lib/seo";
import { SiteDocument } from "@/components/SiteDocument";
import ShellLayout from "@/app/(site)/(shell)/layout";

// No path of its own to point a canonical at, and a 404 should stay out of the index.
const base = buildMetadata({ title: "Page not found", path: "/", noindex: true });
export const metadata: Metadata = { ...base, alternates: undefined, openGraph: { ...base.openGraph, url: undefined } };

// An unmatched URL: no layout runs, so build the whole document, shell included.
export default function GlobalNotFound() {
  return (
    <SiteDocument>
      <ShellLayout>
        <NotFound />
      </ShellLayout>
    </SiteDocument>
  );
}
