import { describe, it, expect, vi } from "vitest";

// The central HTTP client is mocked at the boundary per the test contract,
// even though this empty module imports nothing — keeps the unit isolated and
// guards against the module gaining HTTP usage later without an isolated test.
vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe("@/services/onesignal", () => {
  it("imports as an empty module exposing no exports", async () => {
    const mod = await import("@/services/onesignal");

    // The source file is empty (0 bytes): it must import without throwing and
    // expose no named or default exports.
    expect(mod).toBeDefined();
    expect(mod.default).toBeUndefined();
    expect(Object.keys(mod)).toEqual([]);
  });
});
