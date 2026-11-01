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
  getBusinesses,
  getBusiness,
  getBusinessAds,
  createBusiness,
  editBusiness,
  removeBusiness,
  register,
  getAds,
  getCampaigns,
  getPayments,
} from "@/features/businesses/BusinessesService.js";

describe("features/businesses/BusinessesService", () => {
  beforeEach(reset);

  it("lists directory businesses", async () => {
    state.tables.businesses = { data: [{ id: "b1", name: "Spar" }], error: null, count: 1 };

    const response = await getBusinesses({ size: 10 });

    expect(response.status).toBe(200);
    expect(response.data.businesses).toHaveLength(1);
  });

  it("searches businesses by name", async () => {
    state.tables.businesses = { data: [], error: null, count: 0 };

    await getBusinesses({ search: "spar" });

    expect(callsTo(state.builders.businesses, "or")[0].args[0]).toContain(
      "name.ilike.%spar%",
    );
  });

  it("fetches a single business", async () => {
    state.tables.businesses = { data: { id: "b1", name: "Spar" }, error: null };

    const response = await getBusiness("b1");

    expect(response.data.name).toBe("Spar");
  });

  it("lists the ads of a business", async () => {
    state.tables.ads = { data: [{ id: "ad1" }], error: null };

    const response = await getBusinessAds("b1");

    expect(response.data).toHaveLength(1);
  });

  it("creates a business", async () => {
    state.tables.businesses = { data: { id: "b1", name: "Spar" }, error: null };

    const response = await createBusiness({ name: "Spar" });

    expect(response.status).toBe(201);
  });

  it("updates a business", async () => {
    state.tables.businesses = { data: { id: "b1", name: "Spar" }, error: null };

    const response = await editBusiness("b1", { name: "Spar" });

    expect(response.status).toBe(200);
  });

  it("removes a business", async () => {
    state.tables.businesses = { data: null, error: null };

    const response = await removeBusiness("b1");

    expect(response.status).toBe(200);
  });

  it("registers a business account", async () => {
    state.session = { access_token: "token" };
    state.user = { id: "u1", email: "a@b.co" };
    state.tables.profiles = { data: { id: "u1" }, error: null };

    const response = await register({ email: "a@b.co", password: "secret" });

    expect(response.status).toBe(201);
    expect(response.data.role.name).toBe("business");
  });

  it("refuses to register without an email and password", async () => {
    await expect(register({})).rejects.toThrow(
      "Email and password are required",
    );
  });

  it("lists the ads of the signed-in business", async () => {
    state.session = { access_token: "token", user: { id: "u1" } };
    state.tables.ads = { data: [{ id: "ad1" }], error: null, count: 1 };

    const response = await getAds({ size: 10 });

    expect(response.data).toHaveLength(1);
    expect(callsTo(state.builders.ads, "eq")[0].args).toEqual([
      "business_id",
      "u1",
    ]);
  });

  it("returns no ads when nobody is signed in", async () => {
    const response = await getAds({});

    expect(response.data).toEqual([]);
  });

  it("lists the campaigns of the signed-in business", async () => {
    state.session = { access_token: "token", user: { id: "u1" } };
    state.tables.campaigns = { data: [{ id: "c1" }], error: null, count: 1 };

    const response = await getCampaigns({});

    expect(response.data).toHaveLength(1);
  });

  it("lists the payments of the signed-in business", async () => {
    state.session = { access_token: "token", user: { id: "u1" } };
    state.tables.payments = { data: [{ id: "pay1" }], error: null, count: 1 };

    const response = await getPayments({ size: 10 });

    expect(response.data.payments).toHaveLength(1);
    expect(response.data.page).toBe(0);
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};
