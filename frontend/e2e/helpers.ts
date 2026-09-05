import type { Page } from "@playwright/test";

/** Seeds the fake-auth flag before the app's first script runs, so tests that
 * aren't about the login screen itself can go straight to the real content. */
export async function skipLogin(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("prelegal:authed", "true");
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
