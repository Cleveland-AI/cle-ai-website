import { FORMATS, FORMAT_LABELS, MAX_LONG, MAX_SHORT, type FormKind } from "@/lib/forms/schemas";

export type FieldDef = {
  name: string;
  label: string;
  kind: "text" | "email" | "url" | "textarea" | "select";
  required: boolean;
  max: number;
  autoComplete?: string;
  hint?: string;
  options?: { value: string; label: string }[];
};

const PITCH: FieldDef[] = [
  { name: "name", label: "Your name", kind: "text", required: true, max: MAX_SHORT, autoComplete: "name" },
  { name: "email", label: "Email", kind: "email", required: true, max: 254, autoComplete: "email" },
  { name: "title", label: "Talk title", kind: "text", required: true, max: MAX_SHORT },
  {
    name: "description",
    label: "Short description",
    kind: "textarea",
    required: true,
    max: MAX_LONG,
    hint: "A real project, what broke, what you would do differently.",
  },
  {
    name: "format",
    label: "Preferred format",
    kind: "select",
    required: true,
    max: 0,
    options: FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] })),
  },
  { name: "link", label: "LinkedIn or website (optional)", kind: "url", required: false, max: 500, autoComplete: "url" },
  { name: "months", label: "Preferred months (optional)", kind: "text", required: false, max: MAX_SHORT },
];

const SPONSOR: FieldDef[] = [
  { name: "name", label: "Your name", kind: "text", required: true, max: MAX_SHORT, autoComplete: "name" },
  { name: "email", label: "Email", kind: "email", required: true, max: 254, autoComplete: "email" },
  { name: "company", label: "Company", kind: "text", required: true, max: MAX_SHORT, autoComplete: "organization" },
  { name: "role", label: "Your role (optional)", kind: "text", required: false, max: MAX_SHORT, autoComplete: "organization-title" },
  { name: "message", label: "Message", kind: "textarea", required: true, max: MAX_LONG },
];

export const FIELDS: Record<FormKind, FieldDef[]> = { pitch: PITCH, sponsor: SPONSOR };

export const COPY: Record<FormKind, { send: string; sending: string; thanks: string }> = {
  pitch: { send: "Send my pitch", sending: "Sending", thanks: "Thanks, your pitch is in. We read every one and will reply by email." },
  sponsor: { send: "Send inquiry", sending: "Sending", thanks: "Thanks, your inquiry is in. We will reply by email soon." },
};

export const ANCHORS: Record<FormKind, string> = { pitch: "speak-form", sponsor: "sponsor-inquiry" };
