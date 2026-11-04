import { buildEmail, describePackage, type EmailMessage } from "./email";
import { fieldErrors, isFormKind, isUuidV4, schemaFor, type FormKind, type PitchData, type SponsorData } from "./schemas";
import type { TurnstileResult } from "./turnstile";

export type SubmissionDoc = {
  _id: string;
  _type: "submission";
  form: FormKind;
  fields: Record<string, string>;
  emailStatus: "failed" | "sent";
  receivedAt: string;
};

export type FormDeps = {
  verifyTurnstile: (token: string, ip: string, ctx: { idempotencyKey: string; action: FormKind }) => Promise<TurnstileResult>;
  store: {
    /** "exists" when a document with that id is already there (nothing is overwritten). Throws when Sanity can't be reached. */
    create: (doc: SubmissionDoc) => Promise<"created" | "exists">;
    markSent: (id: string) => Promise<void>;
  };
  sendEmail: (m: EmailMessage, opts: { idempotencyKey: string }) => Promise<void>;
  newId: () => string;
  now: () => Date;
  to: string;
  from: string;
  ip: string;
};

export type FormResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "spam" | "unavailable"; fields?: Record<string, string> };

/** What is stored: the validated data, flattened to the submission schema's string fields. */
function toFields(form: FormKind, data: PitchData | SponsorData): Record<string, string> {
  const out: Record<string, string | undefined> =
    form === "pitch"
      ? (() => {
          const d = data as PitchData;
          return { name: d.name, email: d.email, talkTitle: d.title, description: d.description, format: d.format, link: d.link, months: d.months };
        })()
      : (() => {
          const d = data as SponsorData;
          return { name: d.name, email: d.email, company: d.company, role: d.role, message: d.message, package: d.package ? describePackage(d.package) : undefined };
        })();
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as Record<string, string>;
}

/**
 * The order matters: honeypot, Turnstile, validation, save (emailStatus "failed"), send, mark "sent".
 * The save is first so a failed email never loses the message; the save's id is the client's UUID, so
 * a repeat of the same submission finds it already there and sends nothing more.
 */
export async function handleSubmission(form: FormKind, body: unknown, deps: FormDeps): Promise<FormResult> {
  if (!isFormKind(form) || typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: "invalid" };
  const input = body as Record<string, unknown>;

  if (typeof input.website === "string" ? input.website.trim() !== "" : input.website != null) return { ok: false, error: "spam" };

  const token = typeof input.turnstileToken === "string" ? input.turnstileToken : "";
  const key = isUuidV4(input.key) ? input.key.toLowerCase() : deps.newId();
  const human = await deps.verifyTurnstile(token, deps.ip, { idempotencyKey: key, action: form });
  if (human === "fail") return { ok: false, error: "spam" };
  if (human === "unreachable") return { ok: false, error: "unavailable" };

  const parsed = schemaFor(form).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: fieldErrors(parsed.error) };
  const data = parsed.data as PitchData | SponsorData;

  const doc: SubmissionDoc = {
    _id: `submission.${key}`,
    _type: "submission",
    form,
    fields: toFields(form, data),
    emailStatus: "failed",
    receivedAt: deps.now().toISOString(),
  };

  let saved = false;
  try {
    if ((await deps.store.create(doc)) === "exists") return { ok: true };
    saved = true;
  } catch (err) {
    console.error("forms: saving the submission failed", err);
  }

  try {
    await deps.sendEmail(buildEmail(form, data, { to: deps.to, from: deps.from }), { idempotencyKey: doc._id });
  } catch (err) {
    console.error("forms: sending the email failed", err);
    return saved ? { ok: true } : { ok: false, error: "unavailable" };
  }

  if (saved) {
    try {
      await deps.store.markSent(doc._id);
    } catch (err) {
      console.error("forms: marking the submission as sent failed", err);
    }
  }
  return { ok: true };
}
