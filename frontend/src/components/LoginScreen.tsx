"use client";

import { useState } from "react";
import { setAuthed } from "@/lib/auth";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAuthed();
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-canvas px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-line bg-paper p-8"
      >
        <div>
          <p className="font-mono text-[0.6875rem] tracking-[0.15em] text-muted uppercase">
            Prelegal
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Preview build — any email and password will do.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-soft">Email</span>
          <input
            type="text"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-soft">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
