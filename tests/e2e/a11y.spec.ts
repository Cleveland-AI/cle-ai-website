// Accessibility (Task 17): axe-core on every parity route, at both widths: no serious or critical
// violations. Third-party iframes (Givebutter, Substack) never load in tests, so axe checks the
// iframe elements themselves (title, focus) but not inside them.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes, widths } from "../visual/routes";

// No live third-party calls (Substack, Givebutter, Turnstile, Poptin): only the test server answers.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => (new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort()));
});

for (const w of widths) {
  test.describe(`a11y @ ${w.name}`, () => {
    test.use({ viewport: { width: w.width, height: w.height } });
    for (const route of routes) {
      test(`${route.name} has no serious or critical axe violations`, async ({ page }) => {
        await page.goto(route.next);
        if (route.next.startsWith("/search")) await page.locator("main h1.wp-block-query-title").waitFor();
        await page.evaluate(() => document.fonts.ready);
        const { violations } = await new AxeBuilder({ page }).options({ iframes: false }).analyze();
        const bad = violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.impact} ${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(" ")} ${n.failureSummary?.split("\n").slice(1, 2).join("") ?? ""}`).join("\n")}`);
        expect(bad, route.next).toEqual([]);
      });
    }
  });
}
