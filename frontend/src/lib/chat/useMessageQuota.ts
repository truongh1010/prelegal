import { useCallback, useEffect, useState } from "react";
import { fetchMe } from "@/lib/auth";

export interface MessageQuota {
  /** Null until known. The server enforces the limit, so nothing is blocked while it's unknown. */
  remaining: number | null;
  limit: number | null;
  setRemaining: (remaining: number) => void;
  refresh: () => Promise<void>;
}

export function useMessageQuota(): MessageQuota {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      if (me) {
        setRemaining(me.ai_messages_remaining);
        setLimit(me.ai_messages_limit);
      }
    } catch {
      // The count is only informative, so a failed check just leaves it as it was.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only sets state after the fetch resolves
    void refresh();
  }, [refresh]);

  return { remaining, limit, setRemaining, refresh };
}
