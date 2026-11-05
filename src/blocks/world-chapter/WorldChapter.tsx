import { cameraOf, chapterAnchor, chapterCropCamera, cropStyle, pointOf, StoryImg } from "@/blocks/story/images";
import type { WorldChapterAttrs } from "@/blocks/world/World";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { RichBody } from "@/components/RichBody";

/**
 * cle/world-chapter (blocks/world-chapter/render.php): the text for one beat, with its camera as
 * data-cam JSON and a static crop of the world picture for the stacked (reduced-motion / no-JS) layout.
 */
export function WorldChapter(props: BlockSupports & WorldChapterAttrs) {
  const [supports, a] = splitSupports(props);
  const cam = cameraOf(a.camera);
  // Everything below this line of the picture (percent from the top) fades into the page; 0 = off.
  const fade = Number(a.fadeBelow ?? 0) || 0;
  const camData = fade > 0 && fade < 100 ? { ...cam, cut: fade } : cam;
  const stop = pointOf(a.stop);
  const anchor = chapterAnchor(a);
  return (
    <article
      {...wrapperProps("world-chapter", "cle-wchapter", supports)}
      data-cam={JSON.stringify(camData)}
      {...(stop ? { "data-stop": stop } : {})}
      {...(anchor ? { id: anchor } : {})}
    >
      <div className="cle-wchapter__crop" aria-hidden="true" style={cropStyle(chapterCropCamera(cam))}>
        <StoryImg slug="world" />
      </div>
      <div className="cle-wchapter__body">
        <RichBody value={a.children} />
      </div>
    </article>
  );
}
