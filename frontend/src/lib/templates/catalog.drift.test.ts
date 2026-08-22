import { describe, expect, it, vi } from "vitest";

// Isolated in its own file so mocking the registry doesn't affect the main
// catalog.test.ts suite, which needs the real TEMPLATE_REGISTRY.
vi.mock("./registry", () => ({
  TEMPLATE_REGISTRY: [
    {
      slug: "drifted-template",
      filename: "Does-Not-Exist-In-Catalog.md",
      fields: [],
    },
  ],
}));

describe("getTemplateDefinition (registry/catalog drift)", () => {
  it("throws when a registered slug's filename has no matching catalog.json entry", async () => {
    const { getTemplateDefinition } = await import("./catalog");

    expect(() => getTemplateDefinition("drifted-template")).toThrow(
      /No catalog\.json entry found for template file "Does-Not-Exist-In-Catalog\.md"/,
    );
  });
});
