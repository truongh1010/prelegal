import type { Page } from "@playwright/test";

/** Mocks a valid session (GET /api/me succeeds) before the app's first script
 * runs, so tests that aren't about the login screen itself can go straight to
 * the real content. The e2e webServer has no live backend, so every route the
 * app calls has to be mocked - see {@link mockChat}/{@link mockDiscover}. */
export async function skipLogin(page: Page) {
  await page.route("**/api/me", async (route) => {
    await route.fulfill({ json: { email: "someone@example.com" } });
  });
}

/**
 * The e2e webServer only serves the static export - there's no live backend, so
 * every test that touches the AI chat must mock /api/chat itself. Responses are
 * played back in order, one per request; the last one repeats for any further
 * requests (e.g. the opening turn plus one reply per test is the common case).
 */
export async function mockChat(
  page: Page,
  responses: Array<{ message: string; fields: Record<string, string | null> }>,
) {
  let call = 0;
  await page.route("**/api/chat", async (route) => {
    const body = responses[Math.min(call, responses.length - 1)];
    call += 1;
    await route.fulfill({ json: body });
  });
}

/** Same idea as {@link mockChat}, for the document-discovery chat on the homepage. */
export async function mockDiscover(
  page: Page,
  responses: Array<{ message: string; matchedSlug: string | null }>,
) {
  let call = 0;
  await page.route("**/api/discover", async (route) => {
    const body = responses[Math.min(call, responses.length - 1)];
    call += 1;
    await route.fulfill({ json: body });
  });
}

/** Mocks POST /api/documents (creating a fresh document) with an incrementing
 * id, standing in for the backend since the e2e webServer has no live one.
 * Every /create/[slug] visit creates a document on mount, so any spec that
 * reaches that page needs this mocked even if it doesn't otherwise care about
 * saved documents. */
export async function mockCreateDocument(page: Page) {
  let nextId = 1;
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const id = nextId++;
    await route.fulfill({
      status: 201,
      json: {
        id,
        template: "mocked",
        template_name: "Mocked",
        fields: {},
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });
}
