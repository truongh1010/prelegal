import { expect, test } from "@playwright/test";

test("lists every catalog template with only the Mutual NDA enabled", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /fill in a form/i })).toBeVisible();

  const rows = page.locator("ul > li");
  await expect(rows).toHaveCount(11);
  await expect(page.getByText("Mutual Non-Disclosure Agreement", { exact: true })).toBeVisible();

  await expect(page.getByRole("link", { name: "Create" })).toHaveCount(1);
  const comingSoonCount = await page.getByText("Coming soon").count();
  expect(comingSoonCount).toBe(10);
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
  await page.getByRole("link", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/create\/mutual-nda$/);
  await expect(
    page.locator("form").getByRole("heading", { name: "Mutual Non-Disclosure Agreement" }),
  ).toBeVisible();
});
