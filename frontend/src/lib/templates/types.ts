export type FieldType = "text" | "textarea" | "date";

export type FieldGroup = "party1" | "party2" | "terms";

/**
 * One `<span class="*_link">…</span>` placeholder in the template body that a field
 * fills. `label` must match the span's inner text exactly (templates use several
 * classes - coverpage_link, keyterms_link, orderform_link, businessterms_link,
 * sow_link - all sharing the same "Variable" convention). `suffix` is literal text
 * appended after the filled value, used for possessive placeholders whose span text
 * includes a trailing "'s" (e.g. "Provider's") so the output reads correctly.
 */
export interface BodyPlaceholder {
  label: string;
  suffix?: string;
}

export interface TemplateField {
  /** Key used to store the value and, by default, to look up the field's value. */
  key: string;
  label: string;
  type: FieldType;
  group: FieldGroup;
  /**
   * Placeholders in the template body that this field fills. Omit for fields (e.g.
   * party name/address) that only appear on the generated cover page, not inline in
   * the body.
   */
  bodyLabels?: BodyPlaceholder[];
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
