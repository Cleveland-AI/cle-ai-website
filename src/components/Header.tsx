import { Logo } from "@/blocks/logo/Logo";
import { Menu } from "@/blocks/menu/Menu";
import { Nav } from "@/blocks/nav/Nav";
import { getSiteSettings } from "@/lib/content/queries";
import type { SiteSettings } from "@/lib/content/types";

/** parts/header.html with the menus from site settings. */
export async function Header() {
  return <HeaderView settings={await getSiteSettings()} />;
}

export function HeaderView({ settings }: { settings: SiteSettings }) {
  return (
    <div className="wp-block-template-part">
      <header
        className="wp-block-group alignfull cle-header has-global-padding is-layout-constrained wp-block-group-is-layout-constrained"
        style={{ paddingTop: "var(--wp--preset--spacing--s)", paddingBottom: "var(--wp--preset--spacing--s)" }}
      >
        <div className="wp-block-group alignwide cle-header__bar is-content-justification-space-between is-nowrap is-layout-flex wp-container-core-group-is-layout-683d4662 wp-block-group-is-layout-flex">
          <Logo />
          <Nav>
            <Menu location="primary" label="Main" items={settings.primaryMenu} />
            <Menu location="social" label="Social" items={settings.socialMenu} />
            <HeaderSearch />
          </Nav>
        </div>
      </header>
    </div>
  );
}

/** The header's core/details + core/search: a "Search" toggle with a field that submits to /search?q=. */
function HeaderSearch() {
  const id = "wp-block-search__input-1"; // one header per page
  return (
    <details className="wp-block-details cle-search is-layout-flow wp-block-details-is-layout-flow">
      <summary>Search</summary>
      <form role="search" method="get" action="/search" className="wp-block-search__no-button wp-block-search">
        <label className="wp-block-search__label screen-reader-text" htmlFor={id}>
          Search
        </label>
        <div className="wp-block-search__inside-wrapper">
          <input className="wp-block-search__input" id={id} placeholder="Search the site" defaultValue="" type="search" name="q" required />
        </div>
      </form>
    </details>
  );
}
