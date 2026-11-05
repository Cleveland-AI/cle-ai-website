import type { ComponentType } from "react";
import { BeadTimeline } from "./bead-timeline/BeadTimeline";
import { ComingUp } from "./coming-up/ComingUp";
import { EmbedForm } from "./embed-form/EmbedForm";
import { FirstNight } from "./first-night/FirstNight";
import { Form } from "./form/Form";
import { GiftSlider } from "./gift-slider/GiftSlider";
import { HotspotScene } from "./hotspot-scene/HotspotScene";
import { EventMetaBlock } from "./event-meta/EventMeta";
import { Logo } from "./logo/Logo";
import { MascotBlock } from "./mascot/Mascot";
import { MenuBlock } from "./menu/Menu";
import { NavBlock } from "./nav/Nav";
import { NextEvent } from "./next-event/NextEvent";
import { SponsorBuilder } from "./sponsor-builder/SponsorBuilder";
import { Story } from "./story/Story";
import { StoryChapter } from "./story-chapter/StoryChapter";
import { TeamBlock } from "./team/Team";
import { Ticker } from "./ticker/Ticker";
import { Timeline } from "./timeline/Timeline";
import { VenueMap } from "./venue-map/VenueMap";
import { WayFinder } from "./way-finder/WayFinder";
import { World } from "./world/World";
import { WorldChapter } from "./world-chapter/WorldChapter";

/**
 * Block components for the cle* types in richBody, keyed by `_type`. Each receives the block's
 * attributes spread as props (R10). Each block task registers its component here. A cle* type with
 * no entry renders nothing (and warns once).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each block has its own props
export const blockComponents: Record<string, ComponentType<any>> = {
  cleLogo: Logo,
  cleNav: NavBlock,
  cleMenu: MenuBlock,
  cleMascot: MascotBlock,
  cleNextEvent: NextEvent,
  cleEventMeta: EventMetaBlock,
  cleVenueMap: VenueMap,
  cleTeam: TeamBlock,
  cleBeadTimeline: BeadTimeline,
  cleHotspotScene: HotspotScene,
  cleEmbedForm: EmbedForm,
  cleForm: Form,
  cleTicker: Ticker,
  cleTimeline: Timeline,
  cleSponsorBuilder: SponsorBuilder,
  cleGiftSlider: GiftSlider,
  cleWayFinder: WayFinder,
  cleComingUp: ComingUp,
  cleWorld: World,
  cleWorldChapter: WorldChapter,
  cleStory: Story,
  cleStoryChapter: StoryChapter,
  cleFirstNight: FirstNight,
};
