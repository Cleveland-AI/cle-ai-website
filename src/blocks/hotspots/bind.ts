/**
 * The shared marker behaviour (assets/js/hotspots.js window.cleHotspots) on an element holding
 * .cle-scene__pin buttons: hover or focus opens a marker's popover, click toggles it, one open at a
 * time. Escape closes and returns focus to the last marker; arrow keys move between markers.
 * Browser only: call it from an effect. Returns closeAll (for callers that hide the markers, like the
 * story stage) and destroy, which removes every listener.
 */
export function bindHotspots(root: HTMLElement, { closeOnLeave = true }: { closeOnLeave?: boolean } = {}) {
  const pins = Array.from(root.querySelectorAll<HTMLButtonElement>(".cle-scene__pin"));
  let last: HTMLButtonElement | null = null;
  let openedAt = 0;
  let quietFocus = false;
  const popFor = (pin: HTMLElement) => document.getElementById(pin.getAttribute("aria-controls") ?? "");
  const isOpen = (pin: HTMLElement) => pin.getAttribute("aria-expanded") === "true";
  const closeAll = () => {
    for (const pin of pins) {
      pin.setAttribute("aria-expanded", "false");
      const pop = popFor(pin);
      if (pop) pop.hidden = true;
    }
  };
  const offs: (() => void)[] = [];
  if (!pins.length) return { closeAll, destroy: () => {} };
  const open = (pin: HTMLButtonElement) => {
    if (!isOpen(pin)) {
      closeAll();
      pin.setAttribute("aria-expanded", "true");
      const pop = popFor(pin);
      if (pop) pop.hidden = false;
      openedAt = Date.now();
    }
    last = pin;
  };
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Document, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn as EventListener);
    offs.push(() => el.removeEventListener(type, fn as EventListener));
  };
  pins.forEach((pin, i) => {
    on(pin, "mouseenter", () => open(pin));
    on(pin, "focus", () => {
      if (!quietFocus) open(pin);
    });
    // A click that immediately follows the hover/focus that opened it keeps it open.
    on(pin, "click", () => {
      if (isOpen(pin)) {
        if (Date.now() - openedAt > 400) closeAll();
      } else open(pin);
    });
    on(pin, "keydown", (e) => {
      const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
      if (step) {
        e.preventDefault();
        pins[(i + step + pins.length) % pins.length].focus();
      }
    });
  });
  if (closeOnLeave) on(root, "mouseleave", closeAll);
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && last && pins.some(isOpen)) {
      closeAll();
      quietFocus = true;
      last.focus();
      quietFocus = false;
    }
  });
  on(document, "click", (e) => {
    if (!root.contains(e.target as Node)) closeAll();
  });
  return { closeAll, destroy: () => offs.forEach((off) => off()) };
}
