import Link from "next/link";
import { getCatalogWithStatus } from "@/lib/templates/catalog";

export default function Home() {
  const templates = getCatalogWithStatus();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Prelegal</h1>
        <p className="mt-2 text-zinc-600">
          Fill in a few details and generate a ready-to-sign agreement from Common
          Paper&apos;s standard legal templates.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        {templates.map((template) => (
          <li
            key={template.filename}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div>
              <p className="font-medium text-zinc-900">{template.name}</p>
              <p className="text-sm text-zinc-600">{template.description}</p>
            </div>
            {template.slug ? (
              <Link
                href={`/create/${template.slug}`}
                className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Create
              </Link>
            ) : (
              <span className="shrink-0 rounded-md bg-zinc-100 px-4 py-2 text-sm text-zinc-400">
                Coming soon
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
