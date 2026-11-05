import type { ReactNode } from "react";

/** The templates' <main>: a constrained group with section padding, and the skip link's target. */
export function Main({ children }: { children: ReactNode }) {
  return (
    <main
      id="wp--skip-link--target"
      className="wp-block-group has-global-padding is-layout-constrained wp-block-group-is-layout-constrained"
      style={{ paddingTop: "var(--wp--preset--spacing--section)", paddingBottom: "var(--wp--preset--spacing--section)" }}
    >
      {children}
    </main>
  );
}
