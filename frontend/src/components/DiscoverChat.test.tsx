import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverChat } from "./DiscoverChat";
import { sendDiscoverTurn } from "@/lib/chat/api";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/chat/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/api")>()),
  sendDiscoverTurn: vi.fn(),
}));

const sendDiscoverTurnMock = vi.mocked(sendDiscoverTurn);

async function send(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

beforeEach(() => {
  push.mockReset();
  sendDiscoverTurnMock.mockReset();
});

describe("DiscoverChat", () => {
  it("shows a fixed greeting without calling the AI", () => {
    render(<DiscoverChat />);

    expect(screen.getByText(/tell me what you're trying to do/i)).toBeInTheDocument();
    expect(sendDiscoverTurnMock).not.toHaveBeenCalled();
  });

  it("sends the conversation without the greeting and routes to a match", async () => {
    sendDiscoverTurnMock.mockResolvedValueOnce({ message: "A CSA it is.", matchedSlug: "csa" });
    render(<DiscoverChat />);

    await send("I sell cloud software");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/create/csa"));
    expect(sendDiscoverTurnMock).toHaveBeenCalledWith([{ role: "user", content: "I sell cloud software" }]);
  });

  it("puts the text back and doesn't keep the message when a send fails", async () => {
    sendDiscoverTurnMock.mockRejectedValueOnce(new Error("network error"));
    render(<DiscoverChat />);

    await send("I sell cloud software");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i));
    expect(screen.getByLabelText("Message")).toHaveValue("I sell cloud software");
    expect(screen.getByRole("log")).not.toHaveTextContent("I sell cloud software");
  });

  it("limits how much can be typed", () => {
    render(<DiscoverChat />);

    expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "2000");
  });
});
