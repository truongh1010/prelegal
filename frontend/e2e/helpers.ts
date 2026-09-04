import type { Page } from "@playwright/test";

/** Seeds the fake-auth flag before the app's first script runs, so tests that
 * aren't about the login screen itself can go straight to the real content. */
export async function skipLogin(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("prelegal:authed", "true");
  });
}
