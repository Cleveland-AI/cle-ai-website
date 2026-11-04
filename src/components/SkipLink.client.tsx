"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export const SKIP_TARGET = "wp--skip-link--target";

/** Where the skip link goes: the first <main>'s own id, else wp--skip-link--target. */
export const skipHref = (main: { id: string } | null) => `#${main?.id || SKIP_TARGET}`;

/**
 * The block theme's skip link. Pages give their first <main> the id wp--skip-link--target unless it
 * has an id of its own; then, as WordPress's skip-link script does, the link is pointed at that id.
 */
export function SkipLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.href = skipHref(document.querySelector("main"));
  }, [pathname]);
  return (
    <a ref={ref} className="skip-link screen-reader-text" id="wp-skip-link" href={`#${SKIP_TARGET}`}>
      Skip to content
    </a>
  );
}
