"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

/** The disable route, told to come back to this page. */
export const exitPreviewHref = (pathname: string, search: string) =>
  `/api/draft/disable?redirect=${encodeURIComponent(pathname + search)}`;

/** Shown only in a top-level window: inside Studio's Presentation iframe the Studio has its own controls. */
export function shouldShowBanner(self: Window, top: Window | null): boolean {
  try {
    return self.top === top;
  } catch {
    return false; // reading a cross-origin parent's window threw: we are framed
  }
}

const subscribe = () => () => {};

export function ExitPreview() {
  const pathname = usePathname();
  // Computed on the client only (null while rendering on the server and hydrating), so the href carries
  // the query string and middle-click or "open in new tab" keeps it.
  const href = useSyncExternalStore(
    subscribe,
    () => (shouldShowBanner(window, window) ? exitPreviewHref(pathname, window.location.search) : null),
    () => null,
  );
  if (!href) return null;
  return (
    <a
      href={href}
      style={{
        position: "fixed",
        insetInlineEnd: "var(--wp--preset--spacing--s)",
        insetBlockEnd: "var(--wp--preset--spacing--s)",
        zIndex: 2147483647,
        padding: "var(--wp--preset--spacing--xs) var(--wp--preset--spacing--s)",
        borderRadius: "var(--wp--preset--spacing--xs)",
        background: "var(--wp--preset--color--indigo)",
        color: "var(--wp--preset--color--white)",
        fontSize: "var(--wp--preset--font-size--s)",
        textDecoration: "none",
      }}
    >
      Previewing drafts — Exit preview
    </a>
  );
}
