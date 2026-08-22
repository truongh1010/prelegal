"use client";

import { useMemo, useRef, useState } from "react";
import { marked } from "marked";
import type { TemplateDefinition, TemplateValues } from "@/lib/templates/types";
import { fillTemplateBody } from "@/lib/templates/fill";
import { FieldGroup } from "@/components/FieldGroup";
import { CoverPage } from "@/components/CoverPage";

function initialValues(template: TemplateDefinition): TemplateValues {
  return Object.fromEntries(template.fields.map((field) => [field.key, ""]));
}

export function TemplateCreator({
  template,
  rawContent,
}: {
  template: TemplateDefinition;
  rawContent: string;
}) {
  const [values, setValues] = useState<TemplateValues>(() => initialValues(template));
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const filledHtml = useMemo(() => {
    const filledBody = fillTemplateBody(rawContent, template.fields, values);
    return marked.parse(filledBody) as string;
  }, [rawContent, template.fields, values]);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDownload() {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "letter" });
      await pdf.html(previewRef.current, {
        margin: 40,
        autoPaging: "text",
        width: 530,
        windowWidth: previewRef.current.scrollWidth,
      });
      pdf.save(`${template.slug}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  }

  const party1Fields = template.fields.filter((field) => field.group === "party1");
  const party2Fields = template.fields.filter((field) => field.group === "party2");
  const termsFields = template.fields.filter((field) => field.group === "terms");

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[340px_1fr]">
      <form className="flex flex-col gap-7" onSubmit={(event) => event.preventDefault()}>
        <div>
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted uppercase">
            Create
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{template.name}</h1>
          <p className="mt-1 text-sm text-muted">{template.description}</p>
        </div>

        <FieldGroup title="Party 1" fields={party1Fields} values={values} onChange={handleChange} />
        <FieldGroup title="Party 2" fields={party2Fields} values={values} onChange={handleChange} />
        <FieldGroup title="Terms" fields={termsFields} values={values} onChange={handleChange} />

        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
        >
          {isDownloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </form>

      <div className="lg:pt-2">
        <div
          ref={previewRef}
          data-testid="document-preview"
          className="document-preview mx-auto max-w-2xl rounded-sm bg-paper p-12 shadow-[0_1px_2px_rgba(27,42,74,0.06),0_16px_32px_-12px_rgba(27,42,74,0.18)]"
        >
          <CoverPage template={template} values={values} />
          <div dangerouslySetInnerHTML={{ __html: filledHtml }} />
        </div>
      </div>
    </div>
  );
}
