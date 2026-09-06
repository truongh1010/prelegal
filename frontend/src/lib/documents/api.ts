import type { ChatMessage } from "@/lib/chat/api";
import type { TemplateValues } from "@/lib/templates/types";

export interface SavedDocumentSummary {
  id: number;
  template: string;
  templateName: string;
  fields: TemplateValues;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDocumentDetail extends SavedDocumentSummary {
  messages: ChatMessage[];
}

interface RawSummary {
  id: number;
  template: string;
  template_name: string;
  fields: Record<string, string | null>;
  created_at: string;
  updated_at: string;
}

interface RawDetail extends RawSummary {
  messages: ChatMessage[];
}

// Empty by default so requests are same-origin (works once FastAPI serves the static
// export in Docker). Set NEXT_PUBLIC_API_BASE_URL to point at a separately-running
// backend when using `next dev` directly.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function toSummary(raw: RawSummary): SavedDocumentSummary {
  const fields = Object.fromEntries(
    Object.entries(raw.fields).filter(([, value]) => value != null),
  ) as TemplateValues;
  return {
    id: raw.id,
    template: raw.template,
    templateName: raw.template_name,
    fields,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function toDetail(raw: RawDetail): SavedDocumentDetail {
  return { ...toSummary(raw), messages: raw.messages };
}

export async function createDocument(template: string): Promise<SavedDocumentDetail> {
  const response = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ template }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create document (status ${response.status})`);
  }
  return toDetail((await response.json()) as RawDetail);
}

export async function listDocuments(): Promise<SavedDocumentSummary[]> {
  const response = await fetch(`${API_BASE}/api/documents`, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to load documents (status ${response.status})`);
  }
  const data = (await response.json()) as RawSummary[];
  return data.map(toSummary);
}

/** Returns null if the document doesn't exist or isn't the caller's - callers
 * should fall back to starting a fresh document in that case. */
export async function getDocument(id: number): Promise<SavedDocumentDetail | null> {
  const response = await fetch(`${API_BASE}/api/documents/${id}`, { credentials: "include" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load document (status ${response.status})`);
  }
  return toDetail((await response.json()) as RawDetail);
}

export async function deleteDocument(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete document (status ${response.status})`);
  }
}
