import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { mockChat, mockCreateDocument, skipLogin } from "./helpers";

const filledFields = {
  party1Name: "Acme Inc.",
  party1Address: "1 Main St, Springfield",
  party2Name: "Globex Corp.",
  party2Address: null,
  effectiveDate: "2026-01-15",
  purpose: "evaluating a potential partnership",
  mndaTerm: "2 years",
  confidentialityTerm: "3 years",
  governingLaw: "Delaware",
  jurisdiction: "Wilmington, Delaware",
};

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await mockCreateDocument(page);
});

test("shows blank placeholders before anything is filled in", async ({ page }) => {
  await mockChat(page, [{ message: "Hi! Who are the two parties to this NDA?", fields: {} }]);
  await page.goto("/create/mutual-nda/");

  const preview = page.getByTestId("document-preview");
  await expect(preview.getByText("party 1 name")).toBeVisible();
  await expect(preview.getByText("party 2 name")).toBeVisible();
  await expect(preview.getByText("not set")).toBeVisible();
  await expect(preview.locator(".filled-value--empty").first()).toBeVisible();
});

test("the live preview updates as the AI extracts fields from chat", async ({ page }) => {
  await mockChat(page, [
    { message: "Hi! Who are the two parties to this NDA?", fields: {} },
    { message: "Got it, thanks - your document is ready to review.", fields: filledFields },
  ]);
  await page.goto("/create/mutual-nda/");

  const preview = page.getByTestId("document-preview");
  await page.getByLabel("Message").fill("Acme Inc. (1 Main St, Springfield) and Globex Corp.");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(preview.getByText("Acme Inc.")).toBeVisible();
  await expect(preview.getByText("1 Main St, Springfield")).toBeVisible();
  await expect(preview.getByText("Globex Corp.")).toBeVisible();
  await expect(preview.getByText(/January 15, 2026/)).toBeVisible();
  await expect(preview.getByText(/evaluating a potential partnership/).first()).toBeVisible();
  await expect(preview.getByText("Delaware").first()).toBeVisible();
  await expect(preview.getByText("Wilmington, Delaware").first()).toBeVisible();

  // The blank state for a field that's now filled should be gone.
  await expect(preview.locator(".filled-value--empty")).toHaveCount(0);
});

test("focus returns to the message input after the assistant replies", async ({ page }) => {
  await mockChat(page, [
    { message: "Hi! Who are the two parties to this NDA?", fields: {} },
    { message: "Got it, and what's the effective date?", fields: { party1Name: "Acme Inc." } },
  ]);
  await page.goto("/create/mutual-nda/");

  const input = page.getByLabel("Message");
  await input.fill("Acme Inc. and Globex Corp.");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByText("Got it, and what's the effective date?")).toBeVisible();
  await expect(input).toBeFocused();
});

test("a markdown-injection payload renders as inert text, never a real link", async ({ page }) => {
  const malicious = "[click here](javascript:alert(document.cookie))";
  await mockChat(page, [
    { message: "Hi! Who are the two parties to this NDA?", fields: {} },
    { message: "Got it, thanks.", fields: { purpose: malicious } },
  ]);
  await page.goto("/create/mutual-nda/");

  const preview = page.getByTestId("document-preview");
  await page.getByLabel("Message").fill("It's for " + malicious);
  await page.getByRole("button", { name: /send/i }).click();

  // "Purpose" is referenced three times in the template body, so every occurrence
  // should render the same inert payload.
  await expect(preview.getByText(/click here/)).toHaveCount(3);
  // The template's own footer legitimately links to commonpaper.com and the CC
  // license, so assert on the dangerous scheme rather than on "no links at all".
  await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("Download PDF saves a real PDF file containing the filled-in details", async ({ page }) => {
  await mockChat(page, [
    { message: "Hi! Who are the two parties to this NDA?", fields: {} },
    {
      message: "Got it, thanks.",
      fields: { party1Name: "Acme Inc.", party2Name: "Globex Corp.", purpose: "evaluating a potential partnership" },
    },
  ]);
  await page.goto("/create/mutual-nda/");

  await page.getByLabel("Message").fill("Acme Inc. and Globex Corp., evaluating a potential partnership");
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText("Got it, thanks.")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download pdf/i }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("mutual-nda.pdf");

  const path = await download.path();
  expect(path).toBeTruthy();
  const bytes = fs.readFileSync(path as string);
  expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(1000);
});
