"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export type LogoDot = { slug: string; x: number; y: number; r: number; order: number };

const REACH = 220; // px from the logo's centre where the lean starts

/**
 * The logo's dots (blocks/logo/view.js): they lean towards a nearby mouse pointer, smaller dots
 * further, like clay on springs. Mounting also remembers that the drop-in has played, so later pages
 * of the visit start still (see HEAD_SCRIPT).
 */
export function LogoMark({ dots }: { dots: LogoDot[] }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem("cle-logo-seen", "1");
    } catch {}
    const mark = ref.current;
    if (!mark || !window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const dotEls = () => Array.from(mark.querySelectorAll<HTMLElement>(".cle-logo__dot"));
    let pending: PointerEvent | null = null;

    const lean = () => {
      const e = pending;
      pending = null;
      if (!e) return;
      const r = mark.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const pull = Math.max(0, 1 - d / REACH);
      for (const dot of dotEls()) {
        const k = (pull * (0.9 * r.width)) / (dot.offsetWidth + 6); // small dots move more
        dot.style.setProperty("--dx", (d ? (dx / d) * k * 3 : 0).toFixed(2) + "px");
        dot.style.setProperty("--dy", (d ? (dy / d) * k * 3 : 0).toFixed(2) + "px");
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pending) requestAnimationFrame(lean);
      pending = e;
    };
    const onLeave = () => {
      for (const dot of dotEls()) {
        dot.style.removeProperty("--dx");
        dot.style.removeProperty("--dy");
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <span className="cle-logo__mark" aria-hidden="true" ref={ref}>
      {dots.map((dot) => (
        <span
          key={dot.slug}
          className="cle-logo__dot"
          style={
            {
              "--x": `${dot.x}%`,
              "--y": `${dot.y}%`,
              "--r": `${dot.r}%`,
              "--c": `var(--wp--preset--color--${dot.slug})`,
              "--i": String(dot.order),
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
