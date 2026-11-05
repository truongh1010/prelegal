import { expect, test } from "@playwright/test";
import { mockChat, mockCreateDocument, skipLogin } from "./helpers";

const ACCOUNT_LIMIT = "You've used all 5 of your free AI messages. You can still open and download your saved documents.";

function mockQuota(page: import("@playwright/test").Page, remaining: () => number) {
  return page.route("**/api/me", async (route) => {
    await route.fulfill({
      json: { email: "someone@example.com", ai_messages_remaining: remaining(), ai_messages_limit: 5 },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await mockCreateDocument(page);
});

test("opening a chat shows the fixed greeting without calling the AI", async ({ page }) => {
  let aiCalls = 0;
  await page.route("**/api/chat", async (route) => {
    aiCalls += 1;
    await route.abort();
  });
  await page.route("**/api/discover", async (route) => {
    aiCalls += 1;
    await route.abort();
  });

  await page.goto("/");
  await expect(page.getByText(/tell me what you're trying to do/i)).toBeVisible();

  await page.goto("/create/mutual-nda/");
  await expect(page.getByText(/help you fill in your Mutual Non-Disclosure Agreement/i)).toBeVisible();
  await expect(page.getByText("5 of 5 messages left")).toBeVisible();

  expect(aiCalls).toBe(0);
});

test("the count goes down after each message", async ({ page }) => {
  await mockChat(page, [{ message: "Got it.", fields: {} }]);
  await page.goto("/create/mutual-nda/");

  await page.getByLabel("Message").fill("Acme Inc. and Globex Corp.");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByText("4 of 5 messages left")).toBeVisible();
});

test("hitting the account limit explains why, keeps the text, and locks the chat", async ({ page }) => {
  let remaining = 1;
  await mockQuota(page, () => remaining);
  await page.route("**/api/chat", async (route) => {
    remaining = 0;
    await route.fulfill({ status: 429, json: { detail: ACCOUNT_LIMIT } });
  });
  await page.goto("/create/mutual-nda/");

  const input = page.getByLabel("Message");
  await input.fill("Acme Inc. and Globex Corp.");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByRole("alert").filter({ hasText: "free AI messages" })).toBeVisible();
  await expect(input).toHaveValue("Acme Inc. and Globex Corp.");
  await expect(input).toBeDisabled();
  await expect(page.getByRole("button", { name: /send/i })).toBeDisabled();
  await expect(page.getByRole("log").getByText("Acme Inc. and Globex Corp.")).toHaveCount(0);
});

test("the app-wide daily limit shows its message without locking the chat", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 429,
      json: { detail: "Prelegal has reached its AI limit for today. Please try again tomorrow." },
    });
  });
  await page.goto("/create/mutual-nda/");

  const input = page.getByLabel("Message");
  await input.fill("Acme Inc. and Globex Corp.");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByRole("alert").filter({ hasText: "limit for today" })).toBeVisible();
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("Acme Inc. and Globex Corp.");
});

test("a saved document stays readable and downloadable with no messages left", async ({ page }) => {
  await mockQuota(page, () => 0);
  await page.route("**/api/documents/7", async (route) => {
    await route.fulfill({
      json: {
        id: 7,
        template: "mutual-nda",
        template_name: "Mutual Non-Disclosure Agreement",
        fields: { party1Name: "Acme Inc." },
        messages: [
          { role: "user", content: "Acme Inc. is party one" },
          { role: "assistant", content: "Thanks, who is party two?" },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });

  await page.goto("/create/mutual-nda/?documentId=7");

  await expect(page.getByText("Thanks, who is party two?")).toBeVisible();
  await expect(page.getByTestId("document-preview").getByText("Acme Inc.")).toBeVisible();
  await expect(page.getByLabel("Message")).toBeDisabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download pdf/i }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("mutual-nda.pdf");
});
