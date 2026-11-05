import { describe, expect, it } from "vitest";
import { readErrorDetail } from "./http";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 400 });
}

describe("readErrorDetail", () => {
  it("returns a plain string detail", async () => {
    expect(await readErrorDetail(jsonResponse({ detail: "Nope." }), "fallback")).toBe("Nope.");
  });

  it("joins FastAPI validation errors and drops pydantic's prefix", async () => {
    const body = { detail: [{ msg: "Value error, Enter a valid email address." }, { msg: "Too short." }] };

    expect(await readErrorDetail(jsonResponse(body), "fallback")).toBe("Enter a valid email address. Too short.");
  });

  it("falls back when the body isn't JSON", async () => {
    expect(await readErrorDetail(new Response("Internal Server Error"), "fallback")).toBe("fallback");
  });

  it("falls back when there's no usable detail", async () => {
    expect(await readErrorDetail(jsonResponse({ error: "Rate limit" }), "fallback")).toBe("fallback");
  });
});
