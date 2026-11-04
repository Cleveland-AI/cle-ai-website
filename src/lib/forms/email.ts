import type { FormKind, PitchData, SponsorData } from "./schemas";
import { FORMAT_LABELS } from "./schemas";

export type EmailMessage = { to: string; from: string; replyTo: string; subject: string; text: string; html: string };

/** Nothing from a visitor goes into a header with a line break in it. */
export const oneLine = (s: string) => s.replace(/[\r\n\u2028\u2029]+/g, " ").trim();

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const describePackage = (p: NonNullable<SponsorData["package"]>) =>
  p.perks.length ? `${p.tier}: ${p.perks.join("; ")}` : p.tier;

/** The labelled lines of a submission, in order. Blank optional fields are left out. */
export function rowsFor(form: FormKind, data: PitchData | SponsorData): [string, string][] {
  const rows: [string, string | undefined][] =
    form === "pitch"
      ? (() => {
          const d = data as PitchData;
          return [
            ["Name", d.name],
            ["Email", d.email],
            ["Talk title", d.title],
            ["Format", FORMAT_LABELS[d.format]],
            ["LinkedIn or website", d.link],
            ["Preferred months", d.months],
            ["Description", d.description],
          ];
        })()
      : (() => {
          const d = data as SponsorData;
          return [
            ["Name", d.name],
            ["Email", d.email],
            ["Company", d.company],
            ["Role", d.role],
            ["Package", d.package ? describePackage(d.package) : undefined],
            ["Message", d.message],
          ];
        })();
  return rows.filter((r): r is [string, string] => !!r[1]);
}

/** Plain text, plus the same rows as simple HTML with every value escaped. */
export function buildEmail(form: FormKind, data: PitchData | SponsorData, addr: { to: string; from: string }): EmailMessage {
  const subject = oneLine(
    form === "pitch" ? `Pitch a talk: ${(data as PitchData).title}` : `Sponsor inquiry: ${(data as SponsorData).company}`,
  );
  const rows = rowsFor(form, data);
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n";
  const html =
    "<dl>" +
    rows.map(([k, v]) => `<dt><strong>${escapeHtml(k)}</strong></dt><dd style="white-space:pre-wrap;margin:0 0 12px">${escapeHtml(v)}</dd>`).join("") +
    "</dl>";
  return { to: addr.to, from: addr.from, replyTo: oneLine(data.email), subject, text, html };
}

/** The Resend side. `Resend` is imported lazily so tests and fixtures never load it. */
export async function sendWithResend(apiKey: string, m: EmailMessage, opts: { idempotencyKey: string }): Promise<void> {
  const { Resend } = await import("resend");
  const { error } = await new Resend(apiKey).emails.send(
    { from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, html: m.html },
    { idempotencyKey: opts.idempotencyKey },
  );
  if (error) throw new Error(`Resend: ${error.message}`);
}
