"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ArtImg } from "@/lib/art";
import { confetti } from "@/lib/confetti";
import { QUESTIONS, WAYS, recommend } from "./logic";

const behavior = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

/** The quiz (blocks/way-finder/view.js): once all three are answered, recommend a way in and offer to scroll to its section. */
export function WayFinderView({
  wrapper,
  heading,
  intro,
  art,
}: {
  wrapper: { className: string; id?: string; style?: CSSProperties };
  heading: string;
  intro: string;
  art: string;
}) {
  const uid = useId();
  const [answers, setAnswers] = useState<(string | null)[]>(QUESTIONS.map(() => null));
  const pickRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const done = answers.every((a) => a !== null);
  const best = done ? recommend(answers as string[]) : null;

  const answer = (q: number, value: string) => {
    const next = answers.map((a, k) => (k === q ? value : a));
    setAnswers(next);
    if (!done && next.every((a) => a !== null)) {
      // The result has just appeared: a little party and scroll it into view, once.
      frame.current = requestAnimationFrame(() => {
        confetti(pickRef.current);
        resultRef.current?.scrollIntoView({ block: "nearest", behavior: behavior() });
      });
    }
  };

  return (
    <div {...wrapper}>
      <div className="cle-finder__head">
        <ArtImg slug={art} i={3} className="cle-finder__art" />
        <div>
          <h2 className="cle-finder__title">{heading}</h2>
          <p>{intro}</p>
        </div>
      </div>
      <form className="cle-finder__form" action="#" aria-label="Find your way in" onSubmit={(e) => e.preventDefault()}>
        {QUESTIONS.map(([question, options], q) => (
          <fieldset key={q} className="cle-finder__q">
            <legend>
              <span className="cle-finder__n">{q + 1}</span> {question}
            </legend>
            <div className="cle-finder__options">
              {options.map(([label, scores]) => (
                <label key={label} className="cle-finder__option">
                  <input type="radio" name={`${uid}-q${q}`} value={scores} checked={answers[q] === scores} onChange={() => answer(q, scores)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </form>
      <div className="cle-finder__result" aria-live="polite" hidden={!best} ref={resultRef}>
        <p className="cle-finder__eyebrow">We would start here</p>
        <p className="cle-finder__pick" ref={pickRef}>
          {best ? WAYS[best][0] : ""}
        </p>
        <p className="cle-finder__why">{best ? WAYS[best][1] : ""}</p>
        <p className="cle-finder__go">
          <a
            className="wp-element-button"
            href={`#${best ?? "events"}`}
            onClick={(e) => {
              const target = document.getElementById(best ?? "events");
              if (!target) return;
              e.preventDefault();
              target.scrollIntoView({ behavior: behavior() });
              target.setAttribute("tabindex", "-1");
              target.focus({ preventScroll: true });
            }}
          >
            Take me there
          </a>
        </p>
      </div>
    </div>
  );
}
