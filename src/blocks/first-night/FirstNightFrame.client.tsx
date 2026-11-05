"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * The first night's behaviour (blocks/first-night/view.js): the moment nearest the middle of the
 * screen is the one on show. data-on on the section picks the pinned picture, the progress dot and the
 * step that is fully opaque (CSS, wide screens with motion allowed only).
 */
export function FirstNightFrame({
  children,
  ...props
}: {
  className: string;
  id?: string;
  style?: CSSProperties;
  "aria-labelledby": string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>(".cle-night__step"));
    if (!steps.length) return;
    let on = 0;
    let frame = 0;
    const pick = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let best = 0;
      let dist = Infinity;
      steps.forEach((s, k) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < dist) {
          dist = d;
          best = k;
        }
      });
      if (best !== on) {
        on = best;
        root.dataset.on = String(on);
      }
    };
    let watching = false;
    const io = new IntersectionObserver((entries) => {
      watching =
        entries.some((e) => e.isIntersecting) ||
        steps.some((s) => {
          const r = s.getBoundingClientRect();
          return r.bottom > 0 && r.top < window.innerHeight;
        });
      pick();
    });
    steps.forEach((s) => io.observe(s));
    const scroll = () => {
      if (watching && !frame) frame = requestAnimationFrame(pick);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", pick);
    pick();
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", pick);
    };
  }, []);

  return (
    <section ref={ref} {...props} data-on="0">
      {children}
    </section>
  );
}
