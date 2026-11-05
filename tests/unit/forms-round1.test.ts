// Task 13, fix round 1: fixtures guard, Turnstile hardening, idempotent Resend, body cap, markup.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blockComponents } from "@/blocks/registry";
import { needsFreshCheck, postForm } from "@/blocks/form/logic";
import { fixturesAllowed } from "@/lib/forms/constants";
import { handleSubmission, type FormDeps, type SubmissionDoc } from "@/lib/forms/handle";
import { turnstileIdempotencyKey, verifyTurnstile } from "@/lib/forms/turnstile";
import { GET, POST } from "@/app/api/forms/[form]/route";

const KEY = "3f2b8c1e-5d4a-4c7b-9e1f-0a1b2c3d4e5f";
const pitch = { name: "Ada", email: "ada@example.com", title: "T", description: "d", format: "talk", website: "", turnstileToken: "tok", key: KEY };
const ctx = (form: string) => ({ params: Promise.resolve({ form }) });
const req = (form: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/forms/${form}`, { method: "POST", headers, body: typeof payload === "string" ? payload : JSON.stringify(payload) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("R30: fixtures mode never runs on Vercel", () => {
  it("fixturesAllowed needs CONTENT_SOURCE=fixtures and no VERCEL / VERCEL_ENV", () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    expect(fixturesAllowed()).toBe(true);
    vi.stubEnv("VERCEL", "1");
    expect(fixturesAllowed()).toBe(false);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(fixturesAllowed()).toBe(false);
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    expect(fixturesAllowed()).toBe(false);
  });

  it("on Vercel with CONTENT_SOURCE=fixtures: POST is 503 unavailable, the outbox is 404, and it is logged loudly", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req("pitch", pitch), ctx("pitch"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "unavailable" });
    expect(err.mock.calls.flat().join(" ")).toMatch(/fixtures/i);
    expect((await GET(new Request("http://localhost/api/forms/outbox"), ctx("outbox"))).status).toBe(404);
  });

  it("fixtures without VERCEL still works", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    expect((await POST(req("pitch", { ...pitch, key: "7c1d2e3f-4a5b-4c6d-8e7f-8091a2b3c4d5" }), ctx("pitch"))).status).toBe(200);
    expect((await GET(new Request("http://localhost/api/forms/outbox"), ctx("outbox"))).status).toBe(200);
  });
});

describe("Turnstile hardening", () => {
  const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  it("sends the submission key as idempotency_key", async () => {
    const fetch = reply({ success: true });
    await verifyTurnstile("tok", "1.2.3.4", { secret: "s", fetch, idempotencyKey: KEY });
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
      secret: "s", response: "tok", remoteip: "1.2.3.4", idempotency_key: turnstileIdempotencyKey(KEY, "tok"),
    });
  });
  it("the idempotency key is derived from (submission key, token): same pair, same key; a fresh token, a new key; v4-shaped", () => {
    const a = turnstileIdempotencyKey(KEY, "tok-1");
    expect(turnstileIdempotencyKey(KEY, "tok-1")).toBe(a);
    expect(turnstileIdempotencyKey(KEY, "tok-2")).not.toBe(a);
    expect(turnstileIdempotencyKey("7c1d2e3f-4a5b-4c6d-8e7f-8091a2b3c4d5", "tok-1")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("warns, without the token, on an action or hostname mismatch", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await verifyTurnstile("secret-token", "", { secret: "s", fetch: reply({ success: true, action: "sponsor" }), action: "pitch" });
    await verifyTurnstile("secret-token", "", { secret: "s", fetch: reply({ success: true, hostname: "x-preview.vercel.app" }), hostnames: ["cle-ai.com"] });
    const text = warn.mock.calls.flat().join(" ");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(text).toContain("sponsor");
    expect(text).toContain("x-preview.vercel.app");
    expect(text).not.toContain("secret-token");
  });
  it("a reply whose action differs is a fail; a matching one passes", async () => {
    expect(await verifyTurnstile("t", "", { secret: "s", fetch: reply({ success: true, action: "sponsor" }), action: "pitch" })).toBe("fail");
    expect(await verifyTurnstile("t", "", { secret: "s", fetch: reply({ success: true, action: "pitch" }), action: "pitch" })).toBe("pass");
  });
  it("hostname must be in the allow-list", async () => {
    const opts = { secret: "s", hostnames: ["cle-ai.com", "www.cle-ai.com"] };
    expect(await verifyTurnstile("t", "", { ...opts, fetch: reply({ success: true, hostname: "evil.example" }) })).toBe("fail");
    expect(await verifyTurnstile("t", "", { ...opts, fetch: reply({ success: true }) })).toBe("fail");
    expect(await verifyTurnstile("t", "", { ...opts, fetch: reply({ success: true, hostname: "www.cle-ai.com" }) })).toBe("pass");
  });
  it("a bad or missing secret is unreachable (so the visitor sees unavailable) and is logged", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const code of ["invalid-input-secret", "missing-input-secret"]) {
      expect(await verifyTurnstile("t", "", { secret: "s", fetch: reply({ success: false, "error-codes": [code] }) })).toBe("unreachable");
    }
    expect(err).toHaveBeenCalledTimes(2);
    expect(await verifyTurnstile("t", "", { secret: "s", fetch: reply({ success: false, "error-codes": ["invalid-input-response"] }) })).toBe("fail");
  });
});

describe("handleSubmission passes the key and action on", () => {
  it("Turnstile gets the key and form as action; sendEmail gets idempotencyKey = the document id", async () => {
    const verify = vi.fn(async () => "pass" as const);
    const sends: { key: string }[] = [];
    const docs = new Map<string, SubmissionDoc>();
    const deps: FormDeps = {
      verifyTurnstile: verify,
      store: { create: async (d) => (docs.has(d._id) ? "exists" : (docs.set(d._id, d), "created")), markSent: async () => {} },
      sendEmail: async (_m, opts) => {
        sends.push({ key: opts.idempotencyKey });
      },
      newId: () => "11111111-2222-4333-8444-555555555555",
      now: () => new Date(),
      to: "t@x.co",
      from: "f@x.co",
      ip: "9.9.9.9",
    };
    await handleSubmission("pitch", pitch, deps);
    expect(verify).toHaveBeenCalledWith("tok", "9.9.9.9", { idempotencyKey: KEY, action: "pitch" });
    expect(sends).toEqual([{ key: `submission.${KEY}` }]);
  });
});

describe("Resend gets the idempotency key", () => {
  it("emails.send(payload, { idempotencyKey })", async () => {
    const send = vi.fn(async () => ({ data: { id: "1" }, error: null }));
    vi.doMock("resend", () => ({ Resend: class { emails = { send }; } }));
    const { sendWithResend } = await import("@/lib/forms/email");
    await sendWithResend("re_x", { to: "t@x.co", from: "f@x.co", replyTo: "a@x.co", subject: "s", text: "t", html: "h" }, { idempotencyKey: "submission.abc" });
    expect((send.mock.calls[0] as unknown[])[1]).toEqual({ idempotencyKey: "submission.abc" });
  });
});

describe("R31: a missing Sanity write token is logged once per instance, not per request", () => {
  it("still builds deps (email keeps working)", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("SANITY_API_WRITE_TOKEN", "");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { buildDeps } = await import("@/lib/forms/deps");
    const env = { RESEND_API_KEY: "re_x", TURNSTILE_SECRET_KEY: "s" } as unknown as NodeJS.ProcessEnv;
    for (let i = 0; i < 3; i++) expect(buildDeps("1.1.1.1", env)).not.toBeNull();
    expect(err.mock.calls.filter((c) => String(c[0]).includes("SANITY_API_WRITE_TOKEN"))).toHaveLength(1);
  });
});

describe("body cap", () => {
  it("a content-length above the cap is 413 before the body is read", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    const r = req("pitch", pitch, { "content-length": String(40 * 1024) });
    const text = vi.spyOn(r, "text");
    expect((await POST(r, ctx("pitch"))).status).toBe(413);
    expect(text).not.toHaveBeenCalled();
  });
  it("the cap counts bytes, not characters", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    const wide = "é".repeat(20 * 1024); // 20k characters, 40k bytes
    expect((await POST(req("pitch", JSON.stringify({ description: wide })), ctx("pitch"))).status).toBe(413);
  });
});

describe("postForm / needsFreshCheck", () => {
  const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it("maps responses to outcomes, and every non-ok one asks for a fresh spam check", async () => {
    const ok = await postForm(answer(200, { ok: true }), "pitch", {});
    const inv = await postForm(answer(422, { ok: false, error: "invalid", fields: { email: "bad" } }), "pitch", {});
    const spam = await postForm(answer(400, { ok: false, error: "spam" }), "pitch", {});
    const down = await postForm(answer(503, { ok: false, error: "unavailable" }), "pitch", {});
    const thrown = await postForm((async () => { throw new Error("offline"); }) as unknown as typeof fetch, "pitch", {});
    expect([ok.status, inv.status, spam.status, down.status, thrown.status]).toEqual(["done", "invalid", "spam", "unavailable", "unavailable"]);
    expect(inv).toMatchObject({ fields: { email: "bad" } });
    expect([ok, inv, spam, down, thrown].map(needsFreshCheck)).toEqual([false, true, true, true, true]);
  });
});

describe("form markup", () => {
  const html = (form: string) => renderToStaticMarkup(createElement(blockComponents.cleForm, { form }));
  it("posts (never a native GET), starts disabled until mounted, has a no-script fallback, and keeps its anchors", () => {
    for (const [form, id] of [["pitch", "speak-form"], ["sponsor", "sponsor-inquiry"]]) {
      const h = html(form);
      expect(h).toContain('method="post"');
      expect(h).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
      expect(h).toMatch(/<noscript>.*info@cle-ai\.com/);
      expect(h).toContain(`id="${id}"`);
    }
  });
});

describe("round 2: guards read the injected env", () => {
  it("buildDeps(ip, env) follows env, not process.env", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("VERCEL", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { buildDeps } = await import("@/lib/forms/deps");
    expect(buildDeps("1.1.1.1", { CONTENT_SOURCE: "fixtures", VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(buildDeps("1.1.1.1", { CONTENT_SOURCE: "fixtures" } as unknown as NodeJS.ProcessEnv)).not.toBeNull();
  });
  it("the Vercel+fixtures case logs its own line only, not the missing-secrets one", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("VERCEL", "1");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await POST(req("pitch", pitch), ctx("pitch"));
    const lines = err.mock.calls.map((c) => String(c[0]));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/fixtures/i);
    expect(lines[0]).not.toContain("RESEND_API_KEY");
  });
});
