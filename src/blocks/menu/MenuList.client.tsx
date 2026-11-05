"use client";

import { usePathname } from "next/navigation";

export type MenuItem = { _key?: string; label?: string | null; href?: string | null };

const path = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/**
 * The links of a cle/menu, as wp_nav_menu prints them (ul.cle-menu__list > li.menu-item > a). The
 * link to the page being viewed gets `current-menu-item` and aria-current, as WordPress marks it.
 */
export function MenuList({ items }: { items: MenuItem[] }) {
  const here = path(usePathname() ?? "");
  return (
    <ul className="cle-menu__list">
      {items.map((item, i) => {
        const current = item.href?.startsWith("/") && path(item.href) === here;
        return (
          <li key={item._key ?? i} className={current ? "menu-item current-menu-item" : "menu-item"}>
            <a href={item.href ?? undefined} {...(current ? { "aria-current": "page" as const } : {})}>
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
