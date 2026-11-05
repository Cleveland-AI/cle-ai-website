// The Studio's own root layout: no site header, footer, fonts or theme CSS.
export { metadata, viewport } from "next-sanity/studio";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
