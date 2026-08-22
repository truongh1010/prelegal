import type { TemplateField, TemplateValues } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Replaces every `<span class="coverpage_link">Label</span>` placeholder in the raw
 * template markdown with the corresponding field's filled-in value (or a bracketed
 * placeholder if left blank). Works for any template that follows the Common Paper
 * `coverpage_link` convention, keyed off each field's `coverpageLabel`.
 */
export function fillTemplateBody(
  rawMarkdown: string,
  fields: TemplateField[],
  values: TemplateValues,
): string {
  let filled = rawMarkdown;
  for (const field of fields) {
    if (!field.coverpageLabel) continue;
    const value = values[field.key]?.trim();
    const display = value ? escapeHtml(value) : `[${field.label}]`;
    const className = value ? "filled-value" : "filled-value filled-value--empty";
    const replacement = `<span class="${className}">${display}</span>`;
    const pattern = new RegExp(
      `<span class="coverpage_link">${escapeRegExp(field.coverpageLabel)}</span>`,
      "g",
    );
    filled = filled.replace(pattern, replacement);
  }
  return filled;
}
