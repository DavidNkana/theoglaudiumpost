import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl } from "./api-url.js";

describe("normalizeApiBaseUrl", () => {
  it("allows the documented same-origin placeholder outside production", () => {
    expect(normalizeApiBaseUrl("/api/v1/", { mode: "test" })).toBe("/api/v1/");
  });

  it("rejects a same-origin placeholder in production", () => {
    expect(() => normalizeApiBaseUrl("/api/v1/")).toThrow("absolute HTTPS URL");
  });

  it("normalizes an absolute URL without a trailing slash", () => {
    expect(normalizeApiBaseUrl("https://api.example/v1")).toBe(
      "https://api.example/v1/",
    );
  });

  it.each([
    "",
    "not-a-url",
    "ftp://api.example/v1/",
    "https://user:password@api.example/v1/",
    "https://api.example/v1/?tenant=one",
    "https://api.example/v1//",
  ])("rejects unsafe or ambiguous URL %j", (url) => {
    expect(() => normalizeApiBaseUrl(url)).toThrow();
  });

  it("allows HTTP for an explicit non-production backend", () => {
    expect(
      normalizeApiBaseUrl("http://localhost:9011/api/v1", {
        mode: "development",
      }),
    ).toBe("http://localhost:9011/api/v1/");
  });
});
