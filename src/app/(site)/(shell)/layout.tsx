import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/**
 * Every page except the homepage: announcement bar, header, the page's <main>, footer (the theme's
 * templates other than front-page.html). The homepage renders the header and footer itself.
 * No Suspense boundaries around the chrome (R32): their data (site settings, the next event, the
 * site clock) is cached, so they prerender with the page, and a boundary that finishes after the
 * shell's first chunk is streamed as a hidden segment that only JS reveals.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      {children}
      <Footer />
    </>
  );
}
