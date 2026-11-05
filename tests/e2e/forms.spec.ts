// Task 13 in a browser: the two forms, on fixtures with an in-memory outbox (no Resend, Sanity or Cloudflare calls).
import { expect, test, type Page } from "@playwright/test";

type Outbox = { emails: { replyTo: string; subject: string; text: string }[]; submissions: { _id: string }[] };
const outbox = async (page: Page): Promise<Outbox> => (await page.request.get("/api/forms/outbox")).json();
const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function fillPitch(page: Page, id: string) {
  const form = page.locator("#speak-form form");
  await form.getByLabel("Your name").fill("Ada Lovelace");
  await form.getByLabel("Email").fill(`ada-${id}@example.com`);
  await form.getByLabel("Talk title").fill(`Engines ${id}`);
  await form.getByLabel("Short description").fill("The first program, and what broke.");
  await form.getByLabel("Preferred format").selectOption("workshop");
}

test.describe("Pitch a talk (Get involved)", () => {
  test("the real form replaces the iframe stand-in; the page still has exactly two iframes", async ({ page }) => {
    await page.goto("/get-involved");
    await expect(page.locator("#speak-form form")).toHaveCount(1);
    await expect(page.locator("main iframe")).toHaveCount(2);
    await expect(page.locator('#speak-form .cle-form__trap')).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator('#speak-form input[name="website"]')).toHaveAttribute("tabindex", "-1");
  });

  test("a valid pitch sends once; the thanks never echoes what was typed", async ({ page }) => {
    const id = uniq();
    await page.goto("/get-involved");
    await fillPitch(page, id);
    await page.locator("#speak-form").getByRole("button", { name: /send/i }).click();
    const status = page.locator("#speak-form [role=status]");
    await expect(status).toContainText(/thanks/i);
    await expect(page.locator("#speak-form")).not.toContainText("Ada Lovelace");
    await expect(page.locator("#speak-form")).not.toContainText(id);
    const box = await outbox(page);
    const mine = box.emails.filter((e) => e.replyTo === `ada-${id}@example.com`);
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toBe(`Pitch a talk: Engines ${id}`);
    expect(mine[0].text).toContain("Workshop");
  });

  test("a double click sends one email and the button is disabled while sending", async ({ page }) => {
    const id = uniq();
    await page.route("**/api/forms/pitch", async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.continue();
    });
    await page.goto("/get-involved");
    await fillPitch(page, id);
    const send = page.locator("#speak-form").getByRole("button", { name: /send/i });
    await send.dblclick();
    await expect(send).toBeDisabled();
    await expect(page.locator("#speak-form [role=status]")).toContainText(/thanks/i);
    const mine = (await outbox(page)).emails.filter((e) => e.replyTo === `ada-${id}@example.com`);
    expect(mine).toHaveLength(1);
  });

  test("empty and bad fields show inline errors, mark aria-invalid, and focus the first one", async ({ page }) => {
    await page.goto("/get-involved");
    const form = page.locator("#speak-form form");
    await form.getByLabel("Email").fill("not-an-email");
    await form.getByRole("button", { name: /send/i }).click();
    const name = form.getByLabel("Your name");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    const described = await name.getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    await expect(page.locator(`[id="${described}"]`)).not.toBeEmpty();
    await expect(form.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    expect((await outbox(page)).emails.filter((e) => e.replyTo === "not-an-email")).toHaveLength(0);
  });

  test("when sending is unavailable the visitor is told to email info@cle-ai.com, and keeps what they typed", async ({ page }) => {
    await page.route("**/api/forms/pitch", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "unavailable" }) }),
    );
    await page.goto("/get-involved");
    await fillPitch(page, uniq());
    await page.locator("#speak-form").getByRole("button", { name: /send/i }).click();
    await expect(page.locator("#speak-form [role=status]")).toContainText("info@cle-ai.com");
    await expect(page.locator('#speak-form a[href^="mailto:info@cle-ai.com"]')).toHaveCount(1);
    await expect(page.locator("#speak-form").getByLabel("Talk title")).not.toHaveValue("");
    await expect(page.locator("#speak-form").getByRole("button", { name: /send/i })).toBeEnabled();
  });

  test("the page without a form never loads Turnstile", async ({ page }) => {
    const hits: string[] = [];
    page.on("request", (r) => r.url().includes("challenges.cloudflare.com") && hits.push(r.url()));
    await page.goto("/about");
    expect(hits).toEqual([]);
  });
});

test.describe("Sponsor inquiry (Sponsors)", () => {
  test("the form is at #sponsor-inquiry and the builder's package arrives in its hidden field and summary", async ({ page }) => {
    await page.goto("/sponsors");
    await expect(page.locator("#sponsor-inquiry form")).toHaveCount(1);
    const perks = page.locator(".cle-builder__perk");
    await perks.nth(1).click();
    await perks.nth(3).click();
    await page.locator(".cle-builder__cta").click();
    const hidden = page.locator('#sponsor-inquiry input[type="hidden"][name="package"]');
    await expect(hidden).toHaveValue(JSON.stringify({ tier: "Season sponsor", perks: ["A table at a big night", "Cover the food"] }));
    await expect(page.locator("#sponsor-inquiry")).toContainText("Season sponsor");
    await expect(page.locator("#sponsor-inquiry")).toContainText("Cover the food");
  });

  test("a sponsor inquiry with a package is emailed with the package in it", async ({ page }) => {
    const id = uniq();
    await page.goto("/sponsors");
    await page.locator(".cle-builder__perk").nth(3).click();
    await page.locator(".cle-builder__cta").click();
    const form = page.locator("#sponsor-inquiry form");
    await form.getByLabel("Your name").fill("Grace Hopper");
    await form.getByLabel("Email").fill(`grace-${id}@example.com`);
    await form.getByLabel("Company").fill(`Navy ${id}`);
    await form.getByLabel("Message").fill("We would like to help.");
    await form.getByRole("button", { name: /send/i }).click();
    await expect(page.locator("#sponsor-inquiry [role=status]")).toContainText(/thanks/i);
    const mine = (await outbox(page)).emails.filter((e) => e.replyTo === `grace-${id}@example.com`);
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toBe(`Sponsor inquiry: Navy ${id}`);
    expect(mine[0].text).toContain("Cover the food");
  });
});
