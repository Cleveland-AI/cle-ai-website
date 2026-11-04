"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { bindHotspots } from "@/blocks/hotspots/bind";

type Cam = { x: number; y: number; zoom: number; cut: number };
type Stop = { x: number; y: number } | null;
type Walk = { x: number; y: number; hop: number; moving: boolean } | null;
type View = { x: number; y: number; z: number; fin: number; cut: number; hide: number; walk: Walk };

/** Share of the desktop stage under the solid text veil (matches world.css). */
const VEIL = 0.36;

/**
 * The story world's behaviour (blocks/world/view.js). A camera glides across one illustration as the
 * chapters scroll past. Each chapter's camera (x, y in percent of the image, zoom) holds still, then
 * flies to the next over the end of the chapter, pulling back mid-way like a map flying between
 * places. The last chapter is the finale: the whole picture, with a tag on each place that flies back
 * to its chapter. Dot walks along with the camera, from one chapter's stop to the next.
 * In stacked mode (CSS decides: no JS, reduced motion, short screens) it stays idle.
 */
export function WorldFrame({ children, ...props }: { className: string; id?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const stage = root?.querySelector<HTMLElement>(".cle-world__stage");
    const view = root?.querySelector<HTMLElement>(".cle-world__view");
    const img = view?.querySelector("img");
    if (!root || !stage || !view) return;
    const chapters = Array.from(root.querySelectorAll<HTMLElement>(".cle-wchapter"));
    const last = chapters.length - 1;
    const cams: Cam[] = chapters.map((c) => {
      let cam: Partial<Cam> = {};
      try {
        cam = JSON.parse(c.dataset.cam || "{}");
      } catch {}
      return { x: Number(cam.x ?? 50), y: Number(cam.y ?? 50), zoom: Number(cam.zoom ?? 1), cut: Number(cam.cut) || 100 }; // 100 = nothing hidden
    });
    const groups = Array.from(root.querySelectorAll<HTMLElement>(".cle-world__hotspots"));
    const controls = groups.map((g) => bindHotspots(g, { closeOnLeave: false }));
    // Dot's stops, one per chapter in picture percent. A chapter without one keeps the last stop (or,
    // before the first stop, borrows the first), so he never has nowhere to stand.
    const walker = view.querySelector<HTMLElement>(".cle-world__walker");
    const stops: Stop[] = chapters.map((c) => {
      const at = (c.dataset.stop || "").split(",");
      return at.length === 2 ? { x: +at[0], y: +at[1] } : null;
    });
    for (let i = 1; i < stops.length; i++) stops[i] = stops[i] || stops[i - 1];
    for (let i = stops.length - 2; i >= 0; i--) stops[i] = stops[i] || stops[i + 1];
    let face = 1;
    const tagsEl = root.querySelector<HTMLElement>(".cle-world__tags");
    const tags = tagsEl ? Array.from(tagsEl.querySelectorAll<HTMLElement>(".cle-world__tag")) : [];
    const fine = window.matchMedia("(pointer: fine)").matches;
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let IW = 0,
      IH = 0,
      sw = 0,
      sh = 0,
      cover = 1,
      contain = 1;
    let cur: View | null = null;
    const lean = { x: 0, y: 0, active: false };
    let running = false;
    let frame = 0;
    let onChapter = -1;
    let tagsOn = false;
    const offs: (() => void)[] = controls.map((c) => c.destroy);
    const cleanup = () => {
      cancelAnimationFrame(frame);
      offs.forEach((off) => off());
    };

    if (!chapters.length || !img) return cleanup;

    // Remember each pin/popover's position in image percent; render() rewrites --x/--y in pixels, so
    // only the first run reads them (a re-run of this effect would otherwise take pixels for percent).
    for (const g of groups) {
      g.querySelectorAll<HTMLElement>(".cle-scene__pin, .cle-scene__pop").forEach((el) => {
        el.dataset.px ??= String(parseFloat(el.style.getPropertyValue("--x")) || 50);
        el.dataset.py ??= String(parseFloat(el.style.getPropertyValue("--y")) || 50);
      });
    }

    const staged = () => window.getComputedStyle(stage).position === "sticky";
    // The line a chapter's top must cross to become current.
    const line = () => (wide.matches ? window.innerHeight * 0.5 : window.innerHeight * 0.46 + 60);
    // Scroll so chapter i sits in its still stretch, before the glide to the next one begins.
    const goTo = (i: number) => {
      const ch = chapters[i];
      if (!ch) return;
      window.scrollTo({ top: ch.getBoundingClientRect().top + window.scrollY - line() + ch.offsetHeight * 0.3, behavior: "smooth" });
    };
    tags.forEach((b, k) => {
      b.style.setProperty("--i", String(k));
      const click = () => goTo(+(b.dataset.chapter ?? 0));
      b.addEventListener("click", click);
      offs.push(() => b.removeEventListener("click", click));
    });

    const size = () => {
      // Lay the picture out at its width/height attributes, not naturalWidth: with srcset the browser
      // reports naturalWidth divided by the screen density (557 for 1672 on a 3x phone).
      IW = +(img.getAttribute("width") ?? 0) || img.naturalWidth || 1600;
      IH = +(img.getAttribute("height") ?? 0) || img.naturalHeight || 900;
      const r = stage.getBoundingClientRect();
      sw = r.width;
      sh = r.height;
      cover = Math.max(sw / IW, sh / IH); // zoom 1 covers the stage
      contain = Math.min(sw / IW, sh / IH);
      view.style.width = IW + "px";
      view.style.height = IH + "px";
      // The finale's bottom veil is as tall as its words, so they never sit on the picture.
      const body = chapters[last].querySelector<HTMLElement>(".cle-wchapter__body");
      if (body) root.style.setProperty("--cle-fin-h", Math.round(body.offsetHeight + 72) + "px");
      wake();
    };

    const target = (): View & { ch: number; still: boolean } => {
      const mid = line();
      let i = 0,
        p = 0;
      chapters.forEach((ch, k) => {
        const r = ch.getBoundingClientRect();
        if (r.top <= mid) {
          i = k;
          p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
        }
      });
      const a = cams[i],
        b = cams[Math.min(i + 1, last)];
      let t = Math.max(0, (p - 0.55) / 0.45);
      t = t * t * (3 - 2 * t);
      // Pull back mid-flight, further for longer trips, so you see where you're going.
      const dist = Math.hypot(((b.x - a.x) / 100) * (IW / IH), (b.y - a.y) / 100);
      const z = (a.zoom + (b.zoom - a.zoom) * t) / (1 + Math.min(1.4, dist * 2) * Math.sin(Math.PI * t));
      // Dot hops from this chapter's stop to the next while the camera flies: a few hops for a long
      // trip, one for a short one, feet back on the ground at both ends.
      const sa = stops[i],
        sb = stops[Math.min(i + 1, last)];
      let walk: Walk = null;
      if (sa && sb) {
        const far = Math.hypot(sb.x - sa.x, sb.y - sa.y);
        const hops = far < 0.5 ? 0 : 1 + Math.round(far / 12);
        if (t > 0 && t < 1 && sb.x !== sa.x) face = sb.x < sa.x ? -1 : 1;
        walk = {
          x: sa.x + (sb.x - sa.x) * t,
          y: sa.y + (sb.y - sa.y) * t,
          hop: hops ? Math.abs(Math.sin(Math.PI * hops * t)) * 28 : 0,
          moving: hops > 0 && t > 0.001 && t < 0.999,
        };
      }
      return {
        walk,
        x: (a.x + (b.x - a.x) * t) / 100,
        y: (a.y + (b.y - a.y) * t) / 100,
        z: Math.max(1, z),
        cut: (a.cut + (b.cut - a.cut) * t) / 100,
        // 1 while a chapter hides part of the picture: the kept part floats centred in the stage.
        hide: (a.cut < 100 ? 1 - t : 0) + (b.cut < 100 ? t : 0),
        fin: i === last ? 1 : i + 1 === last ? t : 0,
        ch: t < 0.5 ? i : Math.min(i + 1, last),
        still: t < 0.02 || t > 0.98,
      };
    };

    const render = (c: View) => {
      // Phones are too narrow for the whole picture at cover size, so the finale shrinks it to fit.
      const base = wide.matches ? cover : cover + (contain - cover) * c.fin;
      const s = base * c.z,
        w = IW * s,
        h = IH * s;
      if (!(w > 0)) return;
      // On desktop the veil covers the left of the stage, so aim at the centre of what's left and let
      // the picture's left edge tuck under the solid veil. Both relax as the finale opens.
      const side = wide.matches ? 1 - c.fin : 0;
      let tx = sw * (0.5 + (side * VEIL) / 2) - c.x * w + lean.x * 24 * c.z;
      let ty = sh / 2 - c.y * h + lean.y * 16 * c.z;
      tx = w < sw ? (sw - w) / 2 : Math.min(sw * VEIL * side, Math.max(sw - w, tx));
      ty = h < sh ? (sh - h) / 2 : Math.min(0, Math.max(sh - h, ty));
      // With the lower picture hidden, centre what's kept; its top edge then fades in too.
      const kept = c.cut * h;
      if (c.hide > 0.001 && kept < sh) ty += ((sh - kept) / 2 - ty) * c.hide;
      view.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
      if (walker && c.walk) {
        walker.style.left = c.walk.x.toFixed(2) + "%";
        walker.style.top = c.walk.y.toFixed(2) + "%";
        walker.style.setProperty("--hop", c.walk.hop.toFixed(1) + "%");
        walker.style.setProperty("--face", String(face));
        walker.classList.toggle("is-walking", c.walk.moving);
      }
      root.style.setProperty("--cle-side", side.toFixed(3));
      root.style.setProperty("--cle-cut-y", c.cut > 0.995 ? "100000px" : (ty + c.cut * h).toFixed(1) + "px");
      root.style.setProperty("--cle-top-y", (ty > 0 ? ty : -1000).toFixed(1) + "px");
      root.style.setProperty("--cle-bottom", (wide.matches ? c.fin : 0).toFixed(3));
      for (const g of groups) {
        if (!g.classList.contains("is-on")) continue;
        g.querySelectorAll<HTMLElement>(".cle-scene__pin, .cle-scene__pop").forEach((el) => {
          const y = ty + (Number(el.dataset.py) / 100) * h;
          el.style.setProperty("--x", (tx + (Number(el.dataset.px) / 100) * w).toFixed(1) + "px");
          el.style.setProperty("--y", y.toFixed(1) + "px");
          // Open towards the roomier half of the stage, judged on screen, not in the picture.
          if (el.classList.contains("cle-scene__pop")) {
            el.classList.toggle("is-below", y < sh / 2);
            el.classList.toggle("is-above", y >= sh / 2);
          }
        });
      }
      if (tagsOn) {
        for (const b of tags) {
          // A tag can sit elsewhere on phones, where the shrunken picture crowds them together.
          const at = ((wide.matches ? b.dataset.at : b.dataset.atPhone) ?? "50,50").split(",");
          const x = tx + (Number(at[0]) / 100) * w,
            hw = b.offsetWidth / 2 + 8;
          b.style.setProperty("--x", x.toFixed(1) + "px");
          b.style.setProperty("--y", (ty + (Number(at[1]) / 100) * h).toFixed(1) + "px");
          // Nudge a tag that would hang off the side back inside the stage.
          b.style.setProperty("--dx", (Math.min(sw - hw, Math.max(hw, x)) - x).toFixed(1) + "px");
        }
      }
    };

    // Hotspots appear only once the camera has settled on their chapter; tags only in the finale.
    const show = (ch: number) => {
      if (ch === onChapter) return;
      onChapter = ch;
      groups.forEach((g, k) => {
        const on = +(g.dataset.chapter ?? -2) === ch;
        g.classList.toggle("is-on", on);
        g.inert = !on;
        if (!on) controls[k].closeAll();
      });
      tagsOn = ch === last && last > 0;
      if (tagsEl) {
        tagsEl.classList.toggle("is-on", tagsOn);
        tagsEl.inert = !tagsOn;
      }
    };

    const tick = () => {
      if (!staged()) {
        running = false;
        return;
      }
      const t = target();
      if (!cur) cur = { x: t.x, y: t.y, z: t.z, fin: t.fin, cut: t.cut, hide: t.hide, walk: t.walk };
      // Dot follows the scroll directly (no easing), so his hops land where the camera settles.
      cur.walk = t.walk;
      const k = 0.085;
      cur.x += (t.x - cur.x) * k;
      cur.y += (t.y - cur.y) * k;
      cur.z += (t.z - cur.z) * k;
      cur.fin += (t.fin - cur.fin) * k;
      cur.cut += (t.cut - cur.cut) * k;
      cur.hide += (t.hide - cur.hide) * k;
      const moving = Math.abs(t.x - cur.x) + Math.abs(t.y - cur.y) > 0.004 || Math.abs(t.z - cur.z) > 0.02 || Math.abs(t.fin - cur.fin) > 0.01;
      show(moving || !t.still ? -1 : t.ch);
      render(cur);
      if (moving || lean.active) frame = requestAnimationFrame(tick);
      else running = false;
    };

    function wake() {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    }

    const listen = (el: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn, opts);
      offs.push(() => el.removeEventListener(type, fn, opts));
    };
    if (fine) {
      listen(stage, "pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        const p = e as PointerEvent;
        lean.x = 0.5 - (p.clientX - r.left) / r.width;
        lean.y = 0.5 - (p.clientY - r.top) / r.height;
        lean.active = true;
        wake();
      });
      listen(stage, "pointerleave", () => {
        lean.x = 0;
        lean.y = 0;
        lean.active = false;
        wake();
      });
    }
    listen(window, "scroll", wake, { passive: true });
    listen(window, "resize", size);
    listen(reduce, "change", size);
    if (img.complete) size();
    else listen(img, "load", size);
    root.classList.add("is-ready");
    return cleanup;
  }, []);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
