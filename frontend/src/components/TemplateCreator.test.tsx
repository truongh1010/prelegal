import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateCreator } from "./TemplateCreator";
import type { TemplateDefinition } from "@/lib/templates/types";
import { sendChatTurn } from "@/lib/chat/api";
import { createDocument, getDocument } from "@/lib/documents/api";

const GREETING = /help you fill in your Mutual Non-Disclosure Agreement/i;

const htmlMock = vi.fn().mockResolvedValue(undefined);
const saveMock = vi.fn();

vi.mock("jspdf", () => ({
  // A plain (non-arrow) function so `new jsPDF(...)` works like a real constructor.
  jsPDF: vi.fn().mockImplementation(function MockJsPdf() {
    return { html: htmlMock, save: saveMock };
  }),
}));

vi.mock("@/lib/chat/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/api")>()),
  sendChatTurn: vi.fn(),
}));

vi.mock("@/lib/documents/api", () => ({
  createDocument: vi.fn(),
  getDocument: vi.fn(),
}));

const sendChatTurnMock = vi.mocked(sendChatTurn);
const createDocumentMock = vi.mocked(createDocument);
const getDocumentMock = vi.mocked(getDocument);

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  sendChatTurnMock.mockReset();
  createDocumentMock.mockReset();
  createDocumentMock.mockResolvedValue({
    id: 1,
    template: "mutual-nda",
    templateName: "Mutual Non-Disclosure Agreement",
    fields: {},
    messages: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });
  getDocumentMock.mockReset();
});

const template: TemplateDefinition = {
  slug: "mutual-nda",
  filename: "Mutual-NDA.md",
  name: "Mutual Non-Disclosure Agreement",
  description: "Test description",
  fields: [
    { key: "party1Name", label: "Party 1 Name", type: "text", group: "party1" },
    {
      key: "purpose",
      label: "Purpose",
      type: "textarea",
      group: "terms",
      bodyLabels: [{ label: "Purpose" }],
    },
  ],
};

const rawContent =
  'The parties agree to the <span class="coverpage_link">Purpose</span> described above.';

async function renderPreview(...args: Parameters<typeof render>) {
  render(...args);
  const element = await screen.findByTestId("document-preview");
  return Object.assign(within(element), { element });
}

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByLabelText("Message"));
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

describe("TemplateCreator", () => {
  it("shows a blank placeholder for the Purpose field until the AI extracts it", async () => {
    const user = userEvent.setup();
    const preview = await renderPreview(<TemplateCreator template={template} rawContent={rawContent} />);

    await screen.findByText(GREETING);
    expect(preview.getByText("Purpose", { selector: ".filled-value--empty" })).toBeInTheDocument();

    sendChatTurnMock.mockResolvedValueOnce({
      message: "Got it, thanks.",
      fields: { purpose: "evaluating a partnership" },
    });
    await sendMessage(user, "We're evaluating a partnership.");

    await waitFor(() => {
      expect(preview.getByText(/evaluating a partnership/)).toBeInTheDocument();
    });
    expect(preview.queryByText("Purpose", { selector: ".filled-value--empty" })).not.toBeInTheDocument();
  });

  it("neutralizes a markdown-injection payload extracted from chat instead of rendering a real link", async () => {
    const user = userEvent.setup();
    const preview = await renderPreview(<TemplateCreator template={template} rawContent={rawContent} />);

    await screen.findByText(GREETING);

    sendChatTurnMock.mockResolvedValueOnce({
      message: "Got it, thanks.",
      fields: { purpose: "[click here](javascript:alert(1))" },
    });
    await sendMessage(user, "It's for [click here](javascript:alert(1))");

    await waitFor(() => {
      expect(preview.getByText(/click here/)).toBeInTheDocument();
    });
    expect(preview.queryByRole("link", { name: /click here/ })).not.toBeInTheDocument();
    expect(preview.element.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it("hands the rendered preview to jsPDF and saves a file named after the template slug", async () => {
    const user = userEvent.setup();
    render(<TemplateCreator template={template} rawContent={rawContent} />);
    await screen.findByText(GREETING);

    await user.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledWith("mutual-nda.pdf"));
    expect(htmlMock).toHaveBeenCalledTimes(1);
  });

  it("disables the download button while a PDF is being prepared", async () => {
    let resolveHtml: () => void = () => {};
    htmlMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveHtml = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<TemplateCreator template={template} rawContent={rawContent} />);
    await screen.findByText(GREETING);

    const button = screen.getByRole("button", { name: /download pdf/i });
    await user.click(button);

    expect(screen.getByRole("button", { name: /preparing pdf/i })).toBeDisabled();

    resolveHtml();
    await waitFor(() => expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled());
  });

  it("carries the legal notice inside the preview, which is what becomes the PDF", async () => {
    const preview = await renderPreview(<TemplateCreator template={template} rawContent={rawContent} />);

    expect(preview.getByText(/this is not legal advice/i)).toBeInTheDocument();
  });

  it("creates a new document on mount and records its id in the URL", async () => {
    render(<TemplateCreator template={template} rawContent={rawContent} />);

    await waitFor(() => expect(createDocumentMock).toHaveBeenCalledWith("mutual-nda"));
    await waitFor(() => expect(window.location.search).toBe("?documentId=1"));
  });

  it("resumes a saved document instead of starting a fresh one", async () => {
    window.history.replaceState(null, "", "/?documentId=42");
    getDocumentMock.mockResolvedValueOnce({
      id: 42,
      template: "mutual-nda",
      templateName: "Mutual Non-Disclosure Agreement",
      fields: { party1Name: "Acme Inc." },
      messages: [
        { role: "assistant", content: "Who are the parties?" },
        { role: "user", content: "Acme Inc." },
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    render(<TemplateCreator template={template} rawContent={rawContent} />);

    await waitFor(() => expect(getDocumentMock).toHaveBeenCalledWith(42));
    const chatLog = await screen.findByRole("log");
    expect(within(chatLog).getByText("Acme Inc.")).toBeInTheDocument();
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(sendChatTurnMock).not.toHaveBeenCalled();
  });
});
