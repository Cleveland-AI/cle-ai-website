import type { ReactNode } from "react";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { RichBody } from "@/components/RichBody";
import type { RichBody as RichBodyValue } from "@/lib/content/types";
import { NavPanel } from "./NavPanel.client";

export type NavProps = BlockSupports & {
  openLabel?: string | null;
  closeLabel?: string | null;
  children?: ReactNode;
};

/** cle/nav: the header menus and search, inline on desktop and a full-screen overlay on phones. */
export function Nav(props: NavProps) {
  const [supports, { openLabel, closeLabel, children }] = splitSupports(props);
  return (
    <NavPanel {...wrapperProps("nav", "", supports)} openLabel={openLabel || "Menu"} closeLabel={closeLabel || "Close"}>
      {children}
    </NavPanel>
  );
}

/** The registered cle/nav block: its inner blocks are a richBody. */
export function NavBlock({ children, ...props }: Omit<NavProps, "children"> & { children?: RichBodyValue | null }) {
  return (
    <Nav {...props}>
      <RichBody value={children} />
    </Nav>
  );
}
