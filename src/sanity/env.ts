/**
 * Sanity connection settings, shared by the Studio (browser) and the server.
 *
 * The NEXT_PUBLIC_ names are inlined into the Studio bundle; the plain names are the server-side
 * originals from .env.example. With no project configured, the placeholder id lets the build and
 * tests run without a Sanity account; `query()` refuses to call Sanity with it.
 */
export const PLACEHOLDER_PROJECT_ID = "cleaiplaceholder";

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || PLACEHOLDER_PROJECT_ID;

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";

export const apiVersion = "2026-11-01";
