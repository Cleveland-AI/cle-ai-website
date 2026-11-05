import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { fixturesAllowed } from "@/lib/forms/constants";
import { isFormKind } from "@/lib/forms/schemas";
import { TURNSTILE_TEST_SITE_KEY } from "@/lib/forms/turnstile";
import { ANCHORS } from "./fields";
import { FormView } from "./Form.client";

export type FormAttrs = { form?: string | null };

/**
 * cle/form (the one block the rewrite adds to the theme's set): the pitch-a-talk and sponsor-inquiry
 * forms. Anchors are speak-form and sponsor-inquiry unless the block sets its own. The Turnstile widget
 * is loaded by the client part, so only a page with a form ever contacts Cloudflare; fixtures mode uses
 * Cloudflare's published test site key and skips the widget altogether.
 */
export function Form(props: BlockSupports & FormAttrs) {
  const [supports, a] = splitSupports(props);
  if (!isFormKind(a.form)) return null;
  const fixtures = fixturesAllowed();
  const siteKey = fixtures ? TURNSTILE_TEST_SITE_KEY : (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "");
  return (
    <FormView
      kind={a.form}
      wrapper={wrapperProps("form", "cle-form", { ...supports, anchor: supports.anchor || ANCHORS[a.form] })}
      siteKey={siteKey}
      fixtures={fixtures}
    />
  );
}
