import Link from "next/link";
import { Fragment } from "react";
import { Mascot } from "@/blocks/mascot/Mascot";
import { Menu } from "@/blocks/menu/Menu";
import { getSiteSettings } from "@/lib/content/queries";
import type { SiteSettings } from "@/lib/content/types";
import { siteNow } from "@/lib/now";

/** The EIN line in parts/footer.html, used when site settings have none. */
const EIN_LINE = "CLE AI & DATA is a 501(c)(3) nonprofit, run by volunteers. Cleveland AI and Data, EIN 42-2843242.";
/** patterns/footer-legal.php, used when site settings have no legal links. */
const LEGAL_LINKS = [
  { _key: "privacy", label: "Privacy policy", href: "/privacy" },
  { _key: "coc", label: "Code of conduct", href: "/code-of-conduct" },
];

/** parts/footer.html: Dot peeking over the indigo band, the site lines, Find us and Support. */
export async function Footer() {
  const [settings, now] = await Promise.all([getSiteSettings(), siteNow()]);
  return <FooterView settings={settings} now={now} />;
}

export function FooterView({ settings, now }: { settings: SiteSettings; now: Date }) {
  const legal = settings.footerLegalLinks?.length ? settings.footerLegalLinks : LEGAL_LINKS;
  return (
    <div className="wp-block-template-part">
      <footer
        className="wp-block-group alignfull cle-footer has-paper-color has-indigo-background-color has-text-color has-background has-global-padding is-layout-constrained wp-block-group-is-layout-constrained"
        style={{ paddingTop: "var(--wp--preset--spacing--xl)", paddingBottom: "var(--wp--preset--spacing--xl)" }}
      >
        <Mascot pose="peek" width={150} className="cle-footer__dot" now={now} />
        <div className="wp-block-columns alignwide is-layout-flex wp-container-core-columns-is-layout-e22c4a5e wp-block-columns-is-layout-flex">
          <div className="wp-block-column is-layout-flow wp-block-column-is-layout-flow" style={{ flexBasis: "50%" }}>
            <p style={{ fontWeight: 700 }} className="wp-block-site-title has-l-font-size">
              <Link href="/" target="_self" rel="home">
                CLE AI &amp; DATA
              </Link>
            </p>
            <p className="has-m-font-size wp-block-paragraph">Making AI accessible to everyone.</p>
            <p className="has-s-font-size wp-block-paragraph">
              Questions, or a code of conduct report: <a href="mailto:info@cle-ai.com">info@cle-ai.com</a>
            </p>
            <p className="has-s-font-size wp-block-paragraph">{settings.einLine || EIN_LINE}</p>
            <p className="cle-footer__legal has-s-font-size wp-block-paragraph">
              {legal.map((l, i) => (
                <Fragment key={l._key ?? i}>
                  {i > 0 ? " · " : null}
                  <a href={l.href}>{l.label}</a>
                </Fragment>
              ))}
            </p>
          </div>
          <div className="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
            <p className="is-style-eyebrow wp-block-paragraph">Find us</p>
            <Menu location="social" label="Social" items={settings.socialMenu} />
          </div>
          <div className="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
            <p className="is-style-eyebrow wp-block-paragraph">Support</p>
            <ul className="wp-block-list">
              <li>
                <a href="https://givebutter.com/cle-ai">Donate</a>
              </li>
              <li>
                <a href="https://cleai.printful.me/">Shop</a>
              </li>
              <li>
                <a href="https://www.meetup.com/cleveland-ai-data/">Join on Meetup</a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
