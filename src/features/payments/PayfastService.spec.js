import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Boundary mocks -------------------------------------------------------

vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Deterministic MD5 so we can assert the exact signature string that was hashed.
vi.mock("crypto-js", () => ({
  default: {
    MD5: vi.fn((str) => ({ toString: () => `md5(${str})` })),
  },
}));

// Fixed PayFast config so field mapping + signature are deterministic.
vi.mock("@/config/payfast", () => ({
  PAYFAST: {
    merchantId: "MID",
    merchantKey: "MKEY",
    returnUrl: "https://app/return",
    cancelUrl: "https://app/cancel",
    notifyUrl: "https://app/notify",
    passphrase: "secret pass",
  },
  payfastProcessUrl: vi.fn(() => "https://gateway/process"),
}));

import api from "@/services/api";
import CryptoJS from "crypto-js";
import { PAYFAST, payfastProcessUrl } from "@/config/payfast";
import {
  getPayfastProcessUrl,
  generatePayfastData,
  generatePayfastUrl,
  createPayment,
  verifyPayment,
  getPaymentStatus,
  PayfastService,
  payfastService,
} from "@/features/payments/PayfastService";

const fullPaymentData = () => ({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  orderId: "ORDER-1",
  amount: 12.5,
  name: "Premium Ad",
  description: "A nice ad",
});

describe("PayfastService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // restore mocked implementations cleared by clearAllMocks
    payfastProcessUrl.mockReturnValue("https://gateway/process");
    CryptoJS.MD5.mockImplementation((str) => ({ toString: () => `md5(${str})` }));
  });

  describe("getPayfastProcessUrl()", () => {
    it("delegates to config payfastProcessUrl()", () => {
      expect(getPayfastProcessUrl()).toBe("https://gateway/process");
      expect(payfastProcessUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe("generatePayfastData()", () => {
    it("maps all provided fields and computes a signature (truthy branches)", () => {
      const data = generatePayfastData(fullPaymentData());

      expect(data).toMatchObject({
        merchant_id: "MID",
        merchant_key: "MKEY",
        return_url: "https://app/return",
        cancel_url: "https://app/cancel",
        notify_url: "https://app/notify",
        name_first: "John",
        name_last: "Doe",
        email_address: "john@example.com",
        m_payment_id: "ORDER-1",
        amount: "12.50",
        item_name: "Premium Ad",
        item_description: "A nice ad",
      });
      // signature was computed via generateSignature -> CryptoJS.MD5
      expect(data.signature).toMatch(/^md5\(/);
      expect(CryptoJS.MD5).toHaveBeenCalledTimes(1);
    });

    it("falls back to empty strings for missing optional fields (falsy branches)", () => {
      // omit firstName, lastName, email, orderId, description -> all || "" branches
      const data = generatePayfastData({ amount: 0, name: "Item" });

      expect(data.name_first).toBe("");
      expect(data.name_last).toBe("");
      expect(data.email_address).toBe("");
      expect(data.m_payment_id).toBe("");
      expect(data.item_description).toBe("");
      expect(data.amount).toBe("0.00");
      expect(data.item_name).toBe("Item");
    });

    it("excludes empty-value fields and the signature key from the signed string, and appends the passphrase", () => {
      generatePayfastData({ amount: 0, name: "Item" });

      const signed = CryptoJS.MD5.mock.calls[0][0];
      // amount "0.00" and item_name are non-empty -> included
      expect(signed).toContain("amount=0.00");
      expect(signed).toContain("item_name=Item");
      // empty-valued keys are excluded
      expect(signed).not.toContain("name_first=");
      expect(signed).not.toContain("email_address=");
      // signature key must never be part of the signed payload
      expect(signed).not.toContain("signature=");
      // passphrase appended (non-empty passphrase branch), spaces -> "+"
      expect(signed).toContain("&passphrase=secret+pass");
    });

    it("computes signature without a passphrase when PAYFAST.passphrase is empty", () => {
      const original = PAYFAST.passphrase;
      PAYFAST.passphrase = "";
      try {
        generatePayfastData(fullPaymentData());
        const signed = CryptoJS.MD5.mock.calls[0][0];
        expect(signed).not.toContain("passphrase=");
      } finally {
        PAYFAST.passphrase = original;
      }
    });
  });

  describe("generatePayfastUrl()", () => {
    it("builds a full gateway URL with an encoded query string", () => {
      const url = generatePayfastUrl(fullPaymentData());

      expect(url.startsWith("https://gateway/process?")).toBe(true);
      expect(payfastProcessUrl).toHaveBeenCalledTimes(1);

      const query = url.split("?")[1];
      const params = new URLSearchParams(query);
      expect(params.get("merchant_id")).toBe("MID");
      expect(params.get("name_first")).toBe("John");
      expect(params.get("amount")).toBe("12.50");
      expect(params.get("item_name")).toBe("Premium Ad");
      expect(params.get("signature")).toMatch(/^md5\(/);
    });
  });

  describe("backend API delegations", () => {
    it("createPayment() POSTs to /payments/create", async () => {
      const payload = { foo: "bar" };
      api.post.mockResolvedValue({ data: { id: 1 } });
      const res = await createPayment(payload);
      expect(api.post).toHaveBeenCalledWith("/payments/create", payload);
      expect(res).toEqual({ data: { id: 1 } });
    });

    it("createPayment() propagates rejection from the client", async () => {
      const err = new Error("network");
      api.post.mockRejectedValue(err);
      await expect(createPayment({})).rejects.toBe(err);
    });

    it("verifyPayment() POSTs to /payments/verify", async () => {
      const payload = { token: "t" };
      api.post.mockResolvedValue({ data: { ok: true } });
      const res = await verifyPayment(payload);
      expect(api.post).toHaveBeenCalledWith("/payments/verify", payload);
      expect(res).toEqual({ data: { ok: true } });
    });

    it("verifyPayment() propagates rejection from the client", async () => {
      const err = new Error("verify failed");
      api.post.mockRejectedValue(err);
      await expect(verifyPayment({})).rejects.toBe(err);
    });

    it("getPaymentStatus() GETs /payments/{orderId}/status", async () => {
      api.get.mockResolvedValue({ data: { status: "PAID" } });
      const res = await getPaymentStatus("ORDER-9");
      expect(api.get).toHaveBeenCalledWith("/payments/ORDER-9/status");
      expect(res).toEqual({ data: { status: "PAID" } });
    });

    it("getPaymentStatus() propagates rejection from the client", async () => {
      const err = new Error("status failed");
      api.get.mockRejectedValue(err);
      await expect(getPaymentStatus("X")).rejects.toBe(err);
    });
  });

  describe("PayfastService class + singleton", () => {
    it("constructs with the 'payments' resource via BaseService", () => {
      const svc = new PayfastService();
      expect(svc.resource).toBe("payments");
      expect(svc.api).toBe(api);
    });

    it("exposes the domain functions as instance methods on the prototype", () => {
      expect(typeof payfastService.getPayfastProcessUrl).toBe("function");
      expect(typeof payfastService.generatePayfastData).toBe("function");
      expect(typeof payfastService.generatePayfastUrl).toBe("function");
      expect(typeof payfastService.createPayment).toBe("function");
      expect(typeof payfastService.verifyPayment).toBe("function");
      expect(typeof payfastService.getPaymentStatus).toBe("function");
    });

    it("singleton delegates getPaymentStatus to the API client", async () => {
      api.get.mockResolvedValue({ data: { status: "OK" } });
      const res = await payfastService.getPaymentStatus("S-1");
      expect(api.get).toHaveBeenCalledWith("/payments/S-1/status");
      expect(res).toEqual({ data: { status: "OK" } });
    });

    it("singleton exposes BaseService default verbs against the payments resource", () => {
      api.get.mockResolvedValue({ data: [] });
      payfastService.list();
      expect(api.get).toHaveBeenCalledWith("/payments", { params: {} });
    });

    it("singleton getPayfastProcessUrl() returns the gateway URL", () => {
      expect(payfastService.getPayfastProcessUrl()).toBe("https://gateway/process");
    });

    it("singleton generatePayfastData() produces signed fields", () => {
      const data = payfastService.generatePayfastData(fullPaymentData());
      expect(data.signature).toMatch(/^md5\(/);
    });

    it("singleton generatePayfastUrl() produces a gateway URL", () => {
      const url = payfastService.generatePayfastUrl(fullPaymentData());
      expect(url.startsWith("https://gateway/process?")).toBe(true);
    });

    it("singleton createPayment()/verifyPayment() delegate to the client", async () => {
      api.post.mockResolvedValue({ data: {} });
      await payfastService.createPayment({ a: 1 });
      expect(api.post).toHaveBeenCalledWith("/payments/create", { a: 1 });
      await payfastService.verifyPayment({ b: 2 });
      expect(api.post).toHaveBeenCalledWith("/payments/verify", { b: 2 });
    });
  });
});
