import { describe, expect, it } from "vitest";
import { marked } from "marked";
import { fillTemplateBody } from "./fill";
import type { TemplateField } from "./types";

const fields: TemplateField[] = [
  { key: "purpose", label: "Purpose", type: "textarea", group: "terms", coverpageLabel: "Purpose" },
  {
    key: "governingLaw",
    label: "Governing Law",
    type: "text",
    group: "terms",
    coverpageLabel: "Governing Law",
  },
  { key: "party1Name", label: "Party 1 Name", type: "text", group: "party1" },
];

describe("fillTemplateBody", () => {
  it("replaces every occurrence of a repeated coverpage_link placeholder", () => {
    const raw =
      'Use for the <span class="coverpage_link">Purpose</span>. ' +
      'Only for the <span class="coverpage_link">Purpose</span> and nothing else.';

    const result = fillTemplateBody(raw, fields, { purpose: "evaluating a partnership" });

    expect(result.match(/evaluating a partnership/g)).toHaveLength(2);
    expect(result).not.toContain("coverpage_link");
  });

  it("leaves a blank-styled placeholder using the field label when a value is empty", () => {
    const raw = 'Governed by <span class="coverpage_link">Governing Law</span>.';

    const result = fillTemplateBody(raw, fields, { governingLaw: "" });

    expect(result).toContain('<span class="filled-value filled-value--empty">Governing Law</span>');
  });

  it("treats a whitespace-only value as empty", () => {
    const raw = 'Governed by <span class="coverpage_link">Governing Law</span>.';

    const result = fillTemplateBody(raw, fields, { governingLaw: "   " });

    expect(result).toContain("filled-value--empty");
  });

  it("only substitutes placeholders for fields that declare a coverpageLabel", () => {
    const raw = "No placeholders here, just party1Name in values.";

    const result = fillTemplateBody(raw, fields, { party1Name: "Acme Inc." });

    expect(result).toBe(raw);
  });

  it("does not touch spans for labels no field declares", () => {
    const raw = 'Unrelated: <span class="coverpage_link">Jurisdiction</span>.';

    const result = fillTemplateBody(raw, fields, {});

    expect(result).toBe(raw);
  });

  it("does not cross-match a label that is a prefix of another label", () => {
    const raw =
      'A: <span class="coverpage_link">Governing Law</span> ' +
      'B: <span class="coverpage_link">Governing Law Extended</span>';

    const result = fillTemplateBody(raw, fields, { governingLaw: "California" });

    expect(result).toContain("California");
    expect(result).toContain('<span class="coverpage_link">Governing Law Extended</span>');
  });

  describe("XSS / markdown-injection hardening", () => {
    it("renders a markdown link payload as inert text, not a real anchor", () => {
      const raw = 'Purpose: <span class="coverpage_link">Purpose</span>';
      const malicious = "[click here](javascript:alert(document.cookie))";

      const filled = fillTemplateBody(raw, fields, { purpose: malicious });
      const html = marked.parse(filled) as string;

      expect(html).not.toMatch(/<a\s/);
      expect(html).toContain("click here");
    });

    it("renders a raw HTML payload as escaped text, not a live element", () => {
      const raw = 'Purpose: <span class="coverpage_link">Purpose</span>';
      const malicious = '<img src=x onerror="alert(1)">';

      const filled = fillTemplateBody(raw, fields, { purpose: malicious });
      const html = marked.parse(filled) as string;

      expect(html).not.toMatch(/<img/);
      expect(html).toContain("&lt;img");
    });

    it("still renders ordinary values containing parentheses correctly", () => {
      const raw = 'Purpose: <span class="coverpage_link">Purpose</span>';
      const legit = "evaluating a partnership (mutual, ongoing)";

      const filled = fillTemplateBody(raw, fields, { purpose: legit });
      const html = marked.parse(filled) as string;

      expect(html).toContain("evaluating a partnership (mutual, ongoing)");
    });
  });
});
