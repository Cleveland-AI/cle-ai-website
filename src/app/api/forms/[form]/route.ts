import { fixturesAllowed, fixturesMisconfigured } from "@/lib/forms/constants";
import { buildDeps, outbox } from "@/lib/forms/deps";
import { handleSubmission } from "@/lib/forms/handle";
import { isFormKind } from "@/lib/forms/schemas";

const MAX_BODY = 32 * 1024;
type Ctx = { params: Promise<{ form: string }> };

const STATUS = { invalid: 422, spam: 400, unavailable: 503 } as const;

/** POST /api/forms/pitch | /api/forms/sponsor with a JSON body (see lib/forms/schemas.ts). */
export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const { form } = await params;
  if (!isFormKind(form)) return Response.json({ ok: false, error: "not found" }, { status: 404 });

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY) return Response.json({ ok: false, error: "invalid" }, { status: 413 });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return Response.json({ ok: false, error: "invalid" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const deps = buildDeps(ip);
  if (!deps) {
    // The fixtures-on-Vercel case has already logged its own line.
    if (!fixturesMisconfigured()) console.error("forms: RESEND_API_KEY or TURNSTILE_SECRET_KEY is not set; refusing submissions");
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const result = await handleSubmission(form, body, deps);
  return Response.json(result, { status: result.ok ? 200 : STATUS[result.error] });
}

/** Fixtures mode only: what the in-memory fakes received, for the end-to-end tests. Never served in production. */
export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { form } = await params;
  if (!fixturesAllowed() || form !== "outbox") return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(outbox());
}
