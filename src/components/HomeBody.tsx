import { RichBody } from "@/components/RichBody";
import { SKIP_TARGET } from "@/components/SkipLink.client";
import { getHomepageBody } from "@/lib/content/queries";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { HydrationPending } from "@/lib/hydrating.client";

/** The homepage's content (front-page.html between the header and the footer). */
export async function HomeBody() {
  return <HomeBodyView body={await getHomepageBody()} />;
}

/**
 * The `homepage` document's body, whose first section is the page's <main> holding the story world.
 * As WordPress's skip-link script does, a <main> without an id gets wp--skip-link--target; one with
 * its own anchor keeps it, and SkipLink points the skip link there. A body without a <main> still
 * gets an (empty) one to land on. The figures line is in the first screen, so the count-up waits for
 * this content to hydrate (HydrationPending).
 */
export function HomeBodyView({ body }: { body: RichBodyValue }) {
  const i = body.findIndex((b) => b._type === "section" && b.tag === "main");
  if (i < 0) {
    return (
      <>
        <main id={SKIP_TARGET}>{body.length ? <RichBody value={body} /> : null}</main>
        <HydrationPending />
      </>
    );
  }
  const main = body[i] as Extract<RichBodyValue[number], { _type: "section" }>;
  const value = body.map((b, k) => (k === i ? { ...main, anchor: main.anchor || SKIP_TARGET } : b));
  return (
    <>
      <RichBody value={value} />
      <HydrationPending />
    </>
  );
}
