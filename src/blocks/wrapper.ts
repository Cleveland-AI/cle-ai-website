import type { CSSProperties } from "react";
import { parseStyle } from "@/components/core/Section";

/**
 * Block-supports attributes a cle block can carry (Task 5 migrates them from WordPress): `style` is
 * the CSS string WordPress would emit.
 */
export type BlockSupports = {
  align?: string | null;
  className?: string | null;
  anchor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  fontSize?: string | null;
  style?: string | null;
};

/**
 * get_block_wrapper_attributes() for a dynamic cle/<name> block: the render's own classes, then
 * align, the custom class, `wp-block-cle-<name>`, colours and font size, in WordPress's order.
 */
export function wrapperProps(
  name: string,
  extra: string,
  s: BlockSupports = {},
  ownStyle?: CSSProperties,
): { className: string; id?: string; style?: CSSProperties } {
  const className = [
    extra,
    s.align && s.align !== "none" ? `align${s.align}` : "",
    s.className ?? "",
    `wp-block-cle-${name}`,
    s.textColor ? `has-text-color has-${s.textColor}-color` : "",
    s.backgroundColor ? `has-background has-${s.backgroundColor}-background-color` : "",
    s.fontSize ? `has-${s.fontSize}-font-size` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = ownStyle || s.style ? { ...ownStyle, ...parseStyle(s.style ?? undefined) } : undefined;
  return { className, ...(s.anchor ? { id: s.anchor } : {}), ...(style ? { style } : {}) };
}

/** Splits a block's props into its block-supports attributes and the rest. */
export function splitSupports<T extends BlockSupports>(props: T): [BlockSupports, Omit<T, keyof BlockSupports>] {
  const { align, className, anchor, backgroundColor, textColor, fontSize, style, ...rest } = props;
  return [{ align, className, anchor, backgroundColor, textColor, fontSize, style }, rest];
}
