import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";

export type EmbedFormAttrs = {
  url?: string | null;
  title?: string | null;
  height?: number | null;
  linkLabel?: string | null;
  linkUrl?: string | null;
  allowPayment?: boolean | null;
};

/** What the form needs and nothing more: scripts, its own origin, submitting and popups. */
const SANDBOX = "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox";

const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * cle/embed-form: an iframe to a form hosted elsewhere, with a plain link underneath. The iframe is
 * sandboxed to what a form needs, and only https URLs are accepted. allowPayment lets a donation form
 * offer Apple/Google Pay; linkUrl sends the fallback link somewhere friendlier than a bare embed address.
 */
export function EmbedForm(props: BlockSupports & EmbedFormAttrs) {
  const [supports, a] = splitSupports(props);
  const url = a.url ?? "";
  if (url === "" || !isHttps(url)) return null;
  const height = Math.max(200, Math.trunc(Number(a.height ?? 720)) || 0);
  const label = (a.title ?? "").trim() || "Form";
  const link = a.linkUrl && isHttps(a.linkUrl) ? a.linkUrl : url;
  return (
    <div {...wrapperProps("embed-form", "", supports)}>
      <iframe
        className="cle-embed-form__frame"
        src={url}
        title={label}
        height={height}
        loading="lazy"
        {...(a.allowPayment ? { allow: "payment" } : {})}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={SANDBOX}
      ></iframe>
      <p className="cle-embed-form__link">
        <a href={link} target="_blank" rel="noopener">
          {a.linkLabel ?? "Open the form in a new tab"}
        </a>
      </p>
    </div>
  );
}
