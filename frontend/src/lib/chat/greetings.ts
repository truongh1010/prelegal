// The greeting is fixed text so opening a chat is instant and needs no AI call. It's
// only ever displayed: never sent to the backend, and never saved with a document.

/** Mirrors MAX_USER_MESSAGE_CHARS in backend/app/core/chat_limits.py. */
export const MAX_MESSAGE_CHARS = 2000;

export const DISCOVER_GREETING =
  "Hi! Tell me what you're trying to do and I'll find the right document.";

export function chatGreeting(templateName: string): string {
  return `Hi! I'll help you fill in your ${templateName}. Share as much as you can at once: who the parties are, key dates, and any terms you already know.`;
}
