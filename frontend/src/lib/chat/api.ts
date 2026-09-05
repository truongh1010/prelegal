import type { TemplateValues } from "@/lib/templates/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTurnResult {
  message: string;
  fields: TemplateValues;
}

// Empty by default so requests are same-origin (works once FastAPI serves the static
// export in Docker). Set NEXT_PUBLIC_API_BASE_URL to point at a separately-running
// backend when using `next dev` directly.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function sendChatTurn(
  messages: ChatMessage[],
  fields: TemplateValues,
): Promise<ChatTurnResult> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { message: string; fields: Record<string, string | null> };
  const cleanedFields = Object.fromEntries(
    Object.entries(data.fields).filter(([, value]) => value != null),
  ) as TemplateValues;

  return { message: data.message, fields: cleanedFields };
}
