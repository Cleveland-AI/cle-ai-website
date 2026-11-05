import { chapterAnchor, chapterCropCamera, chapterState, cropStyle, StoryImg, type StoryChapterAttrs } from "@/blocks/story/images";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { RichBody } from "@/components/RichBody";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { cleIcon } from "@/lib/icons";

/**
 * cle/story-chapter (blocks/story-chapter/render.php): one beat of the story. Its scene state rides
 * along as data-chapter JSON; the crop (the whole scene, or the neon room at night) is the stacked
 * layout's picture. The finale (pattern) has none.
 */
export function StoryChapter(props: BlockSupports & StoryChapterAttrs & { _type?: string; _key?: string; children?: RichBodyValue | null }) {
  const [supports, a] = splitSupports(props);
  const state = chapterState(a);
  const crop = chapterCropCamera(state.camera);
  const anchor = chapterAnchor(a);
  const extra = `cle-chapter${state.night ? " is-night-chapter" : ""}${state.pattern ? " is-pattern-chapter" : ""}`;
  return (
    <article {...wrapperProps("story-chapter", extra, supports)} data-chapter={JSON.stringify(state)} {...(anchor ? { id: anchor } : {})}>
      {!state.pattern ? (
        <div className="cle-chapter__crop" aria-hidden="true" style={cropStyle(crop)}>
          <StoryImg slug={state.night ? "neon" : "composite"} />
        </div>
      ) : null}
      {state.icon ? <span className="cle-chapter__icon" dangerouslySetInnerHTML={{ __html: cleIcon(state.icon) }} /> : null}
      <div className="cle-chapter__body">
        <RichBody value={a.children} />
      </div>
    </article>
  );
}
