import { expect, test } from "@playwright/test";

test("home returns 200 with lang en-US", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
});

// playwright.config.ts resolves no host but the test server, so nothing in the suite reaches the network.
test("requests off localhost fail", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(() => fetch("https://example.com/").then(() => "loaded", (e: Error) => `failed: ${e.message}`));
  expect(res).toMatch(/^failed/);
  await expect(page.goto("https://example.com/")).rejects.toThrow(/ERR_NAME_NOT_RESOLVED/);
});
