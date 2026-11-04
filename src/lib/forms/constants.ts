// Shared by the server and the browser: nothing here may import server-only code.
export const DEFAULT_TO = "info@cle-ai.com";
export const DEFAULT_FROM = "CLE AI & DATA <forms@cle-ai.com>";

export const DEFAULT_HOSTNAMES = ["cle-ai.com", "www.cle-ai.com"];

/**
 * The one guard for every fixtures-mode shortcut (in-memory fakes, the outbox, the stub Turnstile token).
 * Never true on Vercel, so a stray CONTENT_SOURCE=fixtures there cannot turn the spam check off (R30).
 */
export const fixturesAllowed = (env: NodeJS.ProcessEnv = process.env) =>
  env.CONTENT_SOURCE === "fixtures" && !env.VERCEL && !env.VERCEL_ENV;

/** CONTENT_SOURCE=fixtures set where fixtures must not run. */
export const fixturesMisconfigured = (env: NodeJS.ProcessEnv = process.env) =>
  env.CONTENT_SOURCE === "fixtures" && !fixturesAllowed(env);

/** The test token a fixtures-mode form submits instead of loading Cloudflare's widget. */
export const FIXTURE_TOKEN = "fixture-pass";
