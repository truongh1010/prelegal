interface MessageQuotaNoticeProps {
  remaining: number | null;
  limit: number | null;
}

export function MessageQuotaNotice({ remaining, limit }: MessageQuotaNoticeProps) {
  if (remaining === null || limit === null) return null;

  return (
    <p aria-live="polite" className="text-xs text-muted">
      {remaining > 0
        ? `${remaining} of ${limit} messages left`
        : "No AI messages left. You can still open and download your saved documents."}
    </p>
  );
}
