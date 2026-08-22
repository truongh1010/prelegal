import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-serif text-lg font-semibold text-ink transition-colors hover:text-ink-soft"
        >
          Prelegal
        </Link>
        <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted uppercase">
          Common Paper templates
        </span>
      </div>
    </header>
  );
}
