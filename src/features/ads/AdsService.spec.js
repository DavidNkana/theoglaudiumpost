import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "@/services/api";
import {
  getAdByPlacement,
  getAdByPlacementAndTags,
  getAllAdByPlacement,
  trackClick,
  trackImpression,
  getAds,
  getAd,
  createAd,
  editAd,
  removeAd,
  getCampaigns,
  createCampaign,
  editCampaign,
  removeCampaign,
  getPlacements,
  getAdPlacements,
  getAdPlacement,
  createAdPlacement,
  editAdPlacement,
  removeAdPlacement,
  AdsService,
  adsService,
} from "@/features/ads/AdsService";
import adsServiceDefault from "@/features/ads/AdsService";
import { BaseService } from "@/shared/services/BaseService";

describe("AdsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getAdByPlacement() GETs the placement endpoint", () => {
    const res = { data: 1 };
    api.get.mockReturnValue(res);
    expect(getAdByPlacement("home_banner")).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ads/placement/home_banner");
  });

  it("getAdByPlacementAndTags() POSTs tags to the placement endpoint", () => {
    const res = { data: 2 };
    const tags = ["a", "b"];
    api.post.mockReturnValue(res);
    expect(getAdByPlacementAndTags("home_banner", tags)).toBe(res);
    expect(api.post).toHaveBeenCalledWith("/ads/placement/home_banner", tags);
  });

  it("getAllAdByPlacement() GETs the all-placement endpoint", () => {
    const res = { data: 3 };
    api.get.mockReturnValue(res);
    expect(getAllAdByPlacement("sidebar")).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ads/placement/sidebar/all");
  });

  it("trackClick() PUTs the click endpoint", () => {
    const res = { data: 4 };
    api.put.mockReturnValue(res);
    expect(trackClick(42)).toBe(res);
    expect(api.put).toHaveBeenCalledWith("/ads/42/click");
  });

  it("trackImpression() PUTs the impression endpoint", () => {
    const res = { data: 5 };
    api.put.mockReturnValue(res);
    expect(trackImpression("99")).toBe(res);
    expect(api.put).toHaveBeenCalledWith("/ads/99/impression");
  });

  it("getAds() applies default options when called with empty object", () => {
    const res = { data: 6 };
    api.get.mockReturnValue(res);
    expect(getAds({})).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ads", {
      params: { search: "", placement: "", status: "", size: 10, page: 0 },
    });
  });

  it("getAds() forwards all provided options", () => {
    const res = { data: 7 };
    api.get.mockReturnValue(res);
    expect(
      getAds({
        page: 2,
        size: 25,
        search: "q",
        status: "active",
        placement: "home",
      })
    ).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ads", {
      params: {
        search: "q",
        placement: "home",
        status: "active",
        size: 25,
        page: 2,
      },
    });
  });

  it("getAd() GETs a single ad by id", () => {
    const res = { data: 8 };
    api.get.mockReturnValue(res);
    expect(getAd(11)).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ads/11");
  });

  it("createAd() POSTs to the create endpoint", () => {
    const res = { data: 9 };
    const data = { title: "x" };
    api.post.mockReturnValue(res);
    expect(createAd(data)).toBe(res);
    expect(api.post).toHaveBeenCalledWith("/ads/create", data);
  });

  it("editAd() PUTs to the ad id endpoint", () => {
    const res = { data: 10 };
    const data = { title: "y" };
    api.put.mockReturnValue(res);
    expect(editAd(3, data)).toBe(res);
    expect(api.put).toHaveBeenCalledWith("/ads/3", data);
  });

  it("removeAd() DELETEs the ad id endpoint", () => {
    const res = { data: 11 };
    api.delete.mockReturnValue(res);
    expect(removeAd(3)).toBe(res);
    expect(api.delete).toHaveBeenCalledWith("/ads/3");
  });

  it("getCampaigns() uses defaults when called with no args", () => {
    const res = { data: 12 };
    api.get.mockReturnValue(res);
    expect(getCampaigns()).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/campaigns?search=");
  });

  it("getCampaigns() uses provided args", () => {
    const res = { data: 13 };
    api.get.mockReturnValue(res);
    expect(getCampaigns("active", "1", "term", "cat")).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/campaigns?search=term");
  });

  it("createCampaign() POSTs to the campaigns create endpoint", () => {
    const res = { data: 14 };
    const data = { name: "c" };
    api.post.mockReturnValue(res);
    expect(createCampaign(data)).toBe(res);
    expect(api.post).toHaveBeenCalledWith("/campaigns/create", data);
  });

  it("editCampaign() PUTs to the campaign id endpoint", () => {
    const res = { data: 15 };
    const data = { name: "d" };
    api.put.mockReturnValue(res);
    expect(editCampaign(7, data)).toBe(res);
    expect(api.put).toHaveBeenCalledWith("/campaigns/7", data);
  });

  it("removeCampaign() DELETEs the campaign id endpoint", () => {
    const res = { data: 16 };
    api.delete.mockReturnValue(res);
    expect(removeCampaign(7)).toBe(res);
    expect(api.delete).toHaveBeenCalledWith("/campaigns/7");
  });

  it("getPlacements() GETs the placements list endpoint", () => {
    const res = { data: 17 };
    api.get.mockReturnValue(res);
    expect(getPlacements()).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ads/placements");
  });

  it("getAdPlacements() applies defaults with empty object", () => {
    const res = { data: 18 };
    api.get.mockReturnValue(res);
    expect(getAdPlacements({})).toBe(res);
    expect(api.get).toHaveBeenCalledWith(
      "/ad-placements?search=&status=&size=10&page=0"
    );
  });

  it("getAdPlacements() forwards provided options", () => {
    const res = { data: 19 };
    api.get.mockReturnValue(res);
    expect(
      getAdPlacements({ page: "3", size: "50", search: "s", status: "active" })
    ).toBe(res);
    expect(api.get).toHaveBeenCalledWith(
      "/ad-placements?search=s&status=active&size=50&page=3"
    );
  });

  it("getAdPlacement() GETs a single placement by id", () => {
    const res = { data: 20 };
    api.get.mockReturnValue(res);
    expect(getAdPlacement(5)).toBe(res);
    expect(api.get).toHaveBeenCalledWith("/ad-placements/5");
  });

  it("createAdPlacement() POSTs to the create endpoint", () => {
    const res = { data: 21 };
    const data = { key: "k" };
    api.post.mockReturnValue(res);
    expect(createAdPlacement(data)).toBe(res);
    expect(api.post).toHaveBeenCalledWith("/ad-placements/create", data);
  });

  it("editAdPlacement() PUTs to the placement id endpoint", () => {
    const res = { data: 22 };
    const data = { key: "k2" };
    api.put.mockReturnValue(res);
    expect(editAdPlacement(8, data)).toBe(res);
    expect(api.put).toHaveBeenCalledWith("/ad-placements/8", data);
  });

  it("removeAdPlacement() DELETEs the placement id endpoint", () => {
    const res = { data: 23 };
    api.delete.mockReturnValue(res);
    expect(removeAdPlacement(8)).toBe(res);
    expect(api.delete).toHaveBeenCalledWith("/ad-placements/8");
  });

  describe("AdsService class and singleton", () => {
    it("extends BaseService and sets the 'ads' resource", () => {
      const svc = new AdsService();
      expect(svc).toBeInstanceOf(BaseService);
      expect(svc.resource).toBe("ads");
      expect(svc.api).toBe(api);
    });

    it("exposes the domain functions as instance methods", () => {
      const res = { data: 24 };
      api.get.mockReturnValue(res);
      expect(adsService.getAdByPlacement("home_banner")).toBe(res);
      expect(api.get).toHaveBeenCalledWith("/ads/placement/home_banner");
    });

    it("singleton delegates a put-based method too", () => {
      const res = { data: 25 };
      api.put.mockReturnValue(res);
      expect(adsService.trackClick(1)).toBe(res);
      expect(api.put).toHaveBeenCalledWith("/ads/1/click");
    });

    it("inherits BaseService verbs via the 'ads' resource", () => {
      const res = { data: 26 };
      api.get.mockReturnValue(res);
      expect(adsService.list({ page: 1 })).toBe(res);
      expect(api.get).toHaveBeenCalledWith("/ads", { params: { page: 1 } });
    });

    it("default export is the singleton instance", () => {
      expect(adsServiceDefault).toBe(adsService);
      expect(adsServiceDefault).toBeInstanceOf(AdsService);
    });
  });
});
