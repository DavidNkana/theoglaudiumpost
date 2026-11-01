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
  getCampaigns,
  getCampaign,
  createCampaign,
  editCampaign,
  deleteCampaign,
} from "@/features/ads/CampaignService.js";

describe("features/ads/CampaignService", () => {
  beforeEach(reset);

  it("lists campaigns with pagination info", async () => {
    state.tables.campaigns = { data: [{ id: "c1", name: "Winter" }], error: null, count: 1 };

    const response = await getCampaigns({ size: 10 });

    expect(response.status).toBe(200);
    expect(response.data.campaigns).toHaveLength(1);
    expect(response.data.total).toBe(1);
  });

  it("filters campaigns by status", async () => {
    state.tables.campaigns = { data: [], error: null, count: 0 };

    await getCampaigns({ status: "active" });

    expect(callsTo(state.builders.campaigns, "eq")[0].args).toEqual(["status", "active"]);
  });

  it("fetches a single campaign", async () => {
    state.tables.campaigns = { data: { id: "c1", name: "Winter" }, error: null };

    const response = await getCampaign("c1");

    expect(response.data.name).toBe("Winter");
  });

  it("creates a campaign", async () => {
    state.tables.campaigns = { data: { id: "c1", name: "Winter" }, error: null };

    const response = await createCampaign({ name: "Winter" });

    expect(response.status).toBe(201);
    expect(callsTo(state.builders.campaigns, "insert")[0].args[0]).toMatchObject({
      name: "Winter",
      status: "active",
    });
  });

  it("updates a campaign", async () => {
    state.tables.campaigns = { data: { id: "c1", name: "Winter" }, error: null };

    const response = await editCampaign("c1", { name: "Winter" });

    expect(response.status).toBe(200);
  });

  it("deletes a campaign", async () => {
    state.tables.campaigns = { data: null, error: null };

    const response = await deleteCampaign("c1");

    expect(response.status).toBe(200);
  });

  it("rejects when the query fails", async () => {
    state.tables.campaigns = { data: null, error: { message: "denied" } };

    await expect(getCampaigns({})).rejects.toThrow("denied");
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};
