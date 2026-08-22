import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateCreator } from "./TemplateCreator";
import type { TemplateDefinition } from "@/lib/templates/types";

const htmlMock = vi.fn().mockResolvedValue(undefined);
const saveMock = vi.fn();

vi.mock("jspdf", () => ({
  // A plain (non-arrow) function so `new jsPDF(...)` works like a real constructor.
  jsPDF: vi.fn().mockImplementation(function MockJsPdf() {
    return { html: htmlMock, save: saveMock };
  }),
}));

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
      coverpageLabel: "Purpose",
    },
  ],
};

const rawContent =
  'The parties agree to the <span class="coverpage_link">Purpose</span> described above.';

function renderPreview(...args: Parameters<typeof render>) {
  render(...args);
  const element = screen.getByTestId("document-preview");
  return Object.assign(within(element), { element });
}

describe("TemplateCreator", () => {
  it("shows a blank placeholder for the Purpose field until the user fills it in", async () => {
    const user = userEvent.setup();
    const preview = renderPreview(<TemplateCreator template={template} rawContent={rawContent} />);

    expect(preview.getByText("Purpose", { selector: ".filled-value--empty" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Purpose"), "evaluating a partnership");

    await waitFor(() => {
      expect(preview.getByText(/evaluating a partnership/)).toBeInTheDocument();
    });
    expect(preview.queryByText("Purpose", { selector: ".filled-value--empty" })).not.toBeInTheDocument();
  });

  it("neutralizes a markdown-injection payload typed into a field instead of rendering a real link", async () => {
    const user = userEvent.setup();
    const preview = renderPreview(<TemplateCreator template={template} rawContent={rawContent} />);

    // user.type() parses [ and ] as special key syntax, so paste the literal payload instead.
    await user.click(screen.getByLabelText("Purpose"));
    await user.paste("[click here](javascript:alert(1))");

    await waitFor(() => {
      expect(preview.getByText(/click here/)).toBeInTheDocument();
    });
    expect(preview.element.querySelector("a")).toBeNull();
  });

  it("hands the rendered preview to jsPDF and saves a file named after the template slug", async () => {
    const user = userEvent.setup();
    render(<TemplateCreator template={template} rawContent={rawContent} />);

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

    const button = screen.getByRole("button", { name: /download pdf/i });
    await user.click(button);

    expect(screen.getByRole("button", { name: /preparing pdf/i })).toBeDisabled();

    resolveHtml();
    await waitFor(() => expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled());
  });
});
