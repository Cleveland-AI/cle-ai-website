import { createClient } from "@sanity/client";
import { apiVersion, dataset, PLACEHOLDER_PROJECT_ID, projectId } from "@/sanity/env";
import { sendWithResend, type EmailMessage } from "./email";
import type { FormDeps, SubmissionDoc } from "./handle";
import { TURNSTILE_TEST_SECRET, verifyTurnstile } from "./turnstile";

import { DEFAULT_FROM, DEFAULT_HOSTNAMES, DEFAULT_TO, fixturesAllowed, fixturesMisconfigured } from "./constants";

/** Fixtures mode keeps everything in memory, so end-to-end tests make no live calls and can read it back. */
const memory: { emails: (EmailMessage & { idempotencyKey?: string })[]; submissions: SubmissionDoc[] } = { emails: [], submissions: [] };
export const outbox = () => memory;

function fixtureDeps(ip: string): FormDeps {
  return {
    // Same answer as Cloudflare's always-pass test secret, without the network.
    verifyTurnstile: async (token) => (token ? "pass" : "fail"),
    store: {
      create: async (doc) => {
        if (memory.submissions.some((s) => s._id === doc._id)) return "exists";
        memory.submissions.push(structuredClone(doc));
        return "created";
      },
      markSent: async (id) => {
        const s = memory.submissions.find((d) => d._id === id);
        if (s) s.emailStatus = "sent";
      },
    },
    sendEmail: async (m, opts) => {
      memory.emails.push({ ...m, idempotencyKey: opts.idempotencyKey });
    },
    newId: () => crypto.randomUUID(),
    now: () => new Date(),
    to: DEFAULT_TO,
    from: DEFAULT_FROM,
    ip,
  };
}

let warnedNoWriter = false;

/**
 * The real dependencies, or null when a secret the form cannot do without is missing: the route then
 * answers "unavailable" rather than skip Turnstile or pretend to send. The Sanity write token is not on
 * that list: without it the email still goes out (the submission just isn't saved).
 */
export function buildDeps(ip: string, env: NodeJS.ProcessEnv = process.env): FormDeps | null {
  if (fixturesMisconfigured(env)) {
    console.error("forms: CONTENT_SOURCE=fixtures on Vercel; refusing all submissions. Unset CONTENT_SOURCE or set it to sanity.");
    return null;
  }
  if (fixturesAllowed(env)) return fixtureDeps(ip);
  const resendKey = env.RESEND_API_KEY;
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!resendKey || !secret || secret === TURNSTILE_TEST_SECRET) return null;

  const token = env.SANITY_API_WRITE_TOKEN;
  const writer =
    token && projectId !== PLACEHOLDER_PROJECT_ID ? createClient({ projectId, dataset, apiVersion, token, useCdn: false }) : null;
  if (!writer && !warnedNoWriter) {
    warnedNoWriter = true;
    console.error("forms: SANITY_API_WRITE_TOKEN (or the Sanity project) is not set; submissions are emailed but not saved");
  }
  const hostnames = (env.TURNSTILE_HOSTNAMES || "").split(",").map((h) => h.trim()).filter(Boolean);

  return {
    verifyTurnstile: (t, remote, ctx) =>
      verifyTurnstile(t, remote, { secret, idempotencyKey: ctx.idempotencyKey, action: ctx.action, hostnames: hostnames.length ? hostnames : DEFAULT_HOSTNAMES }),
    store: {
      create: async (doc) => {
        if (!writer) throw new Error("no Sanity write token configured");
        try {
          await writer.create(doc);
          return "created";
        } catch (err) {
          if ((err as { statusCode?: number }).statusCode === 409) return "exists";
          throw err;
        }
      },
      markSent: async (id) => {
        if (writer) await writer.patch(id).set({ emailStatus: "sent" }).commit();
      },
    },
    sendEmail: (m, opts) => sendWithResend(resendKey, m, opts),
    newId: () => crypto.randomUUID(),
    now: () => new Date(),
    to: env.FORMS_TO || DEFAULT_TO,
    from: env.FORMS_FROM || DEFAULT_FROM,
    ip,
  };
}
