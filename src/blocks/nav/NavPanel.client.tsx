"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

/**
 * The phone overlay menu (blocks/nav/view.js). Opening moves focus to the close button and closing
 * returns it to the menu button. It closes on Escape, the close button, a link, or a tap on the
 * overlay background.
 */
export function NavPanel({
  className,
  id,
  style,
  openLabel,
  closeLabel,
  children,
}: {
  className: string;
  id?: string;
  style?: CSSProperties;
  openLabel: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const panelId = `cle-nav-panel-${useId().replace(/[^\w-]/g, "")}`;
  const [open, setOpen] = useState(false);
  const toggled = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const set = useCallback((isOpen: boolean) => {
    toggled.current = true;
    setOpen(isOpen);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cle-nav-is-open", open);
    if (toggled.current) (open ? closeButton : openButton).current?.focus();
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") set(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, set]);

  useEffect(() => () => document.body.classList.remove("cle-nav-is-open"), []);

  const onPanelClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (open && (target === e.currentTarget || target.closest("a"))) set(false);
  };

  return (
    <div className={className} id={id} style={style}>
      <button
        type="button"
        className="cle-nav__open"
        aria-expanded={open}
        aria-controls={panelId}
        ref={openButton}
        onClick={() => set(true)}
      >
        <span className="cle-nav__bars" aria-hidden="true"></span>
        <span className="screen-reader-text">{openLabel}</span>
      </button>
      {/* A tap on the overlay background closes it; Escape is handled on the document. */}
      <div className={open ? "cle-nav__panel is-open" : "cle-nav__panel"} id={panelId} onClick={onPanelClick}>
        <button type="button" className="cle-nav__close" ref={closeButton} onClick={() => set(false)}>
          {closeLabel}
        </button>
        {children}
      </div>
    </div>
  );
}
