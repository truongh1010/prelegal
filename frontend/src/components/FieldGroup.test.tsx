import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldGroup } from "./FieldGroup";
import type { TemplateField } from "@/lib/templates/types";

const fields: TemplateField[] = [
  { key: "name", label: "Name", type: "text", group: "party1" },
  { key: "address", label: "Address", type: "textarea", group: "party1" },
  { key: "effectiveDate", label: "Effective Date", type: "date", group: "terms" },
];

describe("FieldGroup", () => {
  it("renders nothing when there are no fields", () => {
    const { container } = render(
      <FieldGroup title="Empty" fields={[]} values={{}} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a text input, a textarea, and a date input per field type", () => {
    render(<FieldGroup title="Party 1" fields={fields} values={{}} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Address").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Effective Date")).toHaveAttribute("type", "date");
  });

  it("calls onChange with the field key and new value as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FieldGroup title="Party 1" fields={fields} values={{}} onChange={onChange} />);

    await user.type(screen.getByLabelText("Name"), "Ac");

    expect(onChange).toHaveBeenNthCalledWith(1, "name", "A");
    expect(onChange).toHaveBeenNthCalledWith(2, "name", "c");
  });

  it("reflects the current value from props", () => {
    render(
      <FieldGroup
        title="Party 1"
        fields={fields}
        values={{ name: "Acme Inc." }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Acme Inc.");
  });
});
