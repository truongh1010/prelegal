import { expect, test } from "@playwright/test";
import { mockCreateDocument, skipLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await mockCreateDocument(page);
});

test("opening a chat shows the fixed greeting without calling the AI", async ({ page }) => {
  let aiCalls = 0;
  for (const path of ["**/api/chat", "**/api/discover"]) {
    await page.route(path, async (route) => {
      aiCalls += 1;
      await route.abort();
    });
  }

  await page.goto("/");
  await expect(page.getByText(/tell me what you're trying to do/i)).toBeVisible();

  await page.goto("/create/mutual-nda/");
  await expect(page.getByText(/help you fill in your Mutual Non-Disclosure Agreement/i)).toBeVisible();

  expect(aiCalls).toBe(0);
});

test("a failed send keeps the text and doesn't leave the message in the chat", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({ status: 502, json: { detail: "The AI service is unavailable." } });
  });
  await page.goto("/create/mutual-nda/");

  const input = page.getByLabel("Message");
  await input.fill("Acme Inc. and Globex Corp.");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByRole("alert").filter({ hasText: /something went wrong/i })).toBeVisible();
  await expect(input).toHaveValue("Acme Inc. and Globex Corp.");
  await expect(page.getByRole("log").getByText("Acme Inc. and Globex Corp.")).toHaveCount(0);
});
