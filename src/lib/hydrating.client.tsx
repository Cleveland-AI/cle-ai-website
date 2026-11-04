"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A hidden marker that exists only until the React tree it sits in has hydrated: rendered on the
 * server and in the hydration pass, removed by the re-render right after. Scripts that rewrite
 * server-rendered text (the figures count-up) wait while one is on the page, so React never finds
 * text it didn't render. Put it in a page's own content: the layout hydrates before the page does.
 */
export function HydrationPending() {
  const pending = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
  return pending ? <span hidden data-cle-hydrating="" /> : null;
}
