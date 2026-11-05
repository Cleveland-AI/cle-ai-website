"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { ArtImg } from "@/lib/art";
import { confetti } from "@/lib/confetti";
import { INTRO, formHref, mailtoHref, packageTier, pickPerk, requestPackage, resultText, tierIndex, type PickState } from "./logic";

type P = { label: string; desc: string; art: string; weight: number };
type T = { name: string; min: number; price: string };

/**
 * The builder (blocks/sponsor-builder/view.js): toggling perks fills the pile, totals the weights, lights
 * the matching tier and rewrites the button so the inquiry arrives with the picks already in it. Reaching
 * the top tier fires confetti once.
 */
export function SponsorBuilderView({
  wrapper,
  perks,
  tiers,
  form,
  mailto,
  buttonLabel,
}: {
  wrapper: { className: string; id?: string; style?: CSSProperties };
  perks: P[];
  tiers: T[];
  form: string;
  mailto: string;
  buttonLabel: string;
}) {
  const uid = useId();
  const [state, setState] = useState<PickState>({ picked: perks.map(() => false), celebrated: false });
  const tierRefs = useRef<(HTMLLIElement | null)[]>([]);
  const labels = perks.filter((_, i) => state.picked[i]).map((p) => p.label);
  const total = perks.reduce((sum, p, i) => sum + (state.picked[i] ? p.weight : 0), 0);
  const at = tierIndex(tiers, total);
  const tier = tiers[Math.max(at, 0)];
  const tierName = packageTier(tiers, total);
  const href = form ? formHref(form, labels) : mailtoHref(mailto, labels, tierName);

  const toggle = (i: number) => {
    const next = pickPerk(state, i, perks.map((p) => p.weight), tiers);
    setState(next.state);
    if (next.celebrate) confetti(tierRefs.current[tiers.length - 1]);
  };

  return (
    <div {...wrapper}>
      <div className="cle-builder__picks" role="group" aria-labelledby={`${uid}-label`}>
        <p className="cle-builder__label" id={`${uid}-label`}>
          Pick what you would like
        </p>
        {perks.map((perk, i) => (
          <button key={i} type="button" className="cle-builder__perk" aria-pressed={state.picked[i]} onClick={() => toggle(i)}>
            <ArtImg slug={perk.art} i={i} className="cle-builder__icon" />
            <span className="cle-builder__text">
              <strong>{perk.label}</strong>
              {perk.desc ? <span>{perk.desc}</span> : null}
            </span>
            <span className="cle-builder__check" aria-hidden="true"></span>
          </button>
        ))}
      </div>

      <div className="cle-builder__summary">
        <div className="cle-builder__pile" aria-hidden="true">
          {perks.map((perk, i) => (
            <ArtImg key={i} slug={perk.art} i={i} className={`cle-builder__piece${state.picked[i] ? " is-on" : ""}`} />
          ))}
        </div>
        <p className="cle-builder__result" aria-live="polite">
          {labels.length ? resultText(labels, tier) : INTRO}
        </p>
        {tiers.length ? (
          <ol className="cle-builder__tiers">
            {tiers.map((t, i) => (
              <li key={i} ref={(el) => void (tierRefs.current[i] = el)} className={i === at ? "is-match" : undefined}>
                <span>{t.name}</span> <span className="cle-builder__price">{t.price}</span>
              </li>
            ))}
          </ol>
        ) : null}
        <p>
          <a
            className="wp-element-button cle-builder__cta"
            href={href}
            onClick={(e) => {
              // Task 13's inquiry form, when the page has it, takes the package; otherwise the link is followed.
              if (requestPackage({ tier: tierName, perks: labels })) e.preventDefault();
            }}
          >
            {buttonLabel}
          </a>
        </p>
      </div>
    </div>
  );
}
