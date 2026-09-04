"use client";

import { clearAuthed } from "@/lib/auth";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => clearAuthed()}
      className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted uppercase transition-colors hover:text-ink-soft"
    >
      Log out
    </button>
  );
}
