const AUTH_KEY = "prelegal:authed";
/** Fires whenever this tab changes the flag, since the native "storage" event only fires cross-tab. */
const AUTH_CHANGE_EVENT = "prelegal:auth-change";

/** localStorage can throw (privacy mode, disabled storage) - treat those as "not logged in". */
function storage(): Storage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function isAuthed(): boolean {
  return storage()?.getItem(AUTH_KEY) === "true";
}

export function setAuthed(): void {
  try {
    storage()?.setItem(AUTH_KEY, "true");
  } catch {
    // Quota exceeded or storage disabled - nothing to do, gate stays as-is.
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthed(): void {
  try {
    storage()?.removeItem(AUTH_KEY);
  } catch {
    // See setAuthed().
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/** Subscribes to auth-flag changes, both cross-tab ("storage") and same-tab (custom event). */
export function subscribeToAuthChange(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
}
