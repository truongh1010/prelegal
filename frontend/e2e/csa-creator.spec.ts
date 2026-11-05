import { expect, test } from "@playwright/test";
import { mockChat, mockCreateDocument, skipLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await mockCreateDocument(page);
});

test("a non-NDA document fills in via chat using its own field schema and party roles", async ({ page }) => {
  await mockChat(page, [
    {
      message: "Got it - what's the subscription period?",
      fields: { providerName: "Acme Cloud Inc.", customerName: "Globex Corp." },
    },
  ]);
  await page.goto("/create/csa/");

  // CSA.md's own body starts with a level-1 "# Cloud Service Agreement" heading, so
  // scope to the sidebar title specifically rather than matching either heading.
  await expect(
    page.getByRole("heading", { level: 1, name: "Cloud Service Agreement" }).first(),
  ).toBeVisible();

  const preview = page.getByTestId("document-preview");
  // Cover page party captions come from the field's own role label (Provider /
  // Customer), not a hardcoded "Party 1" / "Party 2" - this is CSA-specific. The
  // template body itself also mentions "Provider"/"Customer" dozens of times as
  // unfilled placeholders, so scope tightly to the cover page's party label.
  await expect(preview.locator(".cover-page__party-label", { hasText: "Provider" })).toBeVisible();
  await expect(preview.locator(".cover-page__party-label", { hasText: "Customer" })).toBeVisible();

  await page.getByLabel("Message").fill("Acme Cloud Inc. is the Provider, Globex Corp. is the Customer");
  await page.getByRole("button", { name: /send/i }).click();

  await expect(page.getByText("Got it - what's the subscription period?")).toBeVisible();
  await expect(preview.getByText("Acme Cloud Inc.").first()).toBeVisible();
  await expect(preview.getByText("Globex Corp.").first()).toBeVisible();
});
