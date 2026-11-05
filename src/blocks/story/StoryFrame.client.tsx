"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { bindHotspots } from "@/blocks/hotspots/bind";

type State = {
  layers: string[];
  camera: { x: number; y: number; zoom: number };
  reveal: boolean;
  night: boolean;
  foreground: string;
  hotspots: boolean;
  pattern: boolean;
};

/**
 * The story stage's behaviour (blocks/story/view.js): the chapter crossing the middle of the viewport
 * drives the pinned stage. CSS decides whether the stage is active (sticky); when it isn't (stacked
 * mode, reduced motion, no room) the stage state is cleared until it comes back.
 */
export function StoryFrame({ children, ...props }: { className: string; id?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const story = ref.current;
    const stage = story?.querySelector<HTMLElement>(".cle-story__stage");
    const camera = story?.querySelector<HTMLElement>(".cle-story__camera");
    if (!story || !stage || !camera) return;
    const all = (sel: string) => Array.from(story.querySelectorAll<HTMLElement>(sel));
    const chapters = all(".cle-chapter");
    const states: State[] = chapters.map((ch) => {
      try {
        return JSON.parse(ch.dataset.chapter || "{}");
      } catch {
        return {};
      }
    });
    const layers = all(".cle-story__layer");
    const extras = all(".cle-story__bubble, .cle-story__pin");
    const foregrounds = all(".cle-story__fg");
    const railLinks = all(".cle-story__rail a");
    const hotspotsEl = story.querySelector<HTMLElement>(".cle-story__hotspots");
    const hotspots = hotspotsEl ? bindHotspots(hotspotsEl, { closeOnLeave: false }) : null;
    let active = -1;
    let shown = -1;
    let queued = 0;

    const staged = () => window.getComputedStyle(stage).position === "sticky";

    const apply = (i: number, revealCount: number) => {
      const s = states[i];
      const list = s.layers ?? [];
      const visible = s.reveal ? list.slice(0, Math.max(2, revealCount)) : list;
      story.dataset.active = String(i);
      story.classList.toggle("is-night", !!s.night);
      story.classList.toggle("is-pattern", !!s.pattern);
      story.classList.toggle("is-far", (s.camera?.zoom ?? 1) < 0.5);
      for (const layer of layers) {
        const slug = layer.dataset.layer ?? "";
        const on = slug === "neon" ? !!s.night : !s.night && visible.includes(slug);
        layer.classList.toggle("is-on", on);
      }
      camera.style.setProperty("--cam-x", (s.camera?.x ?? 50) + "%");
      camera.style.setProperty("--cam-y", (s.camera?.y ?? 50) + "%");
      camera.style.setProperty("--cam-z", String(s.camera?.zoom ?? 1));
      for (const el of extras) el.classList.toggle("is-on", String(i) === el.dataset.chapter);
      for (const el of foregrounds) el.classList.toggle("is-on", el.dataset.foreground === s.foreground);
      if (hotspotsEl && hotspots) {
        hotspotsEl.classList.toggle("is-on", !!s.hotspots);
        hotspotsEl.inert = !s.hotspots;
        if (!s.hotspots) hotspots.closeAll();
      }
      // Untitled chapters have no rail link, so match links by data-index, not position.
      for (const a of railLinks) {
        const current = String(i) === a.dataset.index;
        a.classList.toggle("is-active", current);
        if (current) a.setAttribute("aria-current", "step");
        else a.removeAttribute("aria-current");
      }
    };

    const update = () => {
      queued = 0;
      if (!chapters.length) return;
      if (!staged()) {
        if (active !== -1) {
          story.classList.remove("is-night", "is-pattern", "is-far");
          delete story.dataset.active;
          active = -1;
          shown = -1;
        }
        return;
      }
      const mid = window.innerHeight / 2;
      let index = 0;
      let progress = 0;
      chapters.forEach((ch, k) => {
        const r = ch.getBoundingClientRect();
        if (r.top <= mid) {
          index = k;
          progress = Math.min(1, Math.max(0, (mid - r.top) / r.height));
        }
      });
      const reveal = Math.ceil(progress * (states[index].layers ?? []).length);
      // Re-apply only when something visible changes.
      if (index !== active || (states[index].reveal && reveal !== shown)) {
        apply(index, reveal);
        active = index;
        shown = reveal;
      }
    };
    const queue = () => {
      if (!queued) queued = requestAnimationFrame(update);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    reduce.addEventListener("change", queue);
    story.classList.add("is-ready");
    update();
    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      reduce.removeEventListener("change", queue);
      hotspots?.destroy();
    };
  }, []);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
