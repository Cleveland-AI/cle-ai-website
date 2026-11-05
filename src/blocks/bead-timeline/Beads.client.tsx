"use client";

import { useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

const COLORS = ["accent", "coral", "yellow", "green", "ink", "pale-blue"];

const subscribeNever = () => () => {};

type Item = { year: string; title: string; body: string };

/**
 * The beads (blocks/bead-timeline/view.js): one story open at a time; arrow keys walk the cord. The
 * server markup has every story in the page, the closed ones marked `data-closed`; once the page has
 * hydrated they are hidden properly and the cord gets `is-ready`.
 */
export function Beads({ wrapper, items, open: initial }: { wrapper: { className: string; id?: string; style?: CSSProperties }; items: Item[]; open: number }) {
  const uid = `cle-beads-${useId()}`;
  const [open, setOpen] = useState(initial);
  // false on the server and while hydrating, true once the page is live (so no hydration mismatch).
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const beads = useRef<(HTMLButtonElement | null)[]>([]);

  const show = (i: number, focus: boolean) => {
    setOpen(i);
    const bead = beads.current[i];
    if (focus) bead?.focus();
    bead?.scrollIntoView({ block: "nearest", inline: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div {...wrapper} className={`${wrapper.className}${ready ? " is-ready" : ""}`}>
      <ol className="cle-beads__cord">
        {items.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              className="cle-beads__bead"
              id={`${uid}-b${i}`}
              ref={(el) => {
                beads.current[i] = el;
              }}
              aria-expanded={i === open ? "true" : "false"}
              aria-controls={`${uid}-p${i}`}
              style={{ "--c": `var(--wp--preset--color--${COLORS[i % COLORS.length]})` } as CSSProperties}
              onClick={() => show(i, false)}
              onKeyDown={(e) => {
                const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
                if (d && items[i + d]) {
                  e.preventDefault();
                  show(i + d, true);
                }
              }}
            >
              <span className="cle-beads__ball" aria-hidden="true"></span>
              <span className="cle-beads__year">{m.year}</span>
              <span className="screen-reader-text">: {m.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="cle-beads__stories">
        {items.map((m, i) => (
          <section
            key={i}
            className="cle-beads__story"
            id={`${uid}-p${i}`}
            aria-labelledby={`${uid}-h${i}`}
            hidden={ready && i !== open}
            {...(!ready && i !== open ? { "data-closed": "" } : {})}
          >
            <p className="cle-beads__when">{m.year}</p>
            <h3 id={`${uid}-h${i}`}>{m.title}</h3>
            {m.body ? <p>{m.body}</p> : null}
          </section>
        ))}
      </div>
    </div>
  );
}
