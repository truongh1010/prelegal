"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendDiscoverTurn, type ChatMessage } from "@/lib/chat/api";

/**
 * Freeform chat that helps a user figure out which catalog document they need,
 * before any specific template is chosen. On a confirmed match it routes to that
 * template's existing /create/[slug] chat, which starts its own field-gathering
 * conversation from scratch.
 */
export function DiscoverChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // Starts true: the opening-turn effect below always fires immediately on mount.
  const [isSending, setIsSending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  useEffect(() => {
    let cancelled = false;
    sendDiscoverTurn([])
      .then((result) => {
        if (cancelled) return;
        setMessages([{ role: "assistant", content: result.message }]);
        if (result.matchedSlug) router.push(`/create/${result.matchedSlug}`);
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
      const result = await sendDiscoverTurn(nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: result.message }]);
      if (result.matchedSlug) router.push(`/create/${result.matchedSlug}`);
    } catch {
      setError("Something went wrong sending that. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-5">
      <div>
        <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted uppercase">
          Not sure which document you need?
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Describe what you&rsquo;re trying to do and we&rsquo;ll help you pick.
        </p>
      </div>

      <div
        role="log"
        aria-live="polite"
        className="flex max-h-[320px] min-h-[80px] flex-col gap-3 overflow-y-auto rounded-md border border-line bg-canvas p-4"
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
                : "self-start rounded-md bg-paper px-3 py-2 text-sm text-ink"
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
          placeholder="e.g. I need to license my software to a customer…"
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
