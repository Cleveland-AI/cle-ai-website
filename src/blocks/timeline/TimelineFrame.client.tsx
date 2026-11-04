"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * The history timeline's behaviour (blocks/timeline/view.js): scroll progress through the section drives
 * the track under a fixed centre playhead, and the card of the latest item the playhead has reached is
 * shown. With reduced motion nothing moves: the CSS shows a plain vertical list.
 */
export function TimelineFrame({ children, ...props }: { className: string; id?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    const track = root?.querySelector<HTMLElement>(".cle-timeline__track");
    if (!root || !track) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".cle-timeline__item"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let queued = false;

    const update = () => {
      queued = false;
      if (reduce.matches) {
        track.style.transform = "";
        items.forEach((item) => {
          item.classList.remove("is-active", "is-past");
          item.style.removeProperty("--cle-tl-shift");
        });
        return;
      }
      const rect = root.getBoundingClientRect();
      const runway = rect.height - window.innerHeight;
      const p = runway > 0 ? Math.min(1, Math.max(0, -rect.top / runway)) : 0;
      track.style.transform = `translateX(${root.clientWidth / 2 - p * track.offsetWidth}px)`;

      // The most recent item the playhead has reached shows its card, anchored at the playhead so it
      // stays on screen through long empty stretches. Before the first, show the first.
      let active = items[0] ?? null;
      for (const item of items) {
        const reached = parseFloat(item.dataset.x ?? "0") <= p + 0.001;
        item.classList.toggle("is-past", reached);
        if (reached) active = item;
      }
      for (const item of items) item.classList.toggle("is-active", item === active);
      if (active) {
        const shift = root.clientWidth / 2 - (active.getBoundingClientRect().left - root.getBoundingClientRect().left);
        active.style.setProperty("--cle-tl-shift", shift + "px");
      }
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    reduce.addEventListener("change", queue);
    update();
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      reduce.removeEventListener("change", queue);
    };
  }, []);

  return (
    <section ref={ref} {...props}>
      {children}
    </section>
  );
}
