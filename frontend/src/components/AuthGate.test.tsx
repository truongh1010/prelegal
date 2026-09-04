import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "./AuthGate";

afterEach(() => {
  window.localStorage.clear();
});

describe("AuthGate", () => {
  it("shows the login screen and hides the protected content by default", async () => {
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

  it("reveals the protected content after submitting any email/password", async () => {
    const user = userEvent.setup();
    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );

    await waitFor(() => screen.getByRole("heading", { name: "Sign in" }));
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Password"), "anything");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("skips the login screen on a later render once already authed", async () => {
    window.localStorage.setItem("prelegal:authed", "true");

    render(
      <AuthGate>
        <p>Protected content</p>
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected content")).toBeInTheDocument();
    });
  });
});
