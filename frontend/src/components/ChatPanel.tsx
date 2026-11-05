"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateValues } from "@/lib/templates/types";
import { MessageQuotaNotice } from "@/components/MessageQuotaNotice";
import { ChatApiError, friendlyChatError, sendChatTurn, type ChatMessage } from "@/lib/chat/api";
import { chatGreeting, MAX_MESSAGE_CHARS } from "@/lib/chat/greetings";
import { useMessageQuota } from "@/lib/chat/useMessageQuota";

interface ChatPanelProps {
  template: string;
  templateName: string;
  fields: TemplateValues;
  onFieldsChange: (fields: TemplateValues) => void;
  documentId: number;
  /** Prior messages when resuming a saved document. */
  initialMessages?: ChatMessage[];
}

export function ChatPanel({
  template,
  templateName,
  fields,
  onFieldsChange,
  documentId,
  initialMessages = [],
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quota = useMessageQuota();
  const outOfMessages = quota.remaining === 0;

  const transcript: ChatMessage[] = [{ role: "assistant", content: chatGreeting(templateName) }, ...messages];

  // Lets the send handler read the latest known fields without being rebuilt every
  // time the parent's values change.
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  // The input is disabled while sending, which browsers respond to by blurring it -
  // return focus once it's enabled again so the user can keep typing without a click.
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending || outOfMessages) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const result = await sendChatTurn(template, nextMessages, fieldsRef.current, documentId);
      setMessages([...nextMessages, { role: "assistant", content: result.message }]);
      quota.setRemaining(result.messagesRemaining);
      if (Object.keys(result.fields).length > 0) {
        onFieldsChange({ ...fieldsRef.current, ...result.fields });
      }
    } catch (sendError) {
      // Put the text back so a failed send never loses what the user typed, and take
      // the message out of the history so it isn't sent twice on the retry.
      setMessages(messages);
      setInput(text);
      setError(friendlyChatError(sendError));
      if (sendError instanceof ChatApiError && sendError.status === 429) void quota.refresh();
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
        {transcript.map((message, index) => (
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

      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
      <MessageQuotaNotice remaining={quota.remaining} limit={quota.limit} />

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={outOfMessages ? "You're out of AI messages" : "Type your answer…"}
          aria-label="Message"
          maxLength={MAX_MESSAGE_CHARS}
          disabled={isSending || outOfMessages}
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSending || outOfMessages || !input.trim()}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
