import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "./LoginScreen";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginScreen", () => {
  it("submits to /api/signin by default", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    const user = userEvent.setup();

    render(<LoginScreen />);
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/signin"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("toggles to create-account mode and submits to /api/signup", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    const user = userEvent.setup();

    render(<LoginScreen />);
    await user.click(screen.getByRole("button", { name: /don't have an account/i }));
    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/signup"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the server's error message when signin fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid email or password." }),
    } as Response);
    const user = userEvent.setup();

    render(<LoginScreen />);
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
    });
  });
});
