import { describe, expect, it } from "vitest";
import {
  getCatalogWithStatus,
  getTemplateDefinition,
  readTemplateContent,
} from "./catalog";

describe("getCatalogWithStatus", () => {
  it("returns every template from the repo-root catalog.json", () => {
    const templates = getCatalogWithStatus();
    expect(templates.length).toBeGreaterThanOrEqual(11);
    expect(templates.map((t) => t.filename)).toContain("Mutual-NDA.md");
  });

  it("flags every catalog template with its registered field schema slug", () => {
    const templates = getCatalogWithStatus();
    const mnda = templates.find((t) => t.filename === "Mutual-NDA.md");

    expect(mnda?.slug).toBe("mutual-nda");
    expect(templates.every((t) => t.slug !== undefined)).toBe(true);
  });
});

describe("getTemplateDefinition", () => {
  it("returns the catalog entry merged with its field schema for a registered slug", () => {
    const template = getTemplateDefinition("mutual-nda");

    expect(template).toBeDefined();
    expect(template?.name).toBe("Mutual Non-Disclosure Agreement");
    expect(template?.filename).toBe("Mutual-NDA.md");
    expect(template?.fields.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unregistered slug", () => {
    expect(getTemplateDefinition("cloud-service-agreement")).toBeUndefined();
    expect(getTemplateDefinition("not-a-real-slug")).toBeUndefined();
  });
});

describe("readTemplateContent", () => {
  it("reads the raw markdown for a template file from the repo root", () => {
    const content = readTemplateContent("Mutual-NDA.md");
    expect(content).toContain("Mutual Non-Disclosure Agreement");
    expect(content).toContain('class="coverpage_link"');
  });

  it("throws for a template file that does not exist", () => {
    expect(() => readTemplateContent("Not-A-Real-Template.md")).toThrow();
  });
});
