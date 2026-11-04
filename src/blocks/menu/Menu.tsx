import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { getSiteSettings } from "@/lib/content/queries";
import { MenuList, type MenuItem } from "./MenuList.client";

export type MenuProps = BlockSupports & {
  location?: "primary" | "social" | string | null;
  label?: string | null;
  /** The links; the registered block reads them from site settings. */
  items?: MenuItem[] | null;
};

/** cle/menu: a menu (site settings' main or social menu) as plain text links. Nothing without links. */
export function Menu(props: MenuProps) {
  const [supports, { location, label, items }] = splitSupports(props);
  const loc = location === "social" ? "social" : "primary";
  const links = (items ?? []).filter((l) => l.href && l.label);
  if (!links.length) return null;
  const { className, ...rest } = wrapperProps("menu", `cle-menu--${loc}`, supports);
  return (
    <nav className={className} aria-label={label || (loc === "social" ? "Social" : "Main")} {...rest}>
      <MenuList items={links} />
    </nav>
  );
}

/** The registered cle/menu block: the links come from site settings. */
export async function MenuBlock(props: MenuProps) {
  const settings = await getSiteSettings();
  const items = props.location === "social" ? settings.socialMenu : settings.primaryMenu;
  return <Menu {...props} items={items} />;
}
