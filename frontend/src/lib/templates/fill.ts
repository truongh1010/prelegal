import type { TemplateField, TemplateValues } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The escaped value is spliced into raw markdown before it's passed to marked(),
// so HTML-escaping alone isn't enough — markdown syntax like `[x](javascript:...)`
// would still be parsed into a real, clickable link. Backslash-escape CommonMark's
// syntax characters first so field values render as inert literal text.
function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]()!|~#]/g, "\\$&");
}

/**
 * Replaces every `<span class="*_link">Label</span>` placeholder in the raw template
 * markdown with the corresponding field's filled-in value (or the placeholder's own
 * label if left blank). Works for any template that follows the Common Paper
 * "Variable" convention, keyed off each field's `bodyLabels`. The class name itself
 * (coverpage_link, keyterms_link, orderform_link, businessterms_link, sow_link) is
 * matched generically since it varies by document and by which kind of cover page
 * the variable belongs on, not by what the variable means.
 */
export function fillTemplateBody(
  rawMarkdown: string,
  fields: TemplateField[],
  values: TemplateValues,
): string {
  let filled = rawMarkdown;
  for (const field of fields) {
    if (!field.bodyLabels) continue;
    const value = values[field.key]?.trim();
    for (const { label, suffix } of field.bodyLabels) {
      const display = value
        ? escapeHtml(escapeMarkdown(value)) + (suffix ?? "")
        : escapeHtml(label);
      const className = value ? "filled-value" : "filled-value filled-value--empty";
      const replacement = `<span class="${className}">${display}</span>`;
      const pattern = new RegExp(
        `<span class="[a-z]+_link">${escapeRegExp(label)}</span>`,
        "g",
      );
      filled = filled.replace(pattern, replacement);
    }
  }
  return filled;
}
