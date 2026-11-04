// Task 13: the pitch and sponsor forms. Every dependency (Turnstile, Sanity, Resend) is injected; nothing here touches the network.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blockComponents } from "@/blocks/registry";
import { buildEmail } from "@/lib/forms/email";
import { handleSubmission, type FormDeps, type SubmissionDoc } from "@/lib/forms/handle";
import { pitchSchema, sponsorSchema } from "@/lib/forms/schemas";
import { verifyTurnstile } from "@/lib/forms/turnstile";
import { replaceInquiryEmbeds } from "../../scripts/migrate-wp/index";
import { schemaTypes } from "@/sanity/schemas";

const KEY = "3f2b8c1e-5d4a-4c7b-9e1f-0a1b2c3d4e5f";
const pitch = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  title: "Notes on an engine",
  description: "A talk about the first program.",
  format: "talk",
  link: "https://example.com/ada",
  months: "March or April",
  website: "",
  turnstileToken: "tok",
  key: KEY,
};

type Sent = { to: string; from: string; replyTo: string; subject: string; text: string; html: string };

function fakes(over: Partial<FormDeps> = {}) {
  const docs = new Map<string, SubmissionDoc>();
  const sent: Sent[] = [];
  const deps: FormDeps = {
    verifyTurnstile: async () => "pass",
    store: {
      create: async (doc) => {
        if (docs.has(doc._id)) return "exists";
        docs.set(doc._id, structuredClone(doc));
        return "created";
      },
      markSent: async (id) => {
        docs.get(id)!.emailStatus = "sent";
      },
    },
    sendEmail: async (m) => {
      sent.push(m);
    },
    newId: () => "11111111-2222-4333-8444-555555555555",
    now: () => new Date("2026-11-04T12:00:00Z"),
    to: "info@cle-ai.com",
    from: "CLE AI & DATA <forms@cle-ai.com>",
    ip: "203.0.113.9",
    ...over,
  };
  return { deps, docs, sent };
}

afterEach(() => vi.restoreAllMocks());

describe("schemas", () => {
  it("trims every field and accepts a full pitch", () => {
    const r = pitchSchema.parse({ ...pitch, name: "  Ada  ", format: "lightning" });
    expect(r.name).toBe("Ada");
    expect(r.format).toBe("lightning");
  });
  it("caps the description at 2,000 characters", () => {
    expect(pitchSchema.safeParse({ ...pitch, description: "x".repeat(2000) }).success).toBe(true);
    expect(pitchSchema.safeParse({ ...pitch, description: "x".repeat(2001) }).success).toBe(false);
    expect(sponsorSchema.safeParse({ name: "a", email: "a@b.co", company: "c", message: "x".repeat(2001) }).success).toBe(false);
  });
  it("only allows the four formats, and only http(s) links", () => {
    expect(pitchSchema.safeParse({ ...pitch, format: "keynote" }).success).toBe(false);
    expect(pitchSchema.safeParse({ ...pitch, link: "javascript:alert(1)" }).success).toBe(false);
    expect(pitchSchema.safeParse({ ...pitch, link: "" }).success).toBe(true);
    expect(pitchSchema.safeParse({ ...pitch, link: "http://example.com" }).success).toBe(true);
  });
  it("sponsor: role and package are optional; a package is {tier, perks[]}", () => {
    const base = { name: "Grace", email: "g@example.com", company: "Navy", message: "Hello" };
    expect(sponsorSchema.safeParse(base).success).toBe(true);
    expect(sponsorSchema.parse({ ...base, package: { tier: "Season sponsor", perks: ["Cover the food"] } }).package?.tier).toBe("Season sponsor");
    expect(sponsorSchema.safeParse({ ...base, package: { tier: 3, perks: [] } }).success).toBe(false);
  });
});

describe("handleSubmission", () => {
  it("a valid pitch saves a submission and sends one email, reply-to the submitter", async () => {
    const { deps, docs, sent } = fakes();
    expect(await handleSubmission("pitch", pitch, deps)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "info@cle-ai.com", replyTo: "ada@example.com", subject: "Pitch a talk: Notes on an engine" });
    const doc = docs.get(`submission.${KEY}`)!;
    expect(doc).toMatchObject({ _type: "submission", form: "pitch", emailStatus: "sent", receivedAt: "2026-11-04T12:00:00.000Z" });
    expect(doc.fields).toMatchObject({ name: "Ada Lovelace", talkTitle: "Notes on an engine", format: "talk" });
  });

  it("a filled honeypot is spam: nothing saved, nothing sent, Turnstile not even asked", async () => {
    const verify = vi.fn(async () => "pass" as const);
    const { deps, docs, sent } = fakes({ verifyTurnstile: verify });
    expect(await handleSubmission("pitch", { ...pitch, website: "http://spam.example" }, deps)).toEqual({ ok: false, error: "spam" });
    expect(sent).toHaveLength(0);
    expect(docs.size).toBe(0);
    expect(verify).not.toHaveBeenCalled();
  });

  it("a Turnstile failure is spam; an unreachable Turnstile is unavailable (never skipped)", async () => {
    const a = fakes({ verifyTurnstile: async () => "fail" });
    expect(await handleSubmission("pitch", pitch, a.deps)).toEqual({ ok: false, error: "spam" });
    const b = fakes({ verifyTurnstile: async () => "unreachable" });
    expect(await handleSubmission("pitch", pitch, b.deps)).toEqual({ ok: false, error: "unavailable" });
    expect(a.sent.length + b.sent.length + a.docs.size + b.docs.size).toBe(0);
  });

  it("invalid input returns the fields that are wrong, and saves nothing", async () => {
    const { deps, docs } = fakes();
    const r = await handleSubmission("pitch", { ...pitch, email: "nope", title: "" }, deps);
    expect(r).toMatchObject({ ok: false, error: "invalid" });
    if (!r.ok && r.error === "invalid") expect(Object.keys(r.fields ?? {}).sort()).toEqual(["email", "title"]);
    expect(docs.size).toBe(0);
  });

  it("a Resend failure is still ok: the submission stays at emailStatus failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, docs } = fakes({ sendEmail: async () => { throw new Error("resend down"); } });
    expect(await handleSubmission("pitch", pitch, deps)).toEqual({ ok: true });
    expect(docs.get(`submission.${KEY}`)?.emailStatus).toBe("failed");
  });

  it("a Sanity failure still sends the email and returns ok", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, sent } = fakes({ store: { create: async () => { throw new Error("sanity down"); }, markSent: async () => {} } });
    expect(await handleSubmission("pitch", pitch, deps)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
  });

  it("both failing is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakes({
      store: { create: async () => { throw new Error("sanity down"); }, markSent: async () => {} },
      sendEmail: async () => { throw new Error("resend down"); },
    });
    expect(await handleSubmission("pitch", pitch, deps)).toEqual({ ok: false, error: "unavailable" });
  });

  it("a failed 'mark as sent' does not turn a sent email into an error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, sent } = fakes({ store: { create: async () => "created", markSent: async () => { throw new Error("patch failed"); } } });
    expect(await handleSubmission("pitch", pitch, deps)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
  });

  it("the same idempotency key twice (even at once) sends one email", async () => {
    const { deps, sent, docs } = fakes();
    const [a, b] = await Promise.all([handleSubmission("pitch", pitch, deps), handleSubmission("pitch", pitch, deps)]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(await handleSubmission("pitch", pitch, deps)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(docs.size).toBe(1);
  });

  it("ids are submission.<uuid>; a key that is not a v4 UUID is replaced by a server one (R28)", async () => {
    const { deps, docs } = fakes();
    await handleSubmission("pitch", { ...pitch, key: "../../drafts.secret" }, deps);
    expect([...docs.keys()]).toEqual(["submission.11111111-2222-4333-8444-555555555555"]);
    const again = fakes();
    await handleSubmission("pitch", { ...pitch, key: "3F2B8C1E-5D4A-1C7B-9E1F-0A1B2C3D4E5F" }, again.deps); // v1, not v4
    expect([...again.docs.keys()][0]).toBe("submission.11111111-2222-4333-8444-555555555555");
  });

  it("a sponsor inquiry carries the package from the builder into the email and the record", async () => {
    const { deps, docs, sent } = fakes();
    const body = {
      name: "Grace", email: "g@example.com", company: "Navy\r\nBcc: evil@example.com", message: "Hi",
      package: { tier: "Season sponsor", perks: ["A table at a big night", "Cover the food"] },
      website: "", turnstileToken: "tok", key: KEY,
    };
    expect(await handleSubmission("sponsor", body, deps)).toEqual({ ok: true });
    expect(sent[0].subject).toBe("Sponsor inquiry: Navy Bcc: evil@example.com");
    expect(sent[0].subject).not.toMatch(/[\r\n]/);
    expect(sent[0].text).toContain("Season sponsor");
    expect(sent[0].text).toContain("Cover the food");
    expect(docs.get(`submission.${KEY}`)?.fields.package).toContain("Season sponsor");
  });

  it("an unknown form is invalid, not a crash", async () => {
    const { deps } = fakes();
    expect(await handleSubmission("nope" as never, pitch, deps)).toMatchObject({ ok: false, error: "invalid" });
    expect(await handleSubmission("pitch", null, deps)).toMatchObject({ ok: false });
  });
});

describe("buildEmail", () => {
  it("escapes user input in the HTML and keeps the plain text verbatim", () => {
    const m = buildEmail("pitch", { name: "<b>Ada</b>", email: "a@example.com", title: "T & <script>", description: "x", format: "talk" } as never, { to: "t@x.co", from: "f@x.co" });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<b>Ada");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.text).toContain("<b>Ada</b>");
  });
  it("strips CR and LF from the subject and reply-to", () => {
    const m = buildEmail("pitch", { name: "A", email: "a@example.com", title: "Hi\r\nBcc: x@y.z", description: "d", format: "panel" } as never, { to: "t@x.co", from: "f@x.co" });
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.replyTo).toBe("a@example.com");
  });
});

describe("verifyTurnstile", () => {
  const ok = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
  it("posts secret, response and remoteip to Cloudflare's siteverify", async () => {
    const fetch = ok({ success: true });
    expect(await verifyTurnstile("tok", "1.2.3.4", { secret: "s", fetch })).toBe("pass");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    const sent = new URLSearchParams(String(init.body));
    expect(Object.fromEntries(sent)).toEqual({ secret: "s", response: "tok", remoteip: "1.2.3.4" });
  });
  it("success:false is fail; an empty token is fail without a request", async () => {
    expect(await verifyTurnstile("tok", "", { secret: "s", fetch: ok({ success: false }) })).toBe("fail");
    const fetch = ok({ success: true });
    expect(await verifyTurnstile("", "", { secret: "s", fetch })).toBe("fail");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("a network error, a 5xx or junk is unreachable", async () => {
    expect(await verifyTurnstile("tok", "", { secret: "s", fetch: vi.fn(async () => { throw new Error("offline"); }) })).toBe("unreachable");
    expect(await verifyTurnstile("tok", "", { secret: "s", fetch: ok({}, 503) })).toBe("unreachable");
  });
});

describe("the cleForm block and the schema", () => {
  it("is registered and renders its form with the anchor for its kind", () => {
    expect(blockComponents.cleForm).toBeTypeOf("function");
    const pitchHtml = renderToStaticMarkup(createElement(blockComponents.cleForm, { form: "pitch" }));
    expect(pitchHtml).toContain('id="speak-form"');
    expect(pitchHtml).toContain('name="website"');
    const sponsorHtml = renderToStaticMarkup(createElement(blockComponents.cleForm, { form: "sponsor" }));
    expect(sponsorHtml).toContain('id="sponsor-inquiry"');
    expect(sponsorHtml).toContain('name="company"');
    expect(renderToStaticMarkup(createElement(blockComponents.cleForm, { form: "other" }))).toBe("");
  });
  it("the Sanity type cleForm has a form field restricted to pitch and sponsor", () => {
    const t = schemaTypes.find((s) => s.name === "cleForm") as unknown as { fields: { name: string; options?: { list: string[] } }[] };
    expect(t.fields.find((f) => f.name === "form")?.options?.list).toEqual(["pitch", "sponsor"]);
  });
  it("submission documents stay read-only in Studio", () => {
    expect((schemaTypes.find((s) => s.name === "submission") as unknown as { readOnly?: boolean }).readOnly).toBe(true);
  });
});

describe("migration: URL-less inquiry embeds become cleForm", () => {
  const embed = (title: string, url = "") => ({ _type: "cleEmbedForm", _key: title, url, title });
  it("replaces only the two URL-less embeds, keeping their keys", () => {
    const body = [
      { _type: "section", _key: "s", children: [embed("Pitch a talk"), embed("Newsletter signup", "https://x.example/embed"), embed("Sponsor and partner inquiry")] },
    ];
    const { body: out, replaced } = replaceInquiryEmbeds(body as never);
    expect(replaced).toBe(2);
    const kids = (out[0] as unknown as { children: Record<string, unknown>[] }).children;
    expect(kids[0]).toEqual({ _type: "cleForm", _key: "Pitch a talk", form: "pitch" }); // the component defaults the anchor
    expect(kids[1]._type).toBe("cleEmbedForm");
    expect(kids[2]).toEqual({ _type: "cleForm", _key: "Sponsor and partner inquiry", form: "sponsor" });
  });
});
