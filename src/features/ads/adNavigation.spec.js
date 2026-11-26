import { describe, expect, it } from "vitest";
import { advertisementDetailPath, getSafeExternalUrl } from "./adNavigation";

describe("advertisement navigation", () => {
  it("builds an encoded internal detail path", () => {
    expect(advertisementDetailPath("ad/42")).toBe("/advertisements/ad%2F42");
  });

  it("allows HTTPS only", () => {
    expect(getSafeExternalUrl("https://example.com/landing")).toBe("https://example.com/landing");
    expect(getSafeExternalUrl("http://example.com")).toBeNull();
    expect(getSafeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeExternalUrl("//example.com")).toBeNull();
  });
});
