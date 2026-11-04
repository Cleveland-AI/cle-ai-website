import Link from "next/link";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { LogoMark, type LogoDot } from "./LogoMark.client";

/**
 * The logo's four dots, measured from the logo artwork (blocks/logo/dots.php): centre x/y and radius
 * in percent of the square, the palette colour, and the order they drop in.
 */
export const LOGO_DOTS: LogoDot[] = [
  { slug: "blue", x: 36.71, y: 28.71, r: 28.73, order: 0 },
  { slug: "yellow", x: 80.24, y: 40.41, r: 11.69, order: 2 },
  { slug: "coral", x: 62.02, y: 77.96, r: 21.96, order: 1 },
  { slug: "green", x: 26.0, y: 82.48, r: 11.0, order: 3 },
];

export type LogoProps = BlockSupports & { label?: string | null };

/**
 * cle/logo: the four-dot mark as CSS shapes inside a home link. The drop-in and hover jiggle are CSS
 * (logo.css); the lean towards the pointer is LogoMark's.
 */
export function Logo(props: LogoProps) {
  const [supports, { label }] = splitSupports(props);
  return (
    <Link href="/" aria-label={label || "CLE AI & DATA home"} {...wrapperProps("logo", "", supports)}>
      <LogoMark dots={LOGO_DOTS} />
    </Link>
  );
}
