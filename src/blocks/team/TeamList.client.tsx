"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { fireConfetti } from "@/lib/confetti";

/**
 * The team cards' behaviour (blocks/team/view.js) on the <ul>: tapping someone's photo or name opens
 * their card as a modal. It springs out of where you tapped, with a little confetti (none for reduced
 * motion); Escape, the x, or a tap outside closes it and focus goes back to the photo. "Meet ..." swaps
 * straight to the next person's card.
 */
export function TeamList({ children, ...props }: { className: string; id?: string; style?: React.CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const offs: (() => void)[] = [];
    const on = (el: HTMLElement, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn, opts);
      offs.push(() => el.removeEventListener(type, fn));
    };
    const timers: ReturnType<typeof setTimeout>[] = [];

    const open = (dialog: HTMLDialogElement | null, from: HTMLElement | null) => {
      if (!dialog || typeof dialog.showModal !== "function") return;
      // Spring out of the tapped photo: the card starts at that point and grows to the centre.
      if (from) {
        const r = from.getBoundingClientRect();
        dialog.style.setProperty("--from-x", r.left + r.width / 2 - window.innerWidth / 2 + "px");
        dialog.style.setProperty("--from-y", r.top + r.height / 2 - window.innerHeight / 2 + "px");
      } else {
        dialog.style.removeProperty("--from-x");
        dialog.style.removeProperty("--from-y");
      }
      dialog.showModal();
      document.documentElement.classList.add("cle-modal-open");
      const photo = dialog.querySelector(".cle-team-modal__photo");
      if (photo) {
        timers.push(
          setTimeout(() => {
            const r = photo.getBoundingClientRect();
            fireConfetti({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }, 260),
        );
      }
    };

    list.querySelectorAll<HTMLElement>(".cle-team-card__open").forEach((btn) => {
      on(btn, "click", () => open(document.getElementById(btn.getAttribute("aria-controls") ?? "") as HTMLDialogElement | null, btn));
    });

    list.querySelectorAll<HTMLDialogElement>(".cle-team-modal").forEach((dialog) => {
      on(dialog, "close", () => document.documentElement.classList.remove("cle-modal-open"));
      on(dialog, "click", (e) => {
        // A tap on the backdrop (the dialog itself, outside the card) closes it.
        const t = e.target as HTMLElement;
        if (t === dialog || t.closest("[data-close]")) dialog.close();
      });
      const next = dialog.querySelector<HTMLElement>("[data-next]");
      if (next) {
        on(next, "click", () => {
          const to = document.getElementById(next.dataset.next ?? "") as HTMLDialogElement | null;
          if (!to) return;
          const back = list.querySelector<HTMLElement>(`[aria-controls="${to.id}"]`);
          dialog.close();
          open(to, null);
          // When this one closes, return focus to that person's photo, not the first one's (after the
          // browser's own focus restore, which would pick the first).
          const refocus = () => timers.push(setTimeout(() => back?.focus(), 0));
          to.addEventListener("close", refocus, { once: true });
          offs.push(() => to.removeEventListener("close", refocus));
        });
      }
    });

    return () => {
      offs.forEach((off) => off());
      timers.forEach(clearTimeout);
      document.documentElement.classList.remove("cle-modal-open");
    };
  }, []);

  return (
    <ul ref={ref} {...props}>
      {children}
    </ul>
  );
}
