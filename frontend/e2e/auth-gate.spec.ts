import { expect, test } from "@playwright/test";

/** Mocks the signin/logout/me endpoints with a single in-memory "authed" flag,
 * standing in for the backend's session cookie since the e2e webServer has no
 * live backend to talk to. */
async function mockAuthEndpoints(page: import("@playwright/test").Page) {
  let authed = false;

  await page.route("**/api/me", async (route) => {
    if (authed) {
      await route.fulfill({ json: { email: "someone@example.com" } });
    } else {
      await route.fulfill({ status: 401, json: { detail: "Not signed in." } });
    }
  });

  await page.route("**/api/signin", async (route) => {
    authed = true;
    await route.fulfill({ json: { email: "someone@example.com" } });
  });

  await page.route("**/api/logout", async (route) => {
    authed = false;
    await route.fulfill({ status: 204 });
  });
}

test("blocks the app behind sign-in, then lets valid credentials through", async ({ page }) => {
  await mockAuthEndpoints(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /get a draft agreement/i })).not.toBeVisible();

  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /get a draft agreement/i })).toBeVisible();
});

test("stays signed in across a reload, and Log out sends the user back to the sign-in screen", async ({
  page,
}) => {
  await mockAuthEndpoints(page);
  await page.goto("/");
  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /get a draft agreement/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /get a draft agreement/i })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
