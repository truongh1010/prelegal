import { readErrorDetail } from "@/lib/http";
import type { TemplateValues } from "@/lib/templates/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTurnResult {
  message: string;
  fields: TemplateValues;
}

export class ChatApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const GENERIC_ERROR = "Something went wrong sending that. Please try again.";

async function toChatApiError(response: Response): Promise<ChatApiError> {
  return new ChatApiError(response.status, await readErrorDetail(response, GENERIC_ERROR));
}

/** Validation errors are written for the user, so they're shown as they arrive.
 * Anything else (an outage, a network failure) gets a generic message. */
export function friendlyChatError(error: unknown): string {
  if (error instanceof ChatApiError) {
    if (error.status === 401) return "Your session has expired. Please sign in again.";
    if (error.status === 422) return error.message;
  }
  return GENERIC_ERROR;
}

// Empty by default so requests are same-origin (works once FastAPI serves the static
// export in Docker). Set NEXT_PUBLIC_API_BASE_URL to point at a separately-running
// backend when using `next dev` directly.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function sendChatTurn(
  template: string,
  messages: ChatMessage[],
  fields: TemplateValues,
  documentId: number,
): Promise<ChatTurnResult> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ template, document_id: documentId, messages, fields }),
  });

  if (!response.ok) {
    throw await toChatApiError(response);
  }

  const data = (await response.json()) as { message: string; fields: Record<string, string | null> };
  const cleanedFields = Object.fromEntries(
    Object.entries(data.fields).filter(([, value]) => value != null),
  ) as TemplateValues;

  return { message: data.message, fields: cleanedFields };
}

export interface DiscoverTurnResult {
  message: string;
  matchedSlug: string | null;
}

export async function sendDiscoverTurn(messages: ChatMessage[]): Promise<DiscoverTurnResult> {
  const response = await fetch(`${API_BASE}/api/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw await toChatApiError(response);
  }

  return (await response.json()) as DiscoverTurnResult;
}
