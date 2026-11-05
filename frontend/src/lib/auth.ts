import { readErrorDetail } from "@/lib/http";

/** Fires whenever this tab's auth state changes (sign in, sign up, or sign out),
 * so AuthGate knows to re-check the session. */
const AUTH_CHANGE_EVENT = "prelegal:auth-change";

// Empty by default so requests are same-origin (works once FastAPI serves the static
// export in Docker). Set NEXT_PUBLIC_API_BASE_URL to point at a separately-running
// backend when using `next dev` directly.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class AuthError extends Error {}

async function submitCredentials(path: string, email: string, password: string, fallback: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new AuthError(await readErrorDetail(response, fallback));
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function signUp(email: string, password: string): Promise<void> {
  return submitCredentials("/api/signup", email, password, "Couldn't create an account.");
}

export function signIn(email: string, password: string): Promise<void> {
  return submitCredentials("/api/signin", email, password, "Couldn't sign in.");
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/** Asks the backend whether the session cookie (if any) is still valid. An
 * httpOnly cookie can't be read from JS directly, so this round-trip is the
 * only way to know the current auth state. */
export async function checkSession(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  return response.ok;
}

export interface Me {
  email: string;
  ai_messages_remaining: number;
  ai_messages_limit: number;
}

export async function fetchMe(): Promise<Me | null> {
  const response = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  return response.ok ? ((await response.json()) as Me) : null;
}

export function subscribeToAuthChange(callback: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, callback);
}
