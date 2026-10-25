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
  getCampaigns,
  getCampaign,
  createCampaign,
  editCampaign,
  deleteCampaign,
  CampaignService,
  campaignService,
} from "@/features/ads/CampaignService";
import campaignServiceDefault from "@/features/ads/CampaignService";
import { BaseService } from "@/shared/services/BaseService";

describe("CampaignService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getCampaigns() with no args uses all default params", () => {
    api.get.mockReturnValue("resp");
    const result = getCampaigns();
    expect(api.get).toHaveBeenCalledWith(
      "campaigns?search=&status=&payment_status=&size=100&page=0"
    );
    expect(result).toBe("resp");
  });

  it("getCampaigns() with explicit params overrides every default", () => {
    api.get.mockReturnValue("resp2");
    const result = getCampaigns({
      page: 3,
      size: 25,
      search: "deal",
      status: "active",
      payment_status: "paid",
    });
    expect(api.get).toHaveBeenCalledWith(
      "campaigns?search=deal&status=active&payment_status=paid&size=25&page=3"
    );
    expect(result).toBe("resp2");
  });

  it("getCampaign() requests a single campaign by id", () => {
    api.get.mockReturnValue("one");
    expect(getCampaign(42)).toBe("one");
    expect(api.get).toHaveBeenCalledWith("campaigns/42");
  });

  it("createCampaign() posts to the create endpoint with the payload", () => {
    api.post.mockReturnValue("created");
    const payload = { name: "Spring" };
    expect(createCampaign(payload)).toBe("created");
    expect(api.post).toHaveBeenCalledWith("campaigns/create", payload);
  });

  it("editCampaign() puts the payload to the id endpoint", () => {
    api.put.mockReturnValue("edited");
    const payload = { name: "Renamed" };
    expect(editCampaign(7, payload)).toBe("edited");
    expect(api.put).toHaveBeenCalledWith("campaigns/7", payload);
  });

  it("deleteCampaign() deletes the id endpoint", () => {
    api.delete.mockReturnValue("deleted");
    expect(deleteCampaign(9)).toBe("deleted");
    expect(api.delete).toHaveBeenCalledWith("campaigns/9");
  });

  it("CampaignService extends BaseService and uses the 'campaigns' resource", () => {
    const svc = new CampaignService();
    expect(svc).toBeInstanceOf(BaseService);
    expect(svc.resource).toBe("campaigns");
    expect(svc.api).toBe(api);
  });

  it("campaignService singleton is an instance and is the default export", () => {
    expect(campaignService).toBeInstanceOf(CampaignService);
    expect(campaignServiceDefault).toBe(campaignService);
  });

  it("singleton exposes the domain functions as instance methods", () => {
    api.get.mockReturnValue("via-instance");
    const result = campaignService.getCampaigns({ page: 1 });
    expect(result).toBe("via-instance");
    expect(api.get).toHaveBeenCalledWith(
      "campaigns?search=&status=&payment_status=&size=100&page=1"
    );

    api.get.mockReturnValue("get-one");
    expect(campaignService.getCampaign(5)).toBe("get-one");
    expect(api.get).toHaveBeenCalledWith("campaigns/5");

    api.post.mockReturnValue("post-one");
    expect(campaignService.createCampaign({ a: 1 })).toBe("post-one");
    expect(api.post).toHaveBeenCalledWith("campaigns/create", { a: 1 });

    api.put.mockReturnValue("put-one");
    expect(campaignService.editCampaign(2, { b: 2 })).toBe("put-one");
    expect(api.put).toHaveBeenCalledWith("campaigns/2", { b: 2 });

    api.delete.mockReturnValue("del-one");
    expect(campaignService.deleteCampaign(3)).toBe("del-one");
    expect(api.delete).toHaveBeenCalledWith("campaigns/3");
  });

  it("inherited BaseService verbs still work on the singleton", () => {
    api.get.mockReturnValue("list-resp");
    expect(campaignService.list({ q: 1 })).toBe("list-resp");
    expect(api.get).toHaveBeenCalledWith("/campaigns", { params: { q: 1 } });
  });
});
