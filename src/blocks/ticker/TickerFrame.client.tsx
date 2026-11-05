"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * The ticker's wrapper and its Pause/Play button (blocks/ticker/view.js). Paused adds `is-paused`, which
 * stops the CSS animation. Under reduced motion the CSS already shows a still, scrollable row.
 */
export function TickerFrame({
  wrapper,
  pause,
  play,
  children,
}: {
  wrapper: { className: string; id?: string; style?: CSSProperties; role: string; "aria-label": string };
  pause: string;
  play: string;
  children: ReactNode;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <div {...wrapper} className={`${wrapper.className}${paused ? " is-paused" : ""}`}>
      {children}
      <button type="button" className="cle-ticker__toggle" data-play={play} onClick={() => setPaused((p) => !p)}>
        {paused ? play : pause}
      </button>
    </div>
  );
}
