"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { bindHotspots } from "./bind";

/**
 * The shared marker behaviour (assets/js/hotspots.js, see bindHotspots) on a <figure> holding
 * .cle-scene__pin buttons.
 */
export function HotspotFrame({ className, closeOnLeave = true, children }: { className: string; closeOnLeave?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return bindHotspots(ref.current, { closeOnLeave }).destroy;
  }, [closeOnLeave]);

  return (
    <figure ref={ref} className={className}>
      {children}
    </figure>
  );
}
