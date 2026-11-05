import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_REGISTRY } from "./registry";
import type { CatalogEntry, TemplateDefinition } from "./types";

// The frontend app treats the repo-root templates dataset as its
// single source of truth rather than duplicating it into this app.
const REPO_ROOT = path.join(process.cwd(), "..");

function readCatalog(): CatalogEntry[] {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "catalog.json"), "utf-8");
  return JSON.parse(raw) as CatalogEntry[];
}

export interface CatalogListItem extends CatalogEntry {
  /** Present only when a fill-in creator UI is registered for this template. */
  slug?: string;
}

/** All catalog templates, flagged with a `slug` where a creator UI is available. */
export function getCatalogWithStatus(): CatalogListItem[] {
  return readCatalog().map((entry) => {
    const registered = TEMPLATE_REGISTRY.find((r) => r.filename === entry.filename);
    return { ...entry, slug: registered?.slug };
  });
}

export function getTemplateDefinition(slug: string): TemplateDefinition | undefined {
  const registered = TEMPLATE_REGISTRY.find((r) => r.slug === slug);
  if (!registered) return undefined;
  const entry = readCatalog().find((c) => c.filename === registered.filename);
  if (!entry) {
    throw new Error(`No catalog.json entry found for template file "${registered.filename}"`);
  }
  return { ...entry, slug: registered.slug, fields: registered.fields };
}

export function readTemplateContent(filename: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, "templates", filename), "utf-8");
}
