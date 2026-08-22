import Link from "next/link";
import { getCatalogWithStatus } from "@/lib/templates/catalog";

export default function Home() {
  const templates = getCatalogWithStatus();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <div>
        <p className="font-mono text-[0.6875rem] tracking-[0.15em] text-muted uppercase">
          Standard legal templates
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">
          Fill in a form. Get a document ready to sign.
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          Answer a few questions about the deal and watch the agreement fill in
          live, word for word, then download it.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-paper">
        {templates.map((template) => (
          <li
            key={template.filename}
            className="flex items-center justify-between gap-6 p-5"
          >
            <div>
              <p className="font-medium text-ink">{template.name}</p>
              <p className="mt-0.5 text-sm text-muted">{template.description}</p>
            </div>
            {template.slug ? (
              <Link
                href={`/create/${template.slug}`}
                className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
              >
                Create
              </Link>
            ) : (
              <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.08em] text-muted uppercase">
                Coming soon
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
