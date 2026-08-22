import type { TemplateField, TemplateValues } from "@/lib/templates/types";

interface FieldGroupProps {
  title: string;
  fields: TemplateField[];
  values: TemplateValues;
  onChange: (key: string, value: string) => void;
}

export function FieldGroup({ title, fields, values, onChange }: FieldGroupProps) {
  if (fields.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </legend>
      {fields.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">{field.label}</span>
          {field.type === "textarea" ? (
            <textarea
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              rows={3}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
            />
          ) : (
            <input
              type={field.type === "date" ? "date" : "text"}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}
