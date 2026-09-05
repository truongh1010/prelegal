"use client";

import { signOut } from "@/lib/auth";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut();
      }}
      className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted uppercase transition-colors hover:text-ink-soft"
    >
      Log out
    </button>
  );
}
