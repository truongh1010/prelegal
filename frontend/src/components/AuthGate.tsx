"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isAuthed, subscribeToAuthChange } from "@/lib/auth";
import { LoginScreen } from "./LoginScreen";

function getServerSnapshot() {
  return false;
}

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Fake, client-side-only auth gate (PL-4): no backend call, just a localStorage flag.
 * localStorage isn't available during the static export's server render, so the very
 * first paint always assumes "guest" (getServerSnapshot) and syncs to the real value
 * right after hydration.
 */
export function AuthGate({ children }: AuthGateProps) {
  const authed = useSyncExternalStore(subscribeToAuthChange, isAuthed, getServerSnapshot);

  return authed ? <>{children}</> : <LoginScreen />;
}
