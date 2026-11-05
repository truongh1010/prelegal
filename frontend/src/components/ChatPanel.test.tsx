import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import { ChatApiError, sendChatTurn } from "@/lib/chat/api";
import { fetchMe } from "@/lib/auth";

vi.mock("@/lib/chat/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/api")>()),
  sendChatTurn: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  fetchMe: vi.fn(),
}));

const sendChatTurnMock = vi.mocked(sendChatTurn);
const fetchMeMock = vi.mocked(fetchMe);

function quota(remaining: number) {
  return { email: "someone@example.com", ai_messages_remaining: remaining, ai_messages_limit: 5 };
}

function renderChat(props: Partial<React.ComponentProps<typeof ChatPanel>> = {}) {
  return render(
    <ChatPanel
      template="mutual-nda"
      templateName="Mutual NDA"
      fields={{}}
      onFieldsChange={vi.fn()}
      documentId={1}
      {...props}
    />,
  );
}

async function send(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

beforeEach(() => {
  sendChatTurnMock.mockReset();
  fetchMeMock.mockReset();
  fetchMeMock.mockResolvedValue(quota(5));
});

describe("ChatPanel", () => {
  it("shows a fixed greeting without calling the AI", async () => {
    renderChat();

    expect(screen.getByText(/help you fill in your Mutual NDA/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("5 of 5 messages left")).toBeInTheDocument());
    expect(sendChatTurnMock).not.toHaveBeenCalled();
  });

  it("sends the conversation without the greeting and merges extracted fields", async () => {
    sendChatTurnMock.mockResolvedValueOnce({
      message: "Got it, what's the purpose?",
      fields: { party1Name: "Acme Inc." },
      messagesRemaining: 4,
    });
    const onFieldsChange = vi.fn();
    renderChat({ onFieldsChange });

    await send("Acme Inc. and Globex Corp.");

    await waitFor(() => expect(screen.getByText("Got it, what's the purpose?")).toBeInTheDocument());
    expect(screen.getByText("Acme Inc. and Globex Corp.")).toBeInTheDocument();
    expect(onFieldsChange).toHaveBeenCalledWith({ party1Name: "Acme Inc." });
    expect(sendChatTurnMock).toHaveBeenLastCalledWith(
      "mutual-nda",
      [{ role: "user", content: "Acme Inc. and Globex Corp." }],
      {},
      1,
    );
  });

  it("updates the count after a reply", async () => {
    sendChatTurnMock.mockResolvedValueOnce({ message: "Thanks!", fields: {}, messagesRemaining: 4 });
    renderChat();

    await send("Acme Inc.");

    await waitFor(() => expect(screen.getByText("4 of 5 messages left")).toBeInTheDocument());
  });

  it("returns focus to the message input after the assistant responds", async () => {
    sendChatTurnMock.mockResolvedValueOnce({
      message: "Got it, what's the purpose?",
      fields: {},
      messagesRemaining: 4,
    });
    renderChat();

    await send("Acme Inc. and Globex Corp.");

    await waitFor(() => expect(screen.getByText("Got it, what's the purpose?")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText("Message")).toHaveFocus());
  });

  it("puts the text back and doesn't keep the message when a send fails", async () => {
    sendChatTurnMock.mockRejectedValueOnce(new Error("network error"));
    renderChat();

    await send("Acme Inc.");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i));
    expect(screen.getByLabelText("Message")).toHaveValue("Acme Inc.");
    expect(screen.getByRole("log")).not.toHaveTextContent("Acme Inc.");
  });

  it("doesn't send a failed message twice on the retry", async () => {
    sendChatTurnMock.mockRejectedValueOnce(new Error("network error"));
    sendChatTurnMock.mockResolvedValueOnce({ message: "Thanks!", fields: {}, messagesRemaining: 4 });
    const user = userEvent.setup();
    renderChat();

    await send("Acme Inc.");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("Thanks!")).toBeInTheDocument());
    expect(sendChatTurnMock).toHaveBeenLastCalledWith("mutual-nda", [{ role: "user", content: "Acme Inc." }], {}, 1);
  });

  it("shows the server's message and locks the chat at the account limit", async () => {
    const detail = "You've used all 5 of your free AI messages.";
    sendChatTurnMock.mockRejectedValueOnce(new ChatApiError(429, detail));
    fetchMeMock.mockResolvedValueOnce(quota(1)).mockResolvedValueOnce(quota(0));
    renderChat();
    await waitFor(() => expect(screen.getByText("1 of 5 messages left")).toBeInTheDocument());

    await send("Acme Inc.");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(detail));
    await waitFor(() => expect(screen.getByLabelText("Message")).toBeDisabled());
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("stays usable when only the app-wide daily limit was hit", async () => {
    const detail = "Prelegal has reached its AI limit for today.";
    sendChatTurnMock.mockRejectedValueOnce(new ChatApiError(429, detail));
    renderChat();

    await send("Acme Inc.");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(detail));
    await waitFor(() => expect(fetchMeMock).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Message")).toBeEnabled();
  });

  it("asks the user to sign in again when the session has expired", async () => {
    sendChatTurnMock.mockRejectedValueOnce(new ChatApiError(401, "Session expired or invalid."));
    renderChat();

    await send("Acme Inc.");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/please sign in again/i));
  });

  it("limits how much can be typed", () => {
    renderChat();

    expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "2000");
  });

  it("still works when the count can't be loaded", async () => {
    fetchMeMock.mockRejectedValueOnce(new Error("network error"));
    renderChat();

    await waitFor(() => expect(fetchMeMock).toHaveBeenCalled());
    expect(screen.getByLabelText("Message")).toBeEnabled();
    expect(screen.queryByText(/messages left/i)).not.toBeInTheDocument();
  });

  it("resumes saved messages under the greeting, without calling the AI", () => {
    renderChat({
      fields: { party1Name: "Acme Inc." },
      initialMessages: [
        { role: "user", content: "Acme Inc." },
        { role: "assistant", content: "Thanks, who is party two?" },
      ],
    });

    expect(screen.getByText(/help you fill in your Mutual NDA/i)).toBeInTheDocument();
    expect(screen.getByText("Acme Inc.")).toBeInTheDocument();
    expect(screen.getByText("Thanks, who is party two?")).toBeInTheDocument();
    expect(sendChatTurnMock).not.toHaveBeenCalled();
  });

  it("keeps a saved document readable with no messages left", async () => {
    fetchMeMock.mockResolvedValueOnce(quota(0));
    renderChat({
      initialMessages: [
        { role: "user", content: "Acme Inc." },
        { role: "assistant", content: "Thanks!" },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText("Message")).toBeDisabled());
    expect(screen.getByText("Thanks!")).toBeInTheDocument();
    expect(screen.getByText(/no ai messages left/i)).toBeInTheDocument();
  });
});
