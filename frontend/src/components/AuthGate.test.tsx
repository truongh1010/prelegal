import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "./AuthGate";

function mockFetchOnce(response: { ok: boolean }) {
  vi.mocked(fetch).mockResolvedValueOnce(response as Response);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthGate", () => {
  it("shows the login screen when there's no valid session", async () => {
    mockFetchOnce({ ok: false });

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("reveals the protected content once the backend confirms a valid session", async () => {
    mockFetchOnce({ ok: true });

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected content")).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/me"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("re-checks the session and reveals content after a successful sign-in", async () => {
    mockFetchOnce({ ok: false }); // initial /api/me check
    const user = userEvent.setup();

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );
    await waitFor(() => screen.getByRole("heading", { name: "Sign in" }));

    mockFetchOnce({ ok: true }); // POST /api/signin
    mockFetchOnce({ ok: true }); // follow-up /api/me check triggered by the auth-change event

    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Protected content")).toBeInTheDocument();
    });
  });
});
