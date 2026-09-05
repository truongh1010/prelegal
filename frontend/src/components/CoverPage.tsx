import type { TemplateDefinition, TemplateField, TemplateValues } from "@/lib/templates/types";

function formatDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function PartyBlock({
  fallbackLabel,
  fields,
  values,
}: {
  fallbackLabel: string;
  fields: TemplateField[];
  values: TemplateValues;
}) {
  const nameField = fields.find((field) => field.type === "text");
  const addressField = fields.find((field) => field.type === "textarea");
  const name = (nameField ? values[nameField.key] : "")?.trim();
  const address = addressField ? values[addressField.key]?.trim() : undefined;
  // The party's role (e.g. "Provider", "Customer") comes from its name field's own
  // label, so this generalizes beyond Mutual NDA's literal "Party 1"/"Party 2".
  const label = nameField ? nameField.label.replace(/ Name$/, "") : fallbackLabel;

  return (
    <div>
      <p className="cover-page__party-label">{label}</p>
      <p className="cover-page__party-name">
        {name || <span className="blank">{label.toLowerCase()} name</span>}
      </p>
      {address && <p className="cover-page__party-address">{address}</p>}
    </div>
  );
}

/** Deal-specific summary rendered above a template's Standard Terms: parties and key dates. */
export function CoverPage({
  template,
  values,
}: {
  template: TemplateDefinition;
  values: TemplateValues;
}) {
  const party1Fields = template.fields.filter((field) => field.group === "party1");
  const party2Fields = template.fields.filter((field) => field.group === "party2");
  const dateFields = template.fields.filter((field) => field.type === "date");

  return (
    <div className="cover-page">
      <h2>{template.name}</h2>
      {dateFields.map((field) => (
        <p key={field.key} className="cover-page__meta">
          {field.label}: {formatDate(values[field.key]) ?? <span className="blank">not set</span>}
        </p>
      ))}
      <div className="cover-page__parties">
        <PartyBlock fallbackLabel="Party 1" fields={party1Fields} values={values} />
        <PartyBlock fallbackLabel="Party 2" fields={party2Fields} values={values} />
      </div>
    </div>
  );
}
