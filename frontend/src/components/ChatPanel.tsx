"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateValues } from "@/lib/templates/types";
import { sendChatTurn, type ChatMessage } from "@/lib/chat/api";

interface ChatPanelProps {
  template: string;
  fields: TemplateValues;
  onFieldsChange: (fields: TemplateValues) => void;
}

export function ChatPanel({ template, fields, onFieldsChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // Starts true: the opening-turn effect below always fires immediately on mount.
  const [isSending, setIsSending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lets handlers read the latest known fields without re-running the opening-turn
  // effect or the send handler's closure every time the parent's values change.
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  // The input is disabled while sending, which browsers respond to by blurring it -
  // return focus once it's enabled again so the user can keep typing without a click.
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  useEffect(() => {
    let cancelled = false;
    sendChatTurn(template, [], fieldsRef.current)
      .then((result) => {
        if (cancelled) return;
        setMessages([{ role: "assistant", content: result.message }]);
        if (Object.keys(result.fields).length > 0) {
          onFieldsChange({ ...fieldsRef.current, ...result.fields });
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the assistant. Try refreshing the page.");
      })
      .finally(() => {
        if (!cancelled) setIsSending(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally fires once, when the chat opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const result = await sendChatTurn(template, nextMessages, fieldsRef.current);
      setMessages([...nextMessages, { role: "assistant", content: result.message }]);
      if (Object.keys(result.fields).length > 0) {
        onFieldsChange({ ...fieldsRef.current, ...result.fields });
      }
    } catch {
      setError("Something went wrong sending that. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="log"
        aria-live="polite"
        className="flex max-h-[420px] min-h-[200px] flex-col gap-3 overflow-y-auto rounded-md border border-line bg-paper p-4"
      >
        {messages.length === 0 && isSending && (
          <p className="text-sm text-muted">Starting the conversation…</p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "self-end rounded-md bg-ink px-3 py-2 text-sm text-paper"
                : "self-start rounded-md bg-canvas px-3 py-2 text-sm text-ink"
            }
          >
            {message.content}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-signal">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your answer…"
          aria-label="Message"
          disabled={isSending}
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
