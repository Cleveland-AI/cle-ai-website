import { fixturesAllowed } from "@/lib/forms/constants";

/** The Poptin popup pixel, on every site page (global constraints: "Popups"). */
export const POPTIN_PIXEL = "https://cdn.popt.in/pixel.js?id=52c969b3a6878";

/** What fixtures-mode builds load in its place: no test or local run ever calls Poptin. */
export const POPTIN_FIXTURE_PIXEL = "/assets/js/poptin-fixture.js";

/** The pixel's address: always Poptin's, except in a fixtures build, which never runs on Vercel (fixturesAllowed). */
export const poptinSrc = (env: NodeJS.ProcessEnv = process.env) => (fixturesAllowed(env) ? POPTIN_FIXTURE_PIXEL : POPTIN_PIXEL);
