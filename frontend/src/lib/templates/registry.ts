import type { TemplateField } from "./types";

interface RegisteredTemplate {
  slug: string;
  /** Must match a `filename` in the repo root's catalog.json. */
  filename: string;
  fields: TemplateField[];
}

/**
 * Field schemas for templates that have a fill-in creator UI wired up. Add an entry
 * here to enable "Create" for another catalog.json template — no route or rendering
 * code needs to change.
 */
export const TEMPLATE_REGISTRY: RegisteredTemplate[] = [
  {
    slug: "mutual-nda",
    filename: "Mutual-NDA.md",
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
      {
        key: "purpose",
        label: "Purpose",
        type: "textarea",
        group: "terms",
        coverpageLabel: "Purpose",
      },
      {
        key: "mndaTerm",
        label: "MNDA Term",
        type: "text",
        group: "terms",
        coverpageLabel: "MNDA Term",
      },
      {
        key: "confidentialityTerm",
        label: "Term of Confidentiality",
        type: "text",
        group: "terms",
        coverpageLabel: "Term of Confidentiality",
      },
      {
        key: "governingLaw",
        label: "Governing Law",
        type: "text",
        group: "terms",
        coverpageLabel: "Governing Law",
      },
      {
        key: "jurisdiction",
        label: "Jurisdiction",
        type: "text",
        group: "terms",
        coverpageLabel: "Jurisdiction",
      },
    ],
  },
];
