import { z } from "zod";

// Zod probes for `new Function` to compile faster validators; under the site's CSP (no 'unsafe-eval',
// R33) that probe is itself reported as a violation. These schemas are tiny, so skip the probe.
z.config({ jitless: true });

/** Every field is trimmed and length-capped. The messages are what visitors read under a field. */
export const MAX_SHORT = 200;
export const MAX_LONG = 2000;

const text = (max: number) =>
  z
    .string("Please fill this in.")
    .trim()
    .min(1, "Please fill this in.")
    .max(max, `Please keep this under ${max.toLocaleString("en-US")} characters.`);

/** An optional field: blank counts as not given. */
const optional = <T extends z.ZodType>(inner: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), inner.optional());

const email = z
  .string("Please enter your email.")
  .trim()
  .min(1, "Please enter your email.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Please enter a valid email address."));

const webLink = z
  .string()
  .trim()
  .max(500, "Please keep this under 500 characters.")
  .refine((v) => {
    try {
      const p = new URL(v).protocol;
      return p === "https:" || p === "http:";
    } catch {
      return false;
    }
  }, "Please enter a web address starting with https:// or http://.");

export const FORMATS = ["talk", "lightning", "workshop", "panel"] as const;
export const FORMAT_LABELS: Record<(typeof FORMATS)[number], string> = {
  talk: "Talk",
  lightning: "Lightning talk",
  workshop: "Workshop",
  panel: "Panel",
};

export const pitchSchema = z.object({
  name: text(MAX_SHORT),
  email,
  title: text(MAX_SHORT),
  description: text(MAX_LONG),
  format: z.enum(FORMATS, "Please choose a format."),
  link: optional(webLink),
  months: optional(text(MAX_SHORT)),
});

/** What the sponsor builder hands over (cle:sponsor-package): the suggested tier and the perks picked. */
export const packageSchema = z.object({
  tier: text(MAX_SHORT),
  perks: z.array(text(MAX_SHORT)).max(30),
});

export const sponsorSchema = z.object({
  name: text(MAX_SHORT),
  email,
  company: text(MAX_SHORT),
  role: optional(text(MAX_SHORT)),
  message: text(MAX_LONG),
  package: z.preprocess((v) => (v === null || v === "" ? undefined : v), packageSchema.optional()),
});

export type FormKind = "pitch" | "sponsor";
export type PitchData = z.infer<typeof pitchSchema>;
export type SponsorData = z.infer<typeof sponsorSchema>;
export const schemaFor = (form: FormKind) => (form === "pitch" ? pitchSchema : sponsorSchema);
export const isFormKind = (v: unknown): v is FormKind => v === "pitch" || v === "sponsor";

/** zod issues → one message per field (the first), keyed by the field's name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** A v4 UUID, the only idempotency key shape accepted (R28). */
export const isUuidV4 = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
