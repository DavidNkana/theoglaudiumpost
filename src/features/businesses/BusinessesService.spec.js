// src/features/businesses/BusinessesService.spec.js
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
  getBusinesses,
  getAds,
  getCampaigns,
  getBusiness,
  createBusiness,
  editBusiness,
  removeBusiness,
  register,
  getPayments,
  BusinessesService,
  businessesService,
} from "@/features/businesses/BusinessesService";
import defaultExport from "@/features/businesses/BusinessesService";
import { BaseService } from "@/shared/services/BaseService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBusinesses", () => {
  it("uses provided values for every param", () => {
    const resp = { data: [] };
    api.get.mockReturnValue(resp);

    const result = getBusinesses({
      type: "ad",
      page: 3,
      size: 25,
      search: "shoes",
      category: "retail",
      status: "active",
    });

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(
      "businesses?type=ad&search=shoes&category=retail&status=active&size=25&page=3"
    );
    expect(result).toBe(resp);
  });

  it("falls back to default values when called with an empty object", () => {
    api.get.mockReturnValue("default-resp");

    const result = getBusinesses({});

    expect(api.get).toHaveBeenCalledWith(
      "businesses?type=&search=&category=&status=&size=10&page=0"
    );
    expect(result).toBe("default-resp");
  });
});

describe("getAds", () => {
  it("calls the ads endpoint regardless of id", () => {
    api.get.mockReturnValue("ads");
    expect(getAds(42)).toBe("ads");
    expect(api.get).toHaveBeenCalledWith("businesses/ads");
  });

  it("works when called without an id", () => {
    api.get.mockReturnValue("ads");
    expect(getAds()).toBe("ads");
    expect(api.get).toHaveBeenCalledWith("businesses/ads");
  });
});

describe("getCampaigns", () => {
  it("calls the campaigns endpoint regardless of id", () => {
    api.get.mockReturnValue("campaigns");
    expect(getCampaigns(7)).toBe("campaigns");
    expect(api.get).toHaveBeenCalledWith("businesses/campaigns");
  });

  it("works when called without an id", () => {
    api.get.mockReturnValue("campaigns");
    expect(getCampaigns()).toBe("campaigns");
    expect(api.get).toHaveBeenCalledWith("businesses/campaigns");
  });
});

describe("getBusiness", () => {
  it("requests a single business by id", () => {
    api.get.mockReturnValue("one");
    expect(getBusiness(99)).toBe("one");
    expect(api.get).toHaveBeenCalledWith("businesses/99");
  });
});

describe("createBusiness", () => {
  it("posts to the create endpoint with data", () => {
    const data = { name: "Acme" };
    api.post.mockReturnValue("created");
    expect(createBusiness(data)).toBe("created");
    expect(api.post).toHaveBeenCalledWith("businesses/create", data);
  });
});

describe("editBusiness", () => {
  it("puts data to the business id endpoint", () => {
    const data = { name: "New" };
    api.put.mockReturnValue("edited");
    expect(editBusiness(5, data)).toBe("edited");
    expect(api.put).toHaveBeenCalledWith("businesses/5", data);
  });
});

describe("removeBusiness", () => {
  it("deletes a business by id", () => {
    api.delete.mockReturnValue("removed");
    expect(removeBusiness(8)).toBe("removed");
    expect(api.delete).toHaveBeenCalledWith("businesses/8");
  });
});

describe("register", () => {
  it("posts to the create endpoint with data", () => {
    const data = { email: "a@b.c" };
    api.post.mockReturnValue("registered");
    expect(register(data)).toBe("registered");
    expect(api.post).toHaveBeenCalledWith("businesses/create", data);
  });
});

describe("getPayments", () => {
  it("uses provided values for every param", () => {
    api.get.mockReturnValue("payments");

    const result = getPayments({
      businessId: 12,
      page: 2,
      size: 50,
      search: "invoice",
      status: "paid",
    });

    expect(result).toBe("payments");
    expect(api.get).toHaveBeenCalledWith(
      "businesses/payments?businessId=12&search=invoice&status=paid&size=50&page=2"
    );
  });

  it("falls back to default values when called with an empty object", () => {
    api.get.mockReturnValue("payments-default");

    const result = getPayments({});

    expect(result).toBe("payments-default");
    expect(api.get).toHaveBeenCalledWith(
      "businesses/payments?businessId=0&search=&status=&size=10&page=0"
    );
  });
});

describe("rejected (catch) paths via the API boundary", () => {
  it("getBusinesses rejects when api.get rejects", async () => {
    const err = new Error("network");
    api.get.mockRejectedValue(err);
    await expect(getBusinesses({})).rejects.toThrow("network");
  });

  it("createBusiness rejects when api.post rejects", async () => {
    api.post.mockRejectedValue(new Error("post-fail"));
    await expect(createBusiness({})).rejects.toThrow("post-fail");
  });

  it("editBusiness rejects when api.put rejects", async () => {
    api.put.mockRejectedValue(new Error("put-fail"));
    await expect(editBusiness(1, {})).rejects.toThrow("put-fail");
  });

  it("removeBusiness rejects when api.delete rejects", async () => {
    api.delete.mockRejectedValue(new Error("delete-fail"));
    await expect(removeBusiness(1)).rejects.toThrow("delete-fail");
  });
});

describe("BusinessesService class", () => {
  it("extends BaseService and sets the businesses resource", () => {
    const service = new BusinessesService();
    expect(service).toBeInstanceOf(BaseService);
    expect(service).toBeInstanceOf(BusinessesService);
    expect(service.resource).toBe("businesses");
    expect(service.api).toBe(api);
  });

  it("exposes the domain functions as prototype methods", () => {
    expect(BusinessesService.prototype.getBusinesses).toBe(getBusinesses);
    expect(BusinessesService.prototype.getAds).toBe(getAds);
    expect(BusinessesService.prototype.getCampaigns).toBe(getCampaigns);
    expect(BusinessesService.prototype.getBusiness).toBe(getBusiness);
    expect(BusinessesService.prototype.createBusiness).toBe(createBusiness);
    expect(BusinessesService.prototype.editBusiness).toBe(editBusiness);
    expect(BusinessesService.prototype.removeBusiness).toBe(removeBusiness);
    expect(BusinessesService.prototype.register).toBe(register);
    expect(BusinessesService.prototype.getPayments).toBe(getPayments);
  });
});

describe("businessesService singleton", () => {
  it("is a BusinessesService instance and the default export", () => {
    expect(businessesService).toBeInstanceOf(BusinessesService);
    expect(defaultExport).toBe(businessesService);
  });

  it("can invoke a domain method through the singleton instance", () => {
    api.get.mockReturnValue("via-singleton");

    const result = businessesService.getBusiness(123);

    expect(result).toBe("via-singleton");
    expect(api.get).toHaveBeenCalledWith("businesses/123");
  });

  it("can invoke an inherited BaseService method through the singleton", () => {
    api.get.mockReturnValue("listed");

    const result = businessesService.list({ page: 1 });

    expect(result).toBe("listed");
    expect(api.get).toHaveBeenCalledWith("/businesses", {
      params: { page: 1 },
    });
  });
});
