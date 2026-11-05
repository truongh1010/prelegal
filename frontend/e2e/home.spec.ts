import { expect, test } from "@playwright/test";
import { mockCreateDocument, mockDiscover, skipLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await mockCreateDocument(page);
});

test("lists every catalog template, all enabled for creation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /get a draft agreement/i })).toBeVisible();

  const rows = page.locator("ul > li");
  await expect(rows).toHaveCount(11);
  await expect(page.getByText("Mutual Non-Disclosure Agreement", { exact: true })).toBeVisible();

  await expect(page.getByRole("link", { name: "Create" })).toHaveCount(11);
  await expect(page.getByText("Coming soon")).toHaveCount(0);
});

test("the page background is light in both light and dark OS color schemes", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const backgroundColor = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    // #f5f4f0 -> rgb(245, 244, 240); must never fall back to the old near-black dark theme.
    expect(backgroundColor).toBe("rgb(245, 244, 240)");
  }
});

test("clicking Create navigates to the Mutual NDA creator", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("li", { hasText: "Mutual Non-Disclosure Agreement" })
    .getByRole("link", { name: "Create" })
    .click();
  await expect(page).toHaveURL(/\/create\/mutual-nda\/(\?.*)?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement" }),
  ).toBeVisible();
});

test("the discovery chat routes to the matched document once the user confirms", async ({ page }) => {
  await mockDiscover(page, [
    {
      message: "Sounds like a Cloud Service Agreement - let's get started.",
      matchedSlug: "csa",
    },
  ]);
  await page.goto("/");

  await page.getByPlaceholder(/i need to license/i).fill("I need to sell cloud access to a customer");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page).toHaveURL(/\/create\/csa\/(\?.*)?$/);
});

test("the discovery chat explains an unsupported request without navigating away", async ({ page }) => {
  await mockDiscover(page, [
    {
      message: "We can't generate a residential lease, but a Pilot Agreement might be closest - want to try that?",
      matchedSlug: null,
    },
  ]);
  await page.goto("/");

  await page.getByPlaceholder(/i need to license/i).fill("I need a residential lease agreement");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByText(/pilot agreement might be closest/i)).toBeVisible();
  await expect(page).toHaveURL("/");
});
