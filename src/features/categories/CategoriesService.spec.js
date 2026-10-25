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
  getCategories,
  getCategory,
  getCategoryBySlug,
  getCategoryArticles,
  createCategory,
  editCategory,
  removeCategory,
  CategoriesService,
  categoriesService,
} from "@/features/categories/CategoriesService";

describe("CategoriesService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getCategories()", () => {
    it("uses the default args (empty search) when called with no args", () => {
      api.get.mockReturnValue("R");
      expect(getCategories()).toBe("R");
      expect(api.get).toHaveBeenCalledWith("/categories?search=");
    });

    it("forwards the provided search term", () => {
      api.get.mockReturnValue("R");
      expect(getCategories("news", "2", "foo", "cat")).toBe("R");
      expect(api.get).toHaveBeenCalledWith("/categories?search=foo");
    });
  });

  it("getCategory() requests a single category by id", () => {
    api.get.mockReturnValue("R");
    expect(getCategory(42)).toBe("R");
    expect(api.get).toHaveBeenCalledWith("/categories/42");
  });

  it("getCategoryBySlug() requests a category by slug", () => {
    api.get.mockReturnValue("R");
    expect(getCategoryBySlug("my-slug")).toBe("R");
    expect(api.get).toHaveBeenCalledWith("/categories/slug/my-slug");
  });

  describe("getCategoryArticles()", () => {
    it("uses the default page when page is omitted", () => {
      api.get.mockReturnValue("R");
      expect(getCategoryArticles("my-slug", { size: 10 })).toBe("R");
      expect(api.get).toHaveBeenCalledWith(
        "/categories/my-slug/articles?page=0&size=10"
      );
    });

    it("forwards an explicit page and size", () => {
      api.get.mockReturnValue("R");
      expect(getCategoryArticles("my-slug", { page: "3", size: 20 })).toBe("R");
      expect(api.get).toHaveBeenCalledWith(
        "/categories/my-slug/articles?page=3&size=20"
      );
    });
  });

  it("createCategory() posts to the create endpoint with the payload", () => {
    api.post.mockReturnValue("R");
    const data = { name: "Sport" };
    expect(createCategory(data)).toBe("R");
    expect(api.post).toHaveBeenCalledWith("/categories/create", data);
  });

  it("editCategory() puts the payload to the id endpoint", () => {
    api.put.mockReturnValue("R");
    const data = { name: "Sport" };
    expect(editCategory(7, data)).toBe("R");
    expect(api.put).toHaveBeenCalledWith("/categories/7", data);
  });

  it("removeCategory() deletes the id endpoint", () => {
    api.delete.mockReturnValue("R");
    expect(removeCategory(7)).toBe("R");
    expect(api.delete).toHaveBeenCalledWith("/categories/7");
  });

  describe("CategoriesService class", () => {
    it("constructs with the 'categories' resource", () => {
      const svc = new CategoriesService();
      expect(svc.resource).toBe("categories");
      expect(svc.api).toBe(api);
    });

    it("exposes the domain functions as prototype methods", () => {
      api.get.mockReturnValue("R");
      expect(CategoriesService.prototype.getCategories).toBe(getCategories);
      expect(categoriesService.getCategory(5)).toBe("R");
      expect(api.get).toHaveBeenCalledWith("/categories/5");
    });

    it("singleton delegates getCategories via the prototype method", () => {
      api.get.mockReturnValue("R");
      expect(categoriesService.getCategories()).toBe("R");
      expect(api.get).toHaveBeenCalledWith("/categories?search=");
    });

    it("is a singleton instance of CategoriesService", () => {
      expect(categoriesService).toBeInstanceOf(CategoriesService);
    });
  });
});
