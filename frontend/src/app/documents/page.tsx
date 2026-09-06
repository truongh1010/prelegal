"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDocument, listDocuments, type SavedDocumentSummary } from "@/lib/documents/api";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<SavedDocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDocuments()
      .then((result) => {
        if (!cancelled) setDocuments(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your documents. Try refreshing the page.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this document? This can't be undone.")) return;
    await deleteDocument(id);
    setDocuments((current) => current?.filter((document) => document.id !== id) ?? current);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-mono text-[0.6875rem] tracking-[0.15em] text-muted uppercase">
          Prelegal
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">My documents</h1>
      </div>

      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}

      {documents === null && !error && <p className="text-sm text-muted">Loading…</p>}

      {documents !== null && documents.length === 0 && (
        <p className="text-sm text-muted">
          You haven&apos;t started any documents yet.{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-ink">
            Browse templates
          </Link>
          .
        </p>
      )}

      {documents !== null && documents.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-paper">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-medium text-ink">{document.templateName}</p>
                <p className="mt-0.5 text-sm text-muted">
                  Last updated {new Date(document.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={`/create/${document.template}?documentId=${document.id}`}
                  className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(document.id)}
                  className="text-sm text-signal underline underline-offset-2 hover:text-ink"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
