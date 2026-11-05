/**
 * A short burst of clay-coloured confetti for small celebrations (a team card opened, a sponsorship
 * package picked, a way in found, Dot poked). Skipped entirely for reduced motion. Port of
 * assets/js/confetti.js; styles in src/styles/blocks/confetti.css. Browser only: on the server it
 * does nothing.
 */
export type ConfettiOrigin = { x: number; y: number };

/** Confetti from a point in viewport pixels (the middle of the screen by default). */
export function fireConfetti(origin?: ConfettiOrigin): void {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const at = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  // confetti.js's five colours (accent #38B6FF, coral, yellow, green, navy), as palette tokens.
  const colors = ["accent", "coral", "yellow", "green", "indigo"].map((slug) => `var(--wp--preset--color--${slug})`);
  const layer = document.createElement("div");
  layer.className = "cle-confetti";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 28; i++) {
    const bit = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 110;
    bit.style.left = at.x + "px";
    bit.style.top = at.y + "px";
    bit.style.background = colors[i % colors.length];
    bit.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    bit.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
    bit.style.setProperty("--rot", Math.random() * 540 - 270 + "deg");
    bit.style.animationDelay = Math.random() * 80 + "ms";
    if (i % 3 === 0) bit.style.borderRadius = "50%";
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1400);
}

/** Confetti from the middle of an element. */
export function confetti(from: Element | null): void {
  if (!from) return;
  const r = from.getBoundingClientRect();
  fireConfetti({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
}
