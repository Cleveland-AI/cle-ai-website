import type { FormKind } from "@/lib/forms/schemas";

export type Outcome =
  | { status: "done" }
  | { status: "invalid"; fields: Record<string, string> }
  | { status: "spam" }
  | { status: "unavailable" };

/** Posts the form and sorts the answer. A network error or an unreadable reply counts as unavailable. */
export async function postForm(doFetch: typeof fetch, kind: FormKind, body: unknown): Promise<Outcome> {
  try {
    const res = await doFetch(`/api/forms/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };
    if (data.ok) return { status: "done" };
    if (data.error === "invalid" && data.fields) return { status: "invalid", fields: data.fields };
    if (data.error === "spam") return { status: "spam" };
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

/** A Turnstile token is single-use: after any answer but success the visitor needs a fresh one. */
export const needsFreshCheck = (o: Outcome) => o.status !== "done";
