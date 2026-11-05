"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** One piece of a text: a number that counts up, or the words around it. */
export type CountPart = { text: string; count: boolean };

/**
 * Splits a text into the numbers that count and the text between them: every run of digits with its
 * commas and decimals as written ("4,284", "4.8", "1,465"), as in assets/js/figures.js.
 */
export function splitCounts(text: string): CountPart[] {
  return text
    .split(/(\d[\d,]*(?:\.\d+)?)/)
    .map((part, i) => ({ text: part, count: i % 2 === 1 }))
    .filter((p) => p.text !== "");
}

/**
 * What a count reads `progress` (0 to 1) of the way up to `final`: the same decimals and, when the
 * final has commas, the same thousands separators; exactly `final` at 1. Eases out (cubic).
 */
export function countFrame(final: string, progress: number): string {
  if (progress >= 1) return final;
  const target = parseFloat(final.replace(/,/g, ""));
  const eased = 1 - Math.pow(1 - Math.max(0, progress), 3);
  const decimals = (final.split(".")[1] ?? "").length;
  const s = (target * eased).toFixed(decimals);
  return final.includes(",") ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
}

const DURATION = 1400;
const SELECTOR = ".cle-figure > :first-child, .cle-figures";

/** Wraps each number under `el` in a .cle-count span and returns the spans. */
function wrap(el: Element): HTMLElement[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\d/.test(n.nodeValue ?? "")) nodes.push(n as Text);
  const spans: HTMLElement[] = [];
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    for (const part of splitCounts(node.nodeValue ?? "")) {
      if (!part.count) {
        frag.appendChild(document.createTextNode(part.text));
        continue;
      }
      const span = document.createElement("span");
      span.className = "cle-count";
      span.dataset.final = part.text;
      span.textContent = part.text;
      frag.appendChild(span);
      spans.push(span);
    }
    node.parentNode?.replaceChild(frag, node);
  }
  return spans;
}

function run(spans: HTMLElement[], timers: Set<ReturnType<typeof setInterval>>) {
  for (const sp of spans) sp.textContent = countFrame(sp.dataset.final ?? "", 0);
  let start = 0;
  // A timer, not requestAnimationFrame: a frame loop can stall in a background tab and leave the
  // numbers at zero, while a timer always gets to the end. `timers` belongs to one start() call, which
  // clears whatever is left in it when it is stopped.
  const timer = setInterval(() => {
    const now = performance.now();
    start = start || now;
    const t = Math.min(1, (now - start) / DURATION);
    for (const sp of spans) sp.textContent = countFrame(sp.dataset.final ?? "", t);
    if (t >= 1) {
      clearInterval(timer);
      timers.delete(timer);
    }
  }, 16);
  timers.add(timer);
}

/**
 * Starts the count-up for the page as it is now and returns the function that stops it: it removes the
 * listeners, cancels a queued frame and any running count, and shows the final numbers. Nothing of one
 * start survives its stop, so a navigation can't leave a frame or an interval behind.
 */
export function startCountUp(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let els = Array.from(document.querySelectorAll(SELECTOR));
  const timers = new Set<ReturnType<typeof setInterval>>();
  let frame: number | null = null;
  let stopped = false;
  // Checked on scroll rather than with an observer, so it also works where observers are throttled
  // (background tabs, embedded previews). Each element runs once.
  const check = () => {
    frame = null;
    if (stopped) return;
    // The page's content hasn't hydrated yet (HydrationPending): try again next frame, so React never
    // finds wrapped text it didn't render. (The layout, and with it this effect, hydrates first.)
    if (document.querySelector?.("[data-cle-hydrating]")) {
      queue();
      return;
    }
    els = els.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight * 0.9) return true;
      const spans = wrap(el);
      if (spans.length) run(spans, timers);
      return false;
    });
    if (!els.length) off();
  };
  const queue = () => {
    if (frame === null && !stopped) frame = requestAnimationFrame(check);
  };
  const off = () => {
    window.removeEventListener("scroll", queue);
    window.removeEventListener("resize", queue);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  // After hydration has finished (this effect runs before it does in a streamed page), so no server
  // text is rewritten while React is still matching it.
  queue();
  return () => {
    stopped = true;
    off();
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    // A run cut short by leaving the page: show the final numbers rather than a frozen count.
    for (const t of timers) clearInterval(t);
    timers.clear();
    document.querySelectorAll<HTMLElement>(".cle-count").forEach((sp) => (sp.textContent = sp.dataset.final ?? sp.textContent));
  };
}

/**
 * Big figures count up when they scroll into view: every number in a .cle-figure's first line and in
 * .cle-figures text (4,284 members, 183 events, 4.8 from 1,465 reviews). The server renders the final
 * values, so without scripts, or with reduced motion (nothing is touched), they are simply there.
 * Port of assets/js/figures.js. Mounted once in the site document; runs again after each navigation.
 */
export function CountUp() {
  const pathname = usePathname();
  useEffect(() => startCountUp(), [pathname]);
  return null;
}
