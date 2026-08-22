export type FieldType = "text" | "textarea" | "date";

export type FieldGroup = "party1" | "party2" | "terms";

export interface TemplateField {
  /** Key used to store the value and, by default, to look up the field's value. */
  key: string;
  label: string;
  type: FieldType;
  group: FieldGroup;
  /**
   * Text content of the `<span class="coverpage_link">…</span>` placeholders in the
   * template body that this field fills. Omit for fields (e.g. party name/address)
   * that only appear on the generated cover page, not inline in the body.
   */
  coverpageLabel?: string;
}

export interface CatalogEntry {
  name: string;
  description: string;
  filename: string;
}

/** A catalog entry plus the field schema needed to render a fill-in-the-blank form for it. */
export interface TemplateDefinition extends CatalogEntry {
  slug: string;
  fields: TemplateField[];
}

export type TemplateValues = Record<string, string>;
