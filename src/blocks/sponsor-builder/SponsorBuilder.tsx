import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { SponsorBuilderView } from "./SponsorBuilder.client";
import {
  DEFAULT_PERKS,
  DEFAULT_TIERS,
  cleanEmail,
  cleanForm,
  cleanPerks,
  cleanTiers,
  mailtoBase,
  type Perk,
  type Tier,
} from "./logic";

export type SponsorBuilderAttrs = {
  perks?: Perk[] | null;
  tiers?: Tier[] | null;
  formUrl?: string | null;
  email?: string | null;
  buttonLabel?: string | null;
};

/**
 * cle/sponsor-builder: tap perks, watch the package fill, see the tier it adds up to, and ask about it.
 * Server-rendered as the theme's markup (a plain list of perks and tiers and an email link without
 * scripts); the client part (SponsorBuilder.client.tsx) makes the perks toggle.
 */
export function SponsorBuilder(props: BlockSupports & SponsorBuilderAttrs) {
  const [supports, a] = splitSupports(props);
  const perks = cleanPerks(a.perks ?? DEFAULT_PERKS);
  if (!perks.length) return null;
  return (
    <SponsorBuilderView
      wrapper={wrapperProps("sponsor-builder", "cle-builder", supports)}
      perks={perks.map((p) => ({ label: p.label, desc: p.desc ?? "", art: p.art ?? "", weight: Number(p.weight ?? 1) || 0 }))}
      tiers={cleanTiers(a.tiers ?? DEFAULT_TIERS).map((t) => ({ name: t.name, min: Number(t.min ?? 0) || 0, price: t.price ?? "" }))}
      form={cleanForm(a.formUrl)}
      mailto={mailtoBase(cleanEmail(a.email))}
      buttonLabel={a.buttonLabel ?? "Ask about this package"}
    />
  );
}
