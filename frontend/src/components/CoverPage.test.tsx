import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoverPage } from "./CoverPage";
import type { TemplateDefinition } from "@/lib/templates/types";

const template: TemplateDefinition = {
  slug: "mutual-nda",
  filename: "Mutual-NDA.md",
  name: "Mutual Non-Disclosure Agreement",
  description: "Test description",
  fields: [
    { key: "party1Name", label: "Party 1 Name", type: "text", group: "party1" },
    { key: "party1Address", label: "Party 1 Address", type: "textarea", group: "party1" },
    { key: "party2Name", label: "Party 2 Name", type: "text", group: "party2" },
    { key: "party2Address", label: "Party 2 Address", type: "textarea", group: "party2" },
    {
      key: "effectiveDate",
      label: "Effective Date",
      type: "date",
      group: "terms",
      coverpageLabel: "Effective Date",
    },
  ],
};

describe("CoverPage", () => {
  it("shows blank placeholders for every field left empty", () => {
    render(<CoverPage template={template} values={{}} />);

    expect(screen.getByText("party 1 name")).toBeInTheDocument();
    expect(screen.getByText("party 2 name")).toBeInTheDocument();
    expect(screen.getByText("not set")).toBeInTheDocument();
  });

  it("renders filled-in party names, addresses, and a formatted date", () => {
    render(
      <CoverPage
        template={template}
        values={{
          party1Name: "Acme Inc.",
          party1Address: "1 Main St",
          party2Name: "Globex Corp.",
          effectiveDate: "2026-01-15",
        }}
      />,
    );

    expect(screen.getByText("Acme Inc.")).toBeInTheDocument();
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
    expect(screen.getByText("Globex Corp.")).toBeInTheDocument();
    expect(screen.getByText(/January 15, 2026/)).toBeInTheDocument();
  });

  it("omits the address line entirely when no address was given", () => {
    render(<CoverPage template={template} values={{ party1Name: "Acme Inc." }} />);

    expect(screen.getByText("Acme Inc.")).toBeInTheDocument();
    expect(screen.queryByText("1 Main St")).not.toBeInTheDocument();
  });
});
