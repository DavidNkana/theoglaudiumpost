import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit test for config/payfast.js.
 *
 * The module reads env + the current origin at IMPORT time via config/env.js,
 * so every branch is exercised with vi.resetModules() + a fresh dynamic
 * import after stubbing env vars / globals. env.js is the real (and only)
 * collaborator — it is left un-mocked so we test the genuine wiring, but we
 * control its inputs (import.meta.env via vi.stubEnv, window via vi.stubGlobal).
 */

// The repo-wide convention: mock the central HTTP client at the boundary even
// though payfast.js does not touch it, so the unit stays isolated from network.
vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// The repo ships a real .env that sets every VITE_PAYFAST_* var, which Vitest
// loads into import.meta.env. Clear them all to a known-unset baseline so each
// test starts from "env absent" and only the vars it stubs are present —
// otherwise .env leakage masks the default branches.
const PAYFAST_ENV_KEYS = [
  "VITE_PAYFAST_MERCHANT_ID",
  "VITE_PAYFAST_MERCHANT_KEY",
  "VITE_PAYFAST_PASSPHRASE",
  "VITE_PAYFAST_RETURN_URL",
  "VITE_PAYFAST_CANCEL_URL",
  "VITE_PAYFAST_NOTIFY_URL",
  "VITE_PAYFAST_SANDBOX",
];

function clearPayfastEnv() {
  for (const key of PAYFAST_ENV_KEYS) {
    vi.stubEnv(key, undefined);
  }
}

describe("config/payfast", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearPayfastEnv();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("static process URL constants are the fixed PayFast endpoints", async () => {
    const mod = await import("@/config/payfast");
    expect(mod.PAYFAST_PROCESS_URL_SANDBOX).toBe(
      "https://sandbox.payfast.co.za/eng/process",
    );
    expect(mod.PAYFAST_PROCESS_URL_LIVE).toBe(
      "https://www.payfast.co.za/eng/process",
    );
  });

  it("defaults all merchant fields and stays in sandbox when env is unset (window origin used)", async () => {
    // window is present in jsdom; window.location.origin drives the URL defaults.
    const origin = window.location.origin;
    const mod = await import("@/config/payfast");

    expect(mod.PAYFAST).toEqual({
      merchantId: "10000100",
      merchantKey: "46f0cd694581a",
      passphrase: "",
      returnUrl: origin + "/payment/success",
      cancelUrl: origin + "/payment/cancel",
      notifyUrl: origin + "/api/payments/notify",
      sandbox: true,
    });
  });

  it("payfastProcessUrl() returns the sandbox URL while sandbox is true", async () => {
    const mod = await import("@/config/payfast");
    expect(mod.PAYFAST.sandbox).toBe(true);
    expect(mod.payfastProcessUrl()).toBe(
      "https://sandbox.payfast.co.za/eng/process",
    );
  });

  it("reads every overridable merchant/callback env var when present", async () => {
    vi.stubEnv("VITE_PAYFAST_MERCHANT_ID", "99999999");
    vi.stubEnv("VITE_PAYFAST_MERCHANT_KEY", "deadbeefcafe");
    vi.stubEnv("VITE_PAYFAST_PASSPHRASE", "s3cret");
    vi.stubEnv("VITE_PAYFAST_RETURN_URL", "https://x.test/ok");
    vi.stubEnv("VITE_PAYFAST_CANCEL_URL", "https://x.test/no");
    vi.stubEnv("VITE_PAYFAST_NOTIFY_URL", "https://x.test/itn");

    const mod = await import("@/config/payfast");

    expect(mod.PAYFAST).toMatchObject({
      merchantId: "99999999",
      merchantKey: "deadbeefcafe",
      passphrase: "s3cret",
      returnUrl: "https://x.test/ok",
      cancelUrl: "https://x.test/no",
      notifyUrl: "https://x.test/itn",
    });
  });

  it('flips out of sandbox only when VITE_PAYFAST_SANDBOX === "false", and payfastProcessUrl() returns the live URL', async () => {
    vi.stubEnv("VITE_PAYFAST_SANDBOX", "false");

    const mod = await import("@/config/payfast");

    expect(mod.PAYFAST.sandbox).toBe(false);
    expect(mod.payfastProcessUrl()).toBe(
      "https://www.payfast.co.za/eng/process",
    );
  });

  it('keeps sandbox true for any non-"false" VITE_PAYFAST_SANDBOX value (e.g. "true")', async () => {
    vi.stubEnv("VITE_PAYFAST_SANDBOX", "true");

    const mod = await import("@/config/payfast");

    expect(mod.PAYFAST.sandbox).toBe(true);
    expect(mod.payfastProcessUrl()).toBe(
      "https://sandbox.payfast.co.za/eng/process",
    );
  });

  it('keeps sandbox true for a non-boolean string value (e.g. "0")', async () => {
    vi.stubEnv("VITE_PAYFAST_SANDBOX", "0");

    const mod = await import("@/config/payfast");

    expect(mod.PAYFAST.sandbox).toBe(true);
  });

  it("uses empty-string origin defaults when window is undefined (non-browser guard)", async () => {
    // Exercise the falsy side of currentOrigin()'s typeof-window guard so the
    // URL defaults fall back to "" + path with no leading origin.
    vi.stubGlobal("window", undefined);

    const mod = await import("@/config/payfast");

    expect(mod.PAYFAST.returnUrl).toBe("/payment/success");
    expect(mod.PAYFAST.cancelUrl).toBe("/payment/cancel");
    expect(mod.PAYFAST.notifyUrl).toBe("/api/payments/notify");
  });
});
