"use client";

import { useId, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArtImg } from "@/lib/art";
import { money } from "./logic";

const subscribe = () => () => {};

/** The slider (blocks/gift-slider/view.js): the pile shows every object up to the step, the button follows the amount. */
export function GiftSliderView({
  wrapper,
  steps,
  start,
  target,
  buttonLabel,
}: {
  wrapper: { className: string; id?: string; style?: CSSProperties };
  steps: { amount: number; label: string; art: string }[];
  start: number;
  target: string;
  buttonLabel: string;
}) {
  const uid = useId();
  const [i, setI] = useState(start);
  // Scripts on: false on the server and while hydrating, then true, so the slider replaces the plain list.
  const live = useSyncExternalStore(subscribe, () => true, () => false);
  const s = steps[i];
  const fill = `${(i / Math.max(1, steps.length - 1)) * 100}%`;
  return (
    <div {...wrapper}>
      <div className="cle-gift__live" hidden={!live}>
        <p className="cle-gift__amount" aria-hidden="true">
          {money(s.amount)}
        </p>
        <div className="cle-gift__pile" aria-hidden="true">
          {steps.map((step, k) => (
            <ArtImg key={k} slug={step.art} i={k} className={`cle-gift__piece${k <= i ? " is-on" : ""}`} />
          ))}
        </div>
        <p className="cle-gift__covers" aria-live="polite">
          {s.label}
        </p>
        <label className="screen-reader-text" htmlFor={uid}>
          Gift amount
        </label>
        <input
          className="cle-gift__range"
          id={uid}
          type="range"
          min={0}
          max={steps.length - 1}
          step={1}
          value={i}
          aria-valuetext={`${money(s.amount)}: ${s.label}`}
          style={{ "--fill": fill } as CSSProperties}
          onChange={(e) => setI(Number(e.target.value))}
        />
        <div className="cle-gift__ticks" aria-hidden="true">
          {steps.map((step, k) => (
            <span key={k}>{money(step.amount)}</span>
          ))}
        </div>
        <p>
          <a className="wp-element-button cle-gift__cta" href={target}>
            {buttonLabel.replace("%s", money(s.amount))}
          </a>
        </p>
      </div>
      <ul className="cle-gift__list" hidden={live}>
        {steps.map((step, k) => (
          <li key={k}>
            <strong>{money(step.amount)}</strong> {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
