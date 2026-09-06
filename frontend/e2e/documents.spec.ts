import { expect, test } from "@playwright/test";
import { mockCreateDocument, skipLogin } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipLogin(page);
  await mockCreateDocument(page);
});

test("lists saved documents and opens one to resume the chat", async ({ page }) => {
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      json: [
        {
          id: 7,
          template: "mutual-nda",
          template_name: "Mutual Non-Disclosure Agreement",
          fields: { party1Name: "Acme Inc." },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
    });
  });
  await page.route("**/api/documents/7", async (route) => {
    await route.fulfill({
      json: {
        id: 7,
        template: "mutual-nda",
        template_name: "Mutual Non-Disclosure Agreement",
        fields: { party1Name: "Acme Inc." },
        messages: [
          { role: "assistant", content: "Who are the two parties to this NDA?" },
          { role: "user", content: "Acme Inc. is party 1." },
        ],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
    });
  });

  await page.goto("/documents");

  await expect(page.getByRole("heading", { name: "My documents" })).toBeVisible();
  await expect(page.getByText("Mutual Non-Disclosure Agreement")).toBeVisible();

  await page.getByRole("link", { name: "Open" }).click();

  await expect(page).toHaveURL(/\/create\/mutual-nda\/\?documentId=7$/);
  await expect(page.getByText("Who are the two parties to this NDA?")).toBeVisible();
  await expect(page.getByText("Acme Inc. is party 1.")).toBeVisible();
});

test("shows an empty state when there are no saved documents", async ({ page }) => {
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({ json: [] });
  });

  await page.goto("/documents");

  await expect(page.getByText(/haven't started any documents yet/i)).toBeVisible();
});

test("deleting a document removes it from the list after confirmation", async ({ page }) => {
  // DocumentsPage removes the row from local state on a successful delete rather
  // than re-fetching the list, so the GET mock only needs to serve the initial load.
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      json: [
        {
          id: 7,
          template: "mutual-nda",
          template_name: "Mutual Non-Disclosure Agreement",
          fields: {},
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
    });
  });
  await page.route("**/api/documents/7", async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.goto("/documents");
  await expect(page.getByText("Mutual Non-Disclosure Agreement")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Mutual Non-Disclosure Agreement")).not.toBeVisible();
});
