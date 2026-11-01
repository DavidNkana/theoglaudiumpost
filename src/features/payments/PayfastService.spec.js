import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  tables: {},
  builders: {},
}));

vi.mock("@/services/supabase.js", async () => {
  const { buildSupabaseModule } = await import(
    "../../../tests/helpers/supabaseModuleMock.js"
  );
  return buildSupabaseModule(state);
});

import {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  generatePayfastData,
} from "@/features/payments/PayfastService.js";

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
};

describe("features/payments/PayfastService", () => {
  beforeEach(reset);

  it("signs the payload sent to Payfast", () => {
    const signed = generatePayfastData({
      firstName: "David",
      lastName: "Nkana",
      email: "info@laudiumpost.co.za",
      orderId: "pay-1",
      amount: 500,
      name: "Ad placement",
    });

    expect(signed.m_payment_id).toBe("pay-1");
    expect(signed.amount).toBe("500.00");
    expect(signed.signature).toBeTruthy();
  });

  it("records a payment against the ad", async () => {
    state.tables.payments = { data: { id: "pay-1" }, error: null };

    const response = await createPayment({
      adId: "ad-1",
      businessId: "b-1",
      amount: 500,
      orderId: "pay-1",
    });

    expect(response.status).toBe(201);
    const insert = state.builders.payments.calls.find(
      (call) => call.name === "insert",
    );
    expect(insert.args[0]).toMatchObject({
      ad_id: "ad-1",
      business_id: "b-1",
      amount: 500,
      reference: "pay-1",
      payment_method: "payfast",
    });
  });

  it("verifies a notification by order id", async () => {
    state.tables.payments = {
      data: [{ id: "pay-1", reference: "pay-1" }],
      error: null,
      count: 1,
    };

    const response = await verifyPayment({ m_payment_id: "pay-1" });

    expect(response.status).toBe(200);
    expect(response.data.verified).toBe(true);
    expect(response.data.payment.id).toBe("pay-1");
  });

  it("reports a notification without an order id", async () => {
    await expect(verifyPayment({})).rejects.toThrow(
      "Payment notification is missing its order id",
    );
  });

  it("reads the payment status by order id", async () => {
    state.tables.payments = {
      data: [{ id: "pay-1", reference: "pay-1", status: "paid" }],
      error: null,
      count: 1,
    };

    const response = await getPaymentStatus("pay-1");

    expect(response.status).toBe(200);
    expect(response.data.status).toBe("paid");
  });
});
