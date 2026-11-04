"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { confetti } from "@/lib/confetti";

/**
 * Dot's behaviour (blocks/mascot/view.js): the peeking pose rises into view once it scrolls on
 * screen, and poking any Dot three times in quick succession makes him hop, with confetti.
 */
export function DotFrame({
  className,
  id,
  style,
  peek,
  children,
}: {
  className: string;
  id?: string;
  style?: CSSProperties;
  peek: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pokes = useRef<number[]>([]);

  useEffect(() => {
    const dot = ref.current;
    if (!dot || !peek || !("IntersectionObserver" in window)) return;
    dot.classList.add("is-waiting");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          dot.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(dot);
    return () => io.disconnect();
  }, [peek]);

  const poke = () => {
    const dot = ref.current;
    if (!dot) return;
    const now = Date.now();
    pokes.current = pokes.current.filter((t) => now - t < 1200).concat(now);
    if (pokes.current.length >= 3) {
      pokes.current = [];
      dot.classList.remove("is-hopping");
      void dot.offsetWidth; // restart the animation
      dot.classList.add("is-hopping");
      confetti(dot);
    }
  };

  return (
    <div ref={ref} className={className} id={id} style={style} onClick={poke}>
      {children}
    </div>
  );
}
