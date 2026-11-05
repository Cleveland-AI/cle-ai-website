// The forms API route: fails closed, and in fixtures mode runs on injected fakes (no network).
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/forms/[form]/route";

const KEY = "3f2b8c1e-5d4a-4c7b-9e1f-0a1b2c3d4e5f";
const body = (over: object = {}) => ({
  name: "Ada", email: "ada@example.com", title: "Engines", description: "d", format: "talk",
  website: "", turnstileToken: "tok", key: KEY, ...over,
});
const post = (form: string, payload: unknown) =>
  POST(new Request(`http://localhost/api/forms/${form}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }), {
    params: Promise.resolve({ form }),
  });

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/forms/[form]", () => {
  it("production mode with a secret missing: unavailable (503), Turnstile never skipped, no network", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await post("pitch", body());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("production mode with only the Turnstile secret missing is still unavailable", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect((await post("pitch", body())).status).toBe(503);
  });

  it("an unknown form is a 404; bad JSON is a 400", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    expect((await post("nope", body())).status).toBe(404);
    const bad = await POST(new Request("http://localhost/api/forms/pitch", { method: "POST", body: "{not json" }), { params: Promise.resolve({ form: "pitch" }) });
    expect(bad.status).toBe(400);
  });

  it("fixtures mode: saves and emails into the in-memory outbox, once per key", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const key = "9b1f6a2c-1d3e-4f50-8a6b-7c8d9e0f1a2b";
    const a = await post("pitch", body({ key, email: "route-once@example.com" }));
    const b = await post("pitch", body({ key, email: "route-once@example.com" }));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    const outbox = (await (await GET(new Request("http://localhost/api/forms/outbox"), { params: Promise.resolve({ form: "outbox" }) })).json()) as {
      emails: { replyTo: string }[];
    };
    expect(outbox.emails.filter((e) => e.replyTo === "route-once@example.com")).toHaveLength(1);
  });

  it("invalid input is 422 with the field messages; spam is 400", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    const bad = await post("pitch", body({ email: "nope" }));
    expect(bad.status).toBe(422);
    expect((await bad.json()).fields.email).toBeTypeOf("string");
    expect((await post("pitch", body({ website: "x" }))).status).toBe(400);
  });

  it("the outbox is not served outside fixtures mode", async () => {
    vi.stubEnv("CONTENT_SOURCE", "sanity");
    const res = await GET(new Request("http://localhost/api/forms/outbox"), { params: Promise.resolve({ form: "outbox" }) });
    expect(res.status).toBe(404);
  });
});
