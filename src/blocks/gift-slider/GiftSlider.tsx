import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { GiftSliderView } from "./GiftSlider.client";
import { DEFAULT_STEPS, clampStart, cleanSteps, type GiftStep } from "./logic";

export type GiftSliderAttrs = {
  steps?: GiftStep[] | null;
  start?: number | null;
  target?: string | null;
  buttonLabel?: string | null;
};

/**
 * cle/gift-slider: pick an amount, see what it pays for. Each step's object joins the pile, so a bigger
 * gift shows everything the smaller ones cover too. Without scripts it is a plain list of amounts and
 * what each covers (the live slider is `hidden` until the client part mounts).
 */
export function GiftSlider(props: BlockSupports & GiftSliderAttrs) {
  const [supports, a] = splitSupports(props);
  const steps = cleanSteps(a.steps ?? DEFAULT_STEPS);
  if (!steps.length) return null;
  return (
    <GiftSliderView
      wrapper={wrapperProps("gift-slider", "cle-gift", supports)}
      steps={steps}
      start={clampStart(a.start, steps.length)}
      target={a.target ?? "#donate"}
      buttonLabel={a.buttonLabel ?? "Give %s"}
    />
  );
}
