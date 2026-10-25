import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Isolate the unit from the real BaseService implementation: provide a minimal
// base class so PaymentsService's inheritance works without pulling in extra code.
vi.mock("@/shared/services/BaseService", () => ({
  BaseService: class {
    constructor(resource) {
      this.resource = resource;
    }
  },
}));

import api from "@/services/api";
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  removePayment,
  updatePaymentStatus,
  getReceiptPdf,
  PaymentsService,
  paymentsService,
} from "@/features/payments/PaymentsService";
import defaultExport from "@/features/payments/PaymentsService";

describe("PaymentsService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getPayments", () => {
    it("uses provided options to build the query string", () => {
      api.get.mockResolvedValue({ data: [] });
      getPayments({
        businessId: 5,
        page: 2,
        size: 25,
        search: "foo",
        status: "paid",
      });
      expect(api.get).toHaveBeenCalledWith(
        "/payments?businessId=5&search=foo&status=paid&size=25&page=2"
      );
    });

    it("applies all default values when called with an empty object", () => {
      api.get.mockResolvedValue({ data: [] });
      getPayments({});
      expect(api.get).toHaveBeenCalledWith(
        "/payments?businessId=0&search=&status=&size=10&page=0"
      );
    });

    it("rejects when the api call rejects", async () => {
      const err = new Error("boom");
      api.get.mockRejectedValue(err);
      await expect(getPayments({})).rejects.toBe(err);
    });
  });

  describe("getPayment", () => {
    it("requests the single payment by id and returns the response", async () => {
      const resp = { data: { id: 9 } };
      api.get.mockResolvedValue(resp);
      const result = await getPayment(9);
      expect(api.get).toHaveBeenCalledWith("/payments/9");
      expect(result).toBe(resp);
    });

    it("propagates errors from the api", async () => {
      const err = new Error("nope");
      api.get.mockRejectedValue(err);
      await expect(getPayment(1)).rejects.toBe(err);
    });
  });

  describe("createPayment", () => {
    it("posts the payment data to the create endpoint", async () => {
      const payload = { amount: 100 };
      const resp = { data: { id: 1 } };
      api.post.mockResolvedValue(resp);
      const result = await createPayment(payload);
      expect(api.post).toHaveBeenCalledWith("/payments/create", payload);
      expect(result).toBe(resp);
    });

    it("propagates errors from the api", async () => {
      const err = new Error("create failed");
      api.post.mockRejectedValue(err);
      await expect(createPayment({})).rejects.toBe(err);
    });
  });

  describe("updatePayment", () => {
    it("puts the updated data to the payment id endpoint", async () => {
      const payload = { amount: 200 };
      const resp = { data: { id: 3 } };
      api.put.mockResolvedValue(resp);
      const result = await updatePayment(3, payload);
      expect(api.put).toHaveBeenCalledWith("/payments/3", payload);
      expect(result).toBe(resp);
    });

    it("propagates errors from the api", async () => {
      const err = new Error("update failed");
      api.put.mockRejectedValue(err);
      await expect(updatePayment(3, {})).rejects.toBe(err);
    });
  });

  describe("removePayment", () => {
    it("deletes the payment by id", async () => {
      const resp = { data: {} };
      api.delete.mockResolvedValue(resp);
      const result = await removePayment(7);
      expect(api.delete).toHaveBeenCalledWith("/payments/7");
      expect(result).toBe(resp);
    });

    it("propagates errors from the api", async () => {
      const err = new Error("delete failed");
      api.delete.mockRejectedValue(err);
      await expect(removePayment(7)).rejects.toBe(err);
    });
  });

  describe("updatePaymentStatus", () => {
    it("puts the new status to the status endpoint", async () => {
      const resp = { data: { id: 4, status: "paid" } };
      api.put.mockResolvedValue(resp);
      const result = await updatePaymentStatus(4, "paid");
      expect(api.put).toHaveBeenCalledWith("/payments/4/status", {
        status: "paid",
      });
      expect(result).toBe(resp);
    });

    it("propagates errors from the api", async () => {
      const err = new Error("status failed");
      api.put.mockRejectedValue(err);
      await expect(updatePaymentStatus(4, "paid")).rejects.toBe(err);
    });
  });

  describe("getReceiptPdf", () => {
    it("requests the receipt as a blob and returns the response", async () => {
      const resp = { data: new Blob(["pdf"]) };
      api.get.mockResolvedValue(resp);
      const result = await getReceiptPdf(11);
      expect(api.get).toHaveBeenCalledWith("/payments/11/receipt", {
        responseType: "blob",
      });
      expect(result).toBe(resp);
    });

    it("propagates errors from the api", async () => {
      const err = new Error("receipt failed");
      api.get.mockRejectedValue(err);
      await expect(getReceiptPdf(11)).rejects.toBe(err);
    });
  });

  describe("PaymentsService class & singleton", () => {
    it("constructs with the 'payments' resource", () => {
      const svc = new PaymentsService();
      expect(svc).toBeInstanceOf(PaymentsService);
      expect(svc.resource).toBe("payments");
    });

    it("exposes the domain functions as prototype methods", () => {
      const svc = new PaymentsService();
      expect(typeof svc.getPayments).toBe("function");
      expect(typeof svc.getPayment).toBe("function");
      expect(typeof svc.createPayment).toBe("function");
      expect(typeof svc.updatePayment).toBe("function");
      expect(typeof svc.removePayment).toBe("function");
      expect(typeof svc.updatePaymentStatus).toBe("function");
      expect(typeof svc.getReceiptPdf).toBe("function");
    });

    it("singleton delegates getPayment to the api", () => {
      const resp = { data: { id: 1 } };
      api.get.mockResolvedValue(resp);
      paymentsService.getPayment(1);
      expect(api.get).toHaveBeenCalledWith("/payments/1");
    });

    it("singleton delegates getPayments to the api", () => {
      api.get.mockResolvedValue({ data: [] });
      paymentsService.getPayments({ businessId: 2 });
      expect(api.get).toHaveBeenCalledWith(
        "/payments?businessId=2&search=&status=&size=10&page=0"
      );
    });

    it("default export is the singleton instance", () => {
      expect(defaultExport).toBe(paymentsService);
      expect(defaultExport).toBeInstanceOf(PaymentsService);
    });
  });
});
