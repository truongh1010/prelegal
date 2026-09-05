"use client";

import { useEffect, useState, type ReactNode } from "react";
import { checkSession, subscribeToAuthChange } from "@/lib/auth";
import { LoginScreen } from "./LoginScreen";

type Status = "checking" | "authed" | "guest";

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Real, backend-checked auth gate (PL-7): signup/signin set an httpOnly session
 * cookie, and since that cookie can't be read from JS, the gate asks the backend
 * (GET /api/me) whether it's still valid rather than trusting local state.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const authed = await checkSession();
      if (!cancelled) setStatus(authed ? "authed" : "guest");
    }

    refresh();
    const unsubscribe = subscribeToAuthChange(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (status === "checking") return null;
  return status === "authed" ? <>{children}</> : <LoginScreen />;
}
