import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import { sendChatTurn } from "@/lib/chat/api";

vi.mock("@/lib/chat/api", () => ({
  sendChatTurn: vi.fn(),
}));

const sendChatTurnMock = vi.mocked(sendChatTurn);

beforeEach(() => {
  sendChatTurnMock.mockReset();
});

describe("ChatPanel", () => {
  it("fetches and shows an opening message on mount", async () => {
    sendChatTurnMock.mockResolvedValueOnce({
      message: "Hi! Who are the two parties to this NDA?",
      fields: {},
    });

    render(<ChatPanel template="mutual-nda" fields={{}} onFieldsChange={vi.fn()} documentId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Hi! Who are the two parties to this NDA?")).toBeInTheDocument();
    });
    expect(sendChatTurnMock).toHaveBeenCalledWith("mutual-nda", [], {}, 1);
  });

  it("sends the user's message and merges extracted fields into the parent's values", async () => {
    sendChatTurnMock.mockResolvedValueOnce({ message: "Who are the parties?", fields: {} });
    const onFieldsChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatPanel template="mutual-nda" fields={{}} onFieldsChange={onFieldsChange} documentId={1} />,
    );
    await waitFor(() => expect(screen.getByText("Who are the parties?")).toBeInTheDocument());

    sendChatTurnMock.mockResolvedValueOnce({
      message: "Got it, what's the purpose?",
      fields: { party1Name: "Acme Inc." },
    });

    await user.type(screen.getByLabelText("Message"), "Acme Inc. and Globex Corp.");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("Got it, what's the purpose?")).toBeInTheDocument();
    });
    expect(screen.getByText("Acme Inc. and Globex Corp.")).toBeInTheDocument();
    expect(onFieldsChange).toHaveBeenCalledWith({ party1Name: "Acme Inc." });
    expect(sendChatTurnMock).toHaveBeenLastCalledWith(
      "mutual-nda",
      [
        { role: "assistant", content: "Who are the parties?" },
        { role: "user", content: "Acme Inc. and Globex Corp." },
      ],
      {},
      1,
    );
  });

  it("returns focus to the message input after the assistant responds", async () => {
    sendChatTurnMock.mockResolvedValueOnce({ message: "Who are the parties?", fields: {} });
    const user = userEvent.setup();

    render(<ChatPanel template="mutual-nda" fields={{}} onFieldsChange={vi.fn()} documentId={1} />);
    await waitFor(() => expect(screen.getByText("Who are the parties?")).toBeInTheDocument());

    sendChatTurnMock.mockResolvedValueOnce({
      message: "Got it, what's the purpose?",
      fields: {},
    });

    await user.type(screen.getByLabelText("Message"), "Acme Inc. and Globex Corp.");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("Got it, what's the purpose?")).toBeInTheDocument();
    });
    await waitFor(() => expect(screen.getByLabelText("Message")).toHaveFocus());
  });

  it("shows an error message when the chat request fails", async () => {
    sendChatTurnMock.mockRejectedValueOnce(new Error("network error"));

    render(<ChatPanel template="mutual-nda" fields={{}} onFieldsChange={vi.fn()} documentId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't reach the assistant/i)).toBeInTheDocument();
    });
  });

  it("resumes with prior messages instead of fetching a new opening turn", () => {
    render(
      <ChatPanel
        template="mutual-nda"
        fields={{ party1Name: "Acme Inc." }}
        onFieldsChange={vi.fn()}
        documentId={1}
        initialMessages={[
          { role: "assistant", content: "Who are the parties?" },
          { role: "user", content: "Acme Inc." },
        ]}
      />,
    );

    expect(screen.getByText("Who are the parties?")).toBeInTheDocument();
    expect(screen.getByText("Acme Inc.")).toBeInTheDocument();
    expect(sendChatTurnMock).not.toHaveBeenCalled();
  });
});
