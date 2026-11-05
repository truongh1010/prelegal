import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverChat } from "./DiscoverChat";
import { ChatApiError, sendDiscoverTurn } from "@/lib/chat/api";
import { fetchMe } from "@/lib/auth";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/chat/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/api")>()),
  sendDiscoverTurn: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  fetchMe: vi.fn(),
}));

const sendDiscoverTurnMock = vi.mocked(sendDiscoverTurn);
const fetchMeMock = vi.mocked(fetchMe);

function quota(remaining: number) {
  return { email: "someone@example.com", ai_messages_remaining: remaining, ai_messages_limit: 5 };
}

async function send(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

beforeEach(() => {
  push.mockReset();
  sendDiscoverTurnMock.mockReset();
  fetchMeMock.mockReset();
  fetchMeMock.mockResolvedValue(quota(5));
});

describe("DiscoverChat", () => {
  it("shows a fixed greeting without calling the AI", async () => {
    render(<DiscoverChat />);

    expect(screen.getByText(/tell me what you're trying to do/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("5 of 5 messages left")).toBeInTheDocument());
    expect(sendDiscoverTurnMock).not.toHaveBeenCalled();
  });

  it("sends the conversation without the greeting and routes to a match", async () => {
    sendDiscoverTurnMock.mockResolvedValueOnce({ message: "A CSA it is.", matchedSlug: "csa", messagesRemaining: 4 });
    render(<DiscoverChat />);

    await send("I sell cloud software");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/create/csa"));
    expect(sendDiscoverTurnMock).toHaveBeenCalledWith([{ role: "user", content: "I sell cloud software" }]);
    expect(screen.getByText("4 of 5 messages left")).toBeInTheDocument();
  });

  it("puts the text back and doesn't keep the message when a send fails", async () => {
    sendDiscoverTurnMock.mockRejectedValueOnce(new Error("network error"));
    render(<DiscoverChat />);

    await send("I sell cloud software");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i));
    expect(screen.getByLabelText("Message")).toHaveValue("I sell cloud software");
    expect(screen.getByRole("log")).not.toHaveTextContent("I sell cloud software");
  });

  it("shows the server's message and locks the chat at the account limit", async () => {
    const detail = "You've used all 5 of your free AI messages.";
    sendDiscoverTurnMock.mockRejectedValueOnce(new ChatApiError(429, detail));
    fetchMeMock.mockResolvedValueOnce(quota(1)).mockResolvedValueOnce(quota(0));
    render(<DiscoverChat />);
    await waitFor(() => expect(screen.getByText("1 of 5 messages left")).toBeInTheDocument());

    await send("I sell cloud software");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(detail));
    await waitFor(() => expect(screen.getByLabelText("Message")).toBeDisabled());
  });

  it("limits how much can be typed", () => {
    render(<DiscoverChat />);

    expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "2000");
  });
});
