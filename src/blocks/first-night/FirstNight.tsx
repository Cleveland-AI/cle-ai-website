import { useId } from "react";
import { NextEvent } from "@/blocks/next-event/NextEvent";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { ArtImg, artExists } from "@/lib/art";
import { FirstNightFrame } from "./FirstNightFrame.client";

export type FirstNightStep = { _key?: string; time?: string | null; title?: string | null; text?: string | null; art?: string | null; fallback?: string | null };
export type FirstNightAttrs = {
  visible?: boolean | null;
  eyebrow?: string | null;
  heading?: string | null;
  match?: string | null;
  steps?: FirstNightStep[] | null;
};

// block.json defaults.
const STEPS: FirstNightStep[] = [
  {
    time: "6:00 PM",
    title: "You arrive",
    text: "Happy Dog, 5801 Detroit Avenue in Gordon Square. Parking is free. Look for the table with the laptops and the name tags.",
    art: "night-arrive",
    fallback: "dot-welcome",
  },
  { time: "6:10", title: "You grab a dog", text: "Fifty-odd toppings, your call. Food and drinks are on you; nothing else costs a thing.", art: "night-dog", fallback: "dot-social" },
  {
    time: "6:30",
    title: "You talk",
    text: "No slides. Someone asks what you're curious about, and that is the evening. Beginners and people who build this for a living share a table.",
    art: "night-talk",
    fallback: "dot-stage",
  },
  {
    time: "7:30",
    title: "The hour after",
    text: "The part people come back for: the introductions, the “you should talk to…”, the project that could use a hand.",
    art: "night-after",
    fallback: "dot-workshop",
  },
  { time: "8:00", title: "You head home", text: "Three new names in your phone and a reason to come back next month.", art: "night-home", fallback: "dot-hike" },
];

/**
 * cle/first-night (blocks/first-night/render.php): five moments of a social, for someone who has never
 * been. On wide screens the picture is pinned beside the moments and changes as each one scrolls into
 * view (FirstNightFrame sets data-on); on phones, without JS and under reduced motion each moment shows
 * its own picture. The last moment carries the next social. Hidden ("Show on the site" off) renders
 * nothing, but the block keeps its content.
 */
export function FirstNight(props: BlockSupports & FirstNightAttrs) {
  const [supports, a] = splitSupports({ ...props, align: props.align ?? "full" });
  const uid = `cle-night-${useId()}`;
  if (a.visible === false) return null;
  const steps = (a.steps ?? STEPS).filter((s) => String(s.title ?? "").trim() !== "");
  if (!steps.length) return null;
  const eyebrow = a.eyebrow ?? "Your first night";
  const match = a.match ?? "Social";
  const art = (s: FirstNightStep, i: number) => (
    <ArtImg slug={artExists(String(s.art ?? "")) ? String(s.art) : String(s.fallback ?? "")} i={i} className="cle-night__art" />
  );
  return (
    <FirstNightFrame {...wrapperProps("first-night", "cle-night", supports)} aria-labelledby={`${uid}-h`}>
      <div className="cle-night__head">
        {eyebrow !== "" ? <p className="is-style-eyebrow">{eyebrow}</p> : null}
        <h2 id={`${uid}-h`}>{a.heading ?? "What a social is actually like."}</h2>
      </div>
      <div className="cle-night__body">
        <div className="cle-night__stage" aria-hidden="true">
          <div className="cle-night__frames">
            {steps.map((s, i) => (
              <figure key={s._key ?? i} className="cle-night__frame" data-step={i}>
                {art(s, i)}
                <figcaption>{s.time ?? ""}</figcaption>
              </figure>
            ))}
          </div>
          <ol className="cle-night__dots">
            {steps.map((s, i) => (
              <li key={s._key ?? i} data-step={i}></li>
            ))}
          </ol>
        </div>
        <ol className="cle-night__steps">
          {steps.map((s, i) => (
            <li key={s._key ?? i} className="cle-night__step" data-step={i}>
              <div className="cle-night__own" aria-hidden="true">
                {art(s, i)}
              </div>
              <p className="cle-night__time">{s.time ?? ""}</p>
              <h3>{s.title}</h3>
              {s.text ? <p>{s.text}</p> : null}
              {i === steps.length - 1 && match !== "" ? (
                <NextEvent
                  match={match}
                  eyebrow="Next social"
                  showExcerpt={false}
                  emptyText="Check Meetup for the next date."
                  emptyLinkLabel="See the Meetup group"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </FirstNightFrame>
  );
}
