// The site's security headers (R33). Kept out of next.config.ts so a unit test can read them.
//
// A static policy, not a per-request nonce: nonces would force every page dynamic. So script-src
// and style-src allow 'unsafe-inline' (Next's own bootstrap scripts, the head script and the
// JSON-LD block are inline), and never 'unsafe-eval'. The Studio gets none of this (R34).

const POPTIN = ["https://cdn.popt.in", "https://*.popt.in"];
const CLOUDFLARE = "https://challenges.cloudflare.com";
// Poptin's pixel loads jQuery from cdnjs when the page has none (seen as a CSP violation in the e2e run);
// the path keeps the allowance to that one library rather than all of cdnjs.
const POPTIN_JQUERY = "https://cdnjs.cloudflare.com/ajax/libs/jquery/";
const SELF = "'self'";

/** Poptin's pixel and the Turnstile widget are the only third-party scripts; embeds are Givebutter, Substack and Turnstile. */
const POLICY: Record<string, string[]> = {
  "default-src": [SELF],
  "script-src": [SELF, "'unsafe-inline'", ...POPTIN, POPTIN_JQUERY, CLOUDFLARE],
  "style-src": [SELF, "'unsafe-inline'", ...POPTIN],
  // Meetup's description HTML may carry images from Meetup's own CDN (the sanitizer allows https <img>).
  // R37: any https image or frame. Editors paste embed-form URLs, and sanitized event or migrated HTML may
  // carry https images and iframes from anywhere; blanking those would break content silently. The
  // hosts we know stay listed so the intent survives if this is ever tightened.
  "img-src": [SELF, "data:", "blob:", "https:", "https://cdn.sanity.io", ...POPTIN, "https://*.meetupstatic.com"],
  "font-src": [SELF, "data:"],
  "frame-src": ["https:", "https://givebutter.com", "https://*.givebutter.com", "https://*.substack.com", CLOUDFLARE],
  // The site client runs on the server only; the browser talks to Poptin and Turnstile.
  "connect-src": [SELF, ...POPTIN, CLOUDFLARE],
  "form-action": [SELF],
  "base-uri": [SELF],
  "object-src": ["'none'"],
  "frame-ancestors": [SELF],
};

export const buildCsp = (): string =>
  Object.entries(POLICY)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");

export type HeaderEntry = { key: string; value: string };

/** Headers every route carries, the Studio included. */
export const baseSecurityHeaders = (): HeaderEntry[] => [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Payment is allowed for the Givebutter donation iframe only.
  { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://givebutter.com")' },
];

/**
 * R36: the one switch. The full policy is sent as Content-Security-Policy-Report-Only: browsers report what
 * it would have blocked (console and `securitypolicyviolation`, which the e2e test watches) but block
 * nothing, so a host we missed in Poptin's or an editor's embed cannot break a page. Once a preview deploy
 * shows no reports, set CSP_MODE=enforce (build and runtime environment) and the same policy is enforced.
 */
export const CSP_ENFORCE = process.env.CSP_MODE === "enforce";

/** What is enforced either way: nothing can frame the site but the site, no plugins, no <base> tricks. */
export const MINIMAL_CSP = "frame-ancestors 'self'; object-src 'none'; base-uri 'self'";

/** The Studio's headers: base ones plus clickjacking protection only. It stays exempt from the site policy (R34). */
export const studioHeaders = (): HeaderEntry[] => [
  ...baseSecurityHeaders(),
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

/** Everything the public site sends. */
export const securityHeaders = (enforce: boolean = CSP_ENFORCE): HeaderEntry[] => [
  ...baseSecurityHeaders(),
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  enforce
    ? { key: "Content-Security-Policy", value: buildCsp() }
    : { key: "Content-Security-Policy", value: MINIMAL_CSP },
  ...(enforce ? [] : [{ key: "Content-Security-Policy-Report-Only", value: buildCsp() }]),
];
