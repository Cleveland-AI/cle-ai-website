import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomeBody } from "@/components/HomeBody";

// front-page.html: header, the homepage document's body (the story world, the hidden first night and
// the latest posts), footer; no announcement bar. No Suspense boundaries (R32): everything here reads
// cached data and prerenders, and a streamed boundary stays hidden without JS.
export const metadata: Metadata = buildMetadata({ home: true, path: "/" });

export default function Home() {
  return (
    <>
      <Header />
      <HomeBody />
      <Footer />
    </>
  );
}
