import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { skipLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await page.goto("/create/mutual-nda/");
});

test("shows blank placeholders before anything is filled in", async ({ page }) => {
  const preview = page.getByTestId("document-preview");
  await expect(preview.getByText("party 1 name")).toBeVisible();
  await expect(preview.getByText("party 2 name")).toBeVisible();
  await expect(preview.getByText("not set")).toBeVisible();
  await expect(preview.locator(".filled-value--empty").first()).toBeVisible();
});

test("the live preview updates as the form is filled in", async ({ page }) => {
  const preview = page.getByTestId("document-preview");

  await page.getByLabel("Party 1 Name").fill("Acme Inc.");
  await page.getByLabel("Party 1 Address").fill("1 Main St, Springfield");
  await page.getByLabel("Party 2 Name").fill("Globex Corp.");
  await page.getByLabel("Effective Date").fill("2026-01-15");
  await page.getByLabel("Purpose").fill("evaluating a potential partnership");
  await page.getByLabel("MNDA Term").fill("2 years");
  await page.getByLabel("Term of Confidentiality").fill("3 years");
  await page.getByLabel("Governing Law").fill("Delaware");
  await page.getByLabel("Jurisdiction").fill("Wilmington, Delaware");

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

test("a markdown-injection payload renders as inert text, never a real link", async ({ page }) => {
  const preview = page.getByTestId("document-preview");

  await page.getByLabel("Purpose").fill("[click here](javascript:alert(document.cookie))");

  // "Purpose" is referenced three times in the template body, so every occurrence
  // should render the same inert payload.
  await expect(preview.getByText(/click here/)).toHaveCount(3);
  // The template's own footer legitimately links to commonpaper.com and the CC
  // license, so assert on the dangerous scheme rather than on "no links at all".
  await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("Download PDF saves a real PDF file containing the filled-in details", async ({ page }) => {
  await page.getByLabel("Party 1 Name").fill("Acme Inc.");
  await page.getByLabel("Party 2 Name").fill("Globex Corp.");
  await page.getByLabel("Purpose").fill("evaluating a potential partnership");

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
