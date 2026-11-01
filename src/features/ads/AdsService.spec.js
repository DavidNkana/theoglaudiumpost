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

vi.mock("@/features/media/MediaService.js", () => ({
  uploadDataUrl: vi.fn(async (dataUrl) => ({
    id: "media-1",
    file: "https://cdn.test/ad.png",
    storage_path: "ad/ad.png",
  })),
}));

import {
  getAds,
  getAd,
  getAllAdByPlacement,
  getAdByPlacement,
  createAd,
  editAd,
  removeAd,
  trackClick,
  trackImpression,
  getPlacements,
  getAdPlacements,
  createAdPlacement,
  editAdPlacement,
  removeAdPlacement,
  getCampaigns,
  createCampaign,
  editCampaign,
  removeCampaign,
} from "@/features/ads/AdsService.js";

const AD = {
  id: "ad1",
  title: "Laudium Spar",
  description: "Shop local",
  business_name: "Laudium Spar",
  placement_id: "p1",
  status: "active",
  images: [],
  image_url: null,
  impressions: 0,
  clicks: 0,
};

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

describe("features/ads/AdsService", () => {
  beforeEach(reset);

  describe("getAds", () => {
    it("returns ads with pagination info", async () => {
      state.tables.ads = { data: [AD], error: null, count: 1 };

      const response = await getAds({ size: 10 });

      expect(response.status).toBe(200);
      expect(response.data.ads).toHaveLength(1);
      expect(response.data.totalPages).toBe(1);
    });

    it("exposes the image list as files", async () => {
      state.tables.ads = {
        data: [{ ...AD, images: ["https://cdn.test/a.png"] }],
        error: null,
        count: 1,
      };

      const response = await getAds({});

      expect(response.data.ads[0].files).toEqual(["https://cdn.test/a.png"]);
      expect(response.data.ads[0].image_url).toBe("https://cdn.test/a.png");
    });

    it("resolves a placement name to its id", async () => {
      state.tables.ad_placements = {
        data: [{ id: "p1", name: "news_articles" }],
        error: null,
      };
      state.tables.ads = { data: [], error: null, count: 0 };

      await getAds({ placement: "news_articles" });

      expect(callsTo(state.builders.ads, "eq")[0].args).toEqual([
        "placement_id",
        "p1",
      ]);
    });

    it("searches on title and business name", async () => {
      state.tables.ads = { data: [], error: null, count: 0 };

      await getAds({ search: "spar" });

      const orCall = callsTo(state.builders.ads, "or")[0];
      expect(orCall.args[0]).toContain("title.ilike.%spar%");
    });

    it("rejects when the query fails", async () => {
      state.tables.ads = { data: null, error: { message: "denied" } };

      await expect(getAds({})).rejects.toThrow("denied");
    });
  });

  describe("getAd / getAllAdByPlacement / getAdByPlacement", () => {
    it("fetches a single ad", async () => {
      state.tables.ads = { data: AD, error: null };
      state.tables.ad_placements = { data: null, error: null };

      const response = await getAd("ad1");

      expect(response.status).toBe(200);
      expect(response.data.title).toBe("Laudium Spar");
    });

    it("reports a missing ad as not found", async () => {
      state.tables.ads = { data: null, error: null };

      await expect(getAd("nope")).rejects.toThrow("Ad not found");
    });

    it("returns only ads inside their run window", async () => {
      state.tables.ad_placements = {
        data: [{ id: "p1", name: "news_articles" }],
        error: null,
      };
      state.tables.ads = { data: [AD], error: null };

      const response = await getAllAdByPlacement("news_articles");

      expect(response.data).toHaveLength(1);
      const eqArgs = callsTo(state.builders.ads, "eq").map((call) => call.args);
      expect(eqArgs).toContainEqual(["placement_id", "p1"]);
      expect(eqArgs).toContainEqual(["status", "active"]);
    });

    it("returns a single ad for a placement", async () => {
      state.tables.ad_placements = {
        data: [{ id: "p1", name: "news_articles" }],
        error: null,
      };
      state.tables.ads = { data: [AD, { ...AD, id: "ad2" }], error: null };

      const response = await getAdByPlacement("news_articles");

      expect(response.data.id).toBe("ad1");
    });
  });

  describe("createAd / editAd / removeAd", () => {
    it("creates an ad as a draft by default", async () => {
      state.tables.ads = { data: AD, error: null };

      const response = await createAd({ title: "Laudium Spar" });

      expect(response.status).toBe(201);
      const insert = callsTo(state.builders.ads, "insert")[0];
      expect(insert.args[0]).toMatchObject({ title: "Laudium Spar", status: "draft" });
    });

    it("uploads base64 creatives and stores their URLs", async () => {
      state.tables.ads = { data: AD, error: null };

      await createAd({ title: "Laudium Spar", images: ["data:image/png;base64,AAA"] });

      const insert = callsTo(state.builders.ads, "insert")[0];
      expect(insert.args[0].images).toEqual(["https://cdn.test/ad.png"]);
      expect(insert.args[0].image_url).toBe("https://cdn.test/ad.png");
    });

    it("keeps creatives that are already URLs", async () => {
      state.tables.ads = { data: AD, error: null };

      await createAd({ title: "Laudium Spar", images: ["https://cdn.test/x.png"] });

      const insert = callsTo(state.builders.ads, "insert")[0];
      expect(insert.args[0].images).toEqual(["https://cdn.test/x.png"]);
    });

    it("updates an ad", async () => {
      state.tables.ads = { data: AD, error: null };

      const response = await editAd("ad1", { title: "Updated" });

      expect(response.status).toBe(200);
      expect(callsTo(state.builders.ads, "update")[0].args[0]).toEqual({
        title: "Updated",
      });
    });

    it("removes an ad", async () => {
      state.tables.ads = { data: null, error: null };

      const response = await removeAd("ad1");

      expect(response.status).toBe(200);
      expect(callsTo(state.builders.ads, "delete")).toHaveLength(1);
    });
  });

  describe("tracking", () => {
    it("records a click", async () => {
      const response = await trackClick("ad1");

      expect(response.status).toBe(200);
    });

    it("records an impression", async () => {
      const response = await trackImpression("ad1");

      expect(response.status).toBe(200);
    });
  });

  describe("placements", () => {
    it("lists placements", async () => {
      state.tables.ad_placements = {
        data: [{ id: "p1", name: "news_articles" }],
        error: null,
      };

      const response = await getPlacements();

      expect(response.data).toHaveLength(1);
    });

    it("lists placements with pagination", async () => {
      state.tables.ad_placements = { data: [], error: null, count: 0 };

      const response = await getAdPlacements({ page: "0", size: "10" });

      expect(response.status).toBe(200);
      expect(response.data.total).toBe(0);
    });

    it("creates a placement", async () => {
      state.tables.ad_placements = { data: { id: "p2", name: "new" }, error: null };

      const response = await createAdPlacement({ name: "new" });

      expect(response.status).toBe(201);
    });

    it("updates a placement", async () => {
      state.tables.ad_placements = { data: { id: "p1", name: "x" }, error: null };

      const response = await editAdPlacement("p1", { name: "x" });

      expect(response.status).toBe(200);
    });

    it("removes a placement", async () => {
      state.tables.ad_placements = { data: null, error: null };

      const response = await removeAdPlacement("p1");

      expect(response.status).toBe(200);
    });
  });

  describe("campaigns", () => {
    it("lists campaigns", async () => {
      state.tables.campaigns = { data: [{ id: "c1", name: "Winter" }], error: null };

      const response = await getCampaigns();

      expect(response.data).toHaveLength(1);
    });

    it("creates a campaign", async () => {
      state.tables.campaigns = { data: { id: "c1", name: "Winter" }, error: null };

      const response = await createCampaign({ name: "Winter" });

      expect(response.status).toBe(201);
    });

    it("updates a campaign", async () => {
      state.tables.campaigns = { data: { id: "c1", name: "Winter" }, error: null };

      const response = await editCampaign("c1", { name: "Winter" });

      expect(response.status).toBe(200);
    });

    it("removes a campaign", async () => {
      state.tables.campaigns = { data: null, error: null };

      const response = await removeCampaign("c1");

      expect(response.status).toBe(200);
    });
  });
});
