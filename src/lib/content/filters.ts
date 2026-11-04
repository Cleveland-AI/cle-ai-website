/**
 * Scheduled publishing without a paid Sanity plan: a post with a future `publishOn` stays
 * invisible until its time. Every public post query must include this filter.
 */
export const VISIBLE_NOW = "(!defined(publishOn) || publishOn <= now())";
