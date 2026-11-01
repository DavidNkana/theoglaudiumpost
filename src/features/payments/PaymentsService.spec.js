import { describe, it, expect, vi, beforeEach } from "vitest";
import { callsTo } from "../../../tests/helpers/supabaseMock.js";

const state = vi.hoisted(() => ({
  tables: {},
  builders: {},
  session: null,
  user: null,
}));

vi.mock("@/services/supabase.js", async () => {
  const { buildSupabaseModule } = await import(
    "../../../tests/helpers/supabaseModuleMock.js"
  );
  return buildSupabaseModule(state);
});

import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  removePayment,
  updatePaymentStatus,
  getReceiptPdf,
} from "@/features/payments/PaymentsService.js";

describe("features/payments/PaymentsService", () => {
  beforeEach(reset);

  it("lists payments with pagination info", async () => {
    state.tables.payments = { data: [{ id: "pay1" }], error: null, count: 1 };

    const response = await getPayments({ size: 10 });

    expect(response.status).toBe(200);
    expect(response.data.payments).toHaveLength(1);
    expect(response.data.totalPages).toBe(1);
  });

  it("filters payments by business", async () => {
    state.tables.payments = { data: [], error: null, count: 0 };

    await getPayments({ businessId: "b1" });

    expect(callsTo(state.builders.payments, "eq")[0].args).toEqual([
      "business_id",
      "b1",
    ]);
  });

  it("fetches a single payment", async () => {
    state.tables.payments = { data: { id: "pay1" }, error: null };

    const response = await getPayment("pay1");

    expect(response.data.id).toBe("pay1");
  });

  it("records a payment", async () => {
    state.tables.payments = { data: { id: "pay1" }, error: null };

    const response = await createPayment({ amount: 500 });

    expect(response.status).toBe(201);
    expect(callsTo(state.builders.payments, "insert")[0].args[0]).toMatchObject({
      amount: 500,
      status: "pending",
      currency: "ZAR",
    });
  });

  it("updates a payment", async () => {
    state.tables.payments = { data: { id: "pay1" }, error: null };

    const response = await updatePayment("pay1", { amount: 500 });

    expect(response.status).toBe(200);
  });

  it("removes a payment", async () => {
    state.tables.payments = { data: null, error: null };

    const response = await removePayment("pay1");

    expect(response.status).toBe(200);
  });

  it("marks a payment as paid and stamps the time", async () => {
    state.tables.payments = { data: { id: "pay1" }, error: null };

    const response = await updatePaymentStatus("pay1", "paid");

    expect(response.status).toBe(200);
    const update = callsTo(state.builders.payments, "update")[0];
    expect(update.args[0].status).toBe("paid");
    expect(update.args[0].paid_at).toBeTruthy();
  });

  it("reports a missing receipt", async () => {
    state.tables.payments = { data: { id: "pay1" }, error: null };

    await expect(getReceiptPdf("pay1")).rejects.toThrow(
      "No receipt available for this payment",
    );
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};
