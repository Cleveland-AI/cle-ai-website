"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react";
import { FIXTURE_TOKEN } from "@/lib/forms/constants";
import { fieldErrors, packageSchema, schemaFor, type FormKind } from "@/lib/forms/schemas";
import { COPY, FIELDS, type FieldDef } from "./fields";
import { needsFreshCheck, postForm } from "./logic";

const subscribeNever = () => () => {};
const FALLBACK_EMAIL = "info@cle-ai.com";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Pkg = { tier: string; perks: string[] };
type Status = "idle" | "sending" | "done" | "unavailable" | "spam";
type TurnstileApi = {
  render: (el: HTMLElement, o: { sitekey: string; action: string; callback: (t: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  reset: (id?: string) => void;
};
const turnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

/** Loads Cloudflare's script once, only when a form is on the page. */
function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    const ready = turnstile();
    if (ready) return resolve(ready);
    let s = document.querySelector<HTMLScriptElement>("script[data-cle-turnstile]");
    // A script element that already failed never fires again: replace it and try once more.
    if (s?.dataset.cleTurnstile === "failed") {
      s.remove();
      s = null;
    }
    if (!s) {
      s = document.createElement("script");
      s.src = TURNSTILE_SRC;
      s.async = true;
      s.dataset.cleTurnstile = "loading";
      document.head.appendChild(s);
    }
    const el = s;
    // Already settled: its events will not fire again, so settle from what is there now.
    if (el.dataset.cleTurnstile === "loaded") return reject(new Error("turnstile missing after load"));
    el.addEventListener("load", () => {
      el.dataset.cleTurnstile = "loaded";
      if (turnstile()) resolve(turnstile()!);
      else reject(new Error("turnstile missing"));
    });
    el.addEventListener("error", () => {
      el.dataset.cleTurnstile = "failed";
      reject(new Error("turnstile failed to load"));
    });
  });
}

export function FormView({
  kind,
  wrapper,
  siteKey,
  fixtures,
}: {
  kind: FormKind;
  wrapper: { className: string; id?: string; style?: CSSProperties };
  siteKey: string;
  fixtures: boolean;
}) {
  const uid = useId();
  const fields = FIELDS[kind];
  const copy = COPY[kind];
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const keyRef = useRef<string>("");
  const sendingRef = useRef(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusTick, setFocusTick] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [token, setToken] = useState(fixtures ? FIXTURE_TOKEN : "");
  const [checkNote, setCheckNote] = useState("");
  // false on the server and during hydration, true once scripts run: until then a submit could only be a native one.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  // The idempotency key: made once when the form renders, kept through retries so a repeat can't send twice.
  useEffect(() => {
    keyRef.current = crypto.randomUUID();
  }, []);

  // The sponsor builder's package (cle:sponsor-package).
  useEffect(() => {
    if (kind !== "sponsor") return;
    const onPackage = (e: Event) => {
      const parsed = packageSchema.safeParse((e as CustomEvent).detail);
      if (parsed.success) setPkg(parsed.data);
    };
    window.addEventListener("cle:sponsor-package", onPackage);
    return () => window.removeEventListener("cle:sponsor-package", onPackage);
  }, [kind]);

  // Cloudflare's widget, loaded from challenges.cloudflare.com by this form only.
  useEffect(() => {
    if (fixtures || !siteKey || !widgetRef.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !widgetRef.current || widgetId.current) return;
        widgetId.current = api.render(widgetRef.current, {
          sitekey: siteKey,
          action: kind,
          callback: (t) => {
            setToken(t);
            setCheckNote("");
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => setCheckNote(`The spam check did not load. Please email us at ${FALLBACK_EMAIL}.`));
    return () => {
      cancelled = true;
    };
  }, [fixtures, siteKey, kind]);

  // After errors appear, move to the first invalid field.
  useEffect(() => {
    if (focusTick) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusTick]);

  // After a final answer, move to the message so screen readers and keyboard users land on it.
  useEffect(() => {
    if (status === "done" || status === "unavailable" || status === "spam") statusRef.current?.focus();
  }, [status]);

  const setValue = useCallback((name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sendingRef.current) return;
    const honeypot = (formRef.current?.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    const payload: Record<string, unknown> = { ...values, ...(pkg ? { package: pkg } : {}) };

    const check = schemaFor(kind).safeParse(payload);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      setFocusTick((n) => n + 1);
      return;
    }
    if (!token) {
      setCheckNote(siteKey ? "Please complete the spam check below, then send again." : `Sending is not available right now. Please email us at ${FALLBACK_EMAIL}.`);
      return;
    }

    sendingRef.current = true;
    setStatus("sending");
    setErrors({});
    const outcome = await postForm(fetch, kind, { ...payload, website: honeypot, turnstileToken: token, key: keyRef.current });
    if (needsFreshCheck(outcome) && !fixtures) {
      setToken("");
      turnstile()?.reset(widgetId.current);
    }
    if (outcome.status === "invalid") {
      setErrors(outcome.fields);
      setFocusTick((n) => n + 1);
      setStatus("idle");
    } else setStatus(outcome.status);
    sendingRef.current = false;
  }

  const mailto = (
    <a href={`mailto:${FALLBACK_EMAIL}`}>{FALLBACK_EMAIL}</a>
  );
  const sending = status === "sending";

  return (
    <div {...wrapper} data-form={kind}>
      <div ref={statusRef} role="status" aria-live="polite" tabIndex={-1} className="cle-form__status">
        {status === "done" && <p className="cle-form__thanks">{copy.thanks}</p>}
        {status === "unavailable" && (
          <p className="cle-form__problem">
            We could not send that just now. Please try again in a minute, or email us at {mailto}.
          </p>
        )}
        {status === "spam" && (
          <p className="cle-form__problem">
            That did not go through the spam check. Please try again, or email us at {mailto}.
          </p>
        )}
        {sending && <p>Sending…</p>}
        {checkNote && <p className="cle-form__problem">{checkNote}</p>}
      </div>

      {status !== "done" && (
        <form ref={formRef} method="post" onSubmit={submit} noValidate className="cle-form__form" id={`${uid}-form`}>
          {kind === "sponsor" && pkg && (
            <div className="cle-form__package">
              <input type="hidden" name="package" value={JSON.stringify(pkg)} />
              <p className="cle-form__package-title">
                <strong>Your package:</strong> {pkg.tier}
              </p>
              {pkg.perks.length > 0 && (
                <ul>
                  {pkg.perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              <button type="button" className="cle-form__linkbutton" onClick={() => setPkg(null)}>
                Remove package
              </button>
            </div>
          )}

          {fields.map((f) => (
            <Field key={f.name} def={f} id={`${uid}-${f.name}`} value={values[f.name] ?? ""} error={errors[f.name]} onChange={setValue} />
          ))}

          {/* Honeypot: people never see it; bots fill it. */}
          <div className="cle-form__trap" aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          {!fixtures && siteKey && <div ref={widgetRef} className="cle-form__turnstile" />}
          <noscript>
            <p>This form needs JavaScript. Please email us at {FALLBACK_EMAIL}.</p>
          </noscript>

          <div className="wp-block-button cle-form__submit">
            <button type="submit" className="wp-block-button__link wp-element-button" disabled={sending || !mounted}>
              {sending ? copy.sending : copy.send}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  def,
  id,
  value,
  error,
  onChange,
}: {
  def: FieldDef;
  id: string;
  value: string;
  error?: string;
  onChange: (name: string, v: string) => void;
}) {
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [def.hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name: def.name,
    value,
    "aria-required": def.required || undefined,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy,
    autoComplete: def.autoComplete,
  };
  return (
    <div className="cle-form__field">
      <label htmlFor={id}>{def.label}</label>
      {def.hint && (
        <p id={hintId} className="cle-form__hint">
          {def.hint}
        </p>
      )}
      {def.kind === "textarea" ? (
        <textarea {...common} rows={6} onChange={(e) => onChange(def.name, e.target.value)} />
      ) : def.kind === "select" ? (
        <select {...common} onChange={(e) => onChange(def.name, e.target.value)}>
          <option value="">Choose one</option>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={def.kind} onChange={(e) => onChange(def.name, e.target.value)} />
      )}
      {error && (
        <p id={errId} className="cle-form__field-error">
          {error}
        </p>
      )}
    </div>
  );
}
