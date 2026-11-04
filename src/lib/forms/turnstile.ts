import { createHash } from "node:crypto";

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare's published always-pass test keys: used with fixtures only, never in production. */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

/**
 * Cloudflare's idempotency_key lets the same token be checked again with the same answer. It is derived
 * from (submission key, token), so a retry after a lost response works, while a fresh token (after a
 * widget reset) gets a fresh key and is never served another token's cached result. v4-shaped UUID.
 */
export function turnstileIdempotencyKey(submissionKey: string, token: string): string {
  const h = createHash("sha256").update(`${submissionKey}:${token}`).digest();
  h[6] = (h[6] & 0x0f) | 0x40;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export type TurnstileResult = "pass" | "fail" | "unreachable";

/**
 * Asks Cloudflare whether the visitor passed. "fail" is a rejected (or missing) token; "unreachable"
 * is Cloudflare not answering, which is never treated as a pass (the caller says "unavailable").
 * `fetch` is injected so tests make no network calls.
 */
export async function verifyTurnstile(
  token: string,
  ip: string,
  opts: { secret: string; fetch?: typeof fetch; idempotencyKey?: string; action?: string; hostnames?: string[] },
): Promise<TurnstileResult> {
  if (!token) return "fail";
  const doFetch = opts.fetch ?? fetch;
  try {
    const res = await doFetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: opts.secret,
        response: token,
        remoteip: ip,
        ...(opts.idempotencyKey ? { idempotency_key: turnstileIdempotencyKey(opts.idempotencyKey, token) } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "unreachable";
    const data = (await res.json()) as { success?: unknown; action?: unknown; hostname?: unknown; "error-codes"?: unknown };
    if (typeof data.success !== "boolean") return "unreachable";
    if (!data.success) {
      const codes = Array.isArray(data["error-codes"]) ? (data["error-codes"] as string[]) : [];
      // Our own secret is wrong: that is our outage, not the visitor's failure.
      if (codes.some((c) => c === "invalid-input-secret" || c === "missing-input-secret")) {
        console.error("forms: Turnstile rejected TURNSTILE_SECRET_KEY:", codes.join(", "));
        return "unreachable";
      }
      return "fail";
    }
    if (opts.action && typeof data.action === "string" && data.action !== opts.action) {
      console.warn(`forms: Turnstile action mismatch (expected ${opts.action}, got ${data.action})`);
      return "fail";
    }
    if (opts.hostnames && !(typeof data.hostname === "string" && opts.hostnames.includes(data.hostname))) {
      console.warn(`forms: Turnstile hostname not allowed: ${String(data.hostname)} (set TURNSTILE_HOSTNAMES to include preview hosts)`);
      return "fail";
    }
    return "pass";
  } catch {
    return "unreachable";
  }
}
