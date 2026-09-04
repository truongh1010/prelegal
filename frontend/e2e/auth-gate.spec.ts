import { expect, test } from "@playwright/test";

test("blocks the app behind a fake login, then lets any credentials through", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /fill in a form/i })).not.toBeVisible();

  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /fill in a form/i })).toBeVisible();
});

test("stays logged in across a reload, and Log out sends the user back to the login screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /fill in a form/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /fill in a form/i })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
