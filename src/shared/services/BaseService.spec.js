import { describe, it, expect, vi, beforeEach } from "vitest";

// The central HTTP client is the only collaborator; mock it at the boundary.
vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

describe("BaseService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list() GETs /{resource} with the given params", () => {
    new BaseService("articles").list({ page: 1 });
    expect(api.get).toHaveBeenCalledWith("/articles", { params: { page: 1 } });
  });

  it("list() defaults params to an empty object", () => {
    new BaseService("ads").list();
    expect(api.get).toHaveBeenCalledWith("/ads", { params: {} });
  });

  it("get() GETs /{resource}/{id}", () => {
    new BaseService("x").get(5);
    expect(api.get).toHaveBeenCalledWith("/x/5");
  });

  it("create() POSTs /{resource}/create with the payload", () => {
    const payload = { title: "t" };
    new BaseService("x").create(payload);
    expect(api.post).toHaveBeenCalledWith("/x/create", payload);
  });

  it("update() PUTs /{resource}/{id} with the payload", () => {
    const payload = { title: "t" };
    new BaseService("x").update(2, payload);
    expect(api.put).toHaveBeenCalledWith("/x/2", payload);
  });

  it("remove() DELETEs /{resource}/{id}", () => {
    new BaseService("x").remove(3);
    expect(api.delete).toHaveBeenCalledWith("/x/3");
  });

  it("defaults the resource segment to an empty string", () => {
    const svc = new BaseService();
    expect(svc.resource).toBe("");
    expect(svc.api).toBe(api);
  });
});
