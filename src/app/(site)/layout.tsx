import type { Metadata } from "next";
import { SiteDocument } from "@/components/SiteDocument";
import { siteUrl } from "@/lib/posts";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "CLE AI & DATA", template: "%s – CLE AI & DATA" },
  description: "Cleveland's community for AI and data.",
};

/** The document every site page shares (see SiteDocument). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument>{children}</SiteDocument>;
}
