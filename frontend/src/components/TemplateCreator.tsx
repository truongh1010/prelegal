"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import type { TemplateDefinition, TemplateValues } from "@/lib/templates/types";
import { fillTemplateBody } from "@/lib/templates/fill";
import type { ChatMessage } from "@/lib/chat/api";
import { createDocument, getDocument } from "@/lib/documents/api";
import { ChatPanel } from "@/components/ChatPanel";
import { CoverPage } from "@/components/CoverPage";

function initialValues(template: TemplateDefinition): TemplateValues {
  return Object.fromEntries(template.fields.map((field) => [field.key, ""]));
}

/** Fills in every field the template defines, defaulting to "" for any field
 * a saved document hasn't filled in yet - matches initialValues()'s shape. */
function valuesFromStoredFields(
  template: TemplateDefinition,
  stored: TemplateValues,
): TemplateValues {
  return Object.fromEntries(template.fields.map((field) => [field.key, stored[field.key] ?? ""]));
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
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  // Resolves which saved document this session is for: resumes the one named by
  // ?documentId= in the URL, or creates a fresh one and pushes its id into the
  // URL (via replaceState, not a navigation) so a later reload resumes it too
  // instead of silently starting yet another document.
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      const existingId = Number(new URLSearchParams(window.location.search).get("documentId"));
      if (existingId) {
        try {
          const document = await getDocument(existingId);
          if (document) {
            if (cancelled) return;
            setDocumentId(document.id);
            setValues(valuesFromStoredFields(template, document.fields));
            setInitialMessages(document.messages);
            return;
          }
        } catch {
          // Fall through to creating a fresh document below.
        }
      }

      const document = await createDocument(template.slug);
      if (cancelled) return;
      setDocumentId(document.id);
      const url = new URL(window.location.href);
      url.searchParams.set("documentId", String(document.id));
      window.history.replaceState(null, "", url);
    }

    prepare();
    return () => {
      cancelled = true;
    };
    // Intentionally fires once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filledHtml = useMemo(() => {
    const filledBody = fillTemplateBody(rawContent, template.fields, values);
    return marked.parse(filledBody) as string;
  }, [rawContent, template.fields, values]);

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

  if (documentId === null) {
    return (
      <div className="mx-auto flex w-full max-w-6xl justify-center px-6 py-20">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-7">
        <div>
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted uppercase">
            Create
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">{template.name}</h1>
          <p className="mt-1 text-sm text-muted">{template.description}</p>
        </div>

        <ChatPanel
          template={template.slug}
          templateName={template.name}
          fields={values}
          onFieldsChange={setValues}
          documentId={documentId}
          initialMessages={initialMessages}
        />

        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
        >
          {isDownloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>

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
