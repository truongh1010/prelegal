"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
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
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[380px_1fr]">
      <form className="flex flex-col gap-6" onSubmit={(event) => event.preventDefault()}>
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            &larr; All templates
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">{template.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">{template.description}</p>
        </div>

        <FieldGroup title="Party 1" fields={party1Fields} values={values} onChange={handleChange} />
        <FieldGroup title="Party 2" fields={party2Fields} values={values} onChange={handleChange} />
        <FieldGroup title="Terms" fields={termsFields} values={values} onChange={handleChange} />

        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {isDownloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-10 shadow-sm">
        <div ref={previewRef} className="document-preview">
          <CoverPage template={template} values={values} />
          <div dangerouslySetInnerHTML={{ __html: filledHtml }} />
        </div>
      </div>
    </div>
  );
}
