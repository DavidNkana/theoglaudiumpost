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
  getAnnouncements,
  getAnnouncement,
  getAnnouncementBySlug,
  createAnnouncement,
  editAnnouncement,
  removeAnnouncement,
  getCategories,
  createCategory,
  editCategory,
  changeCategoryStatus,
  removeCategory,
  AnnouncementsService,
  announcementsService,
} from "@/features/announcements/AnnouncementsService";
import announcementsServiceDefault from "@/features/announcements/AnnouncementsService";
import { BaseService } from "@/shared/services/BaseService";

describe("AnnouncementsService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getAnnouncements()", () => {
    it("uses default options when called with an empty object", () => {
      api.get.mockReturnValue("RESP");
      const result = getAnnouncements({});
      expect(api.get).toHaveBeenCalledWith(
        "notices?priority=&search=&category=&status=&size=10&page=0&excludeFunerals=true"
      );
      expect(result).toBe("RESP");
    });

    it("forwards every provided option (including excludeFunerals=false)", () => {
      api.get.mockReturnValue("RESP2");
      const result = getAnnouncements({
        page: 3,
        size: 25,
        search: "covid",
        priority: "high",
        category: "cat-1",
        status: "published",
        excludeFunerals: false,
      });
      expect(api.get).toHaveBeenCalledWith(
        "notices?priority=high&search=covid&category=cat-1&status=published&size=25&page=3&excludeFunerals=false"
      );
      expect(result).toBe("RESP2");
    });
  });

  it("getAnnouncement() requests a single notice by id", () => {
    api.get.mockReturnValue("ONE");
    expect(getAnnouncement(42)).toBe("ONE");
    expect(api.get).toHaveBeenCalledWith("notices/42");
  });

  it("getAnnouncementBySlug() requests a notice by slug", () => {
    api.get.mockReturnValue("SLUG");
    expect(getAnnouncementBySlug("hello-world")).toBe("SLUG");
    expect(api.get).toHaveBeenCalledWith("notices/slug/hello-world");
  });

  it("createAnnouncement() posts to the create endpoint", () => {
    api.post.mockReturnValue("CREATED");
    const payload = { title: "x" };
    expect(createAnnouncement(payload)).toBe("CREATED");
    expect(api.post).toHaveBeenCalledWith("notices/create", payload);
  });

  it("editAnnouncement() puts to the id endpoint", () => {
    api.put.mockReturnValue("EDITED");
    const payload = { title: "y" };
    expect(editAnnouncement(7, payload)).toBe("EDITED");
    expect(api.put).toHaveBeenCalledWith("notices/7", payload);
  });

  it("removeAnnouncement() deletes the id endpoint", () => {
    api.delete.mockReturnValue("DELETED");
    expect(removeAnnouncement(9)).toBe("DELETED");
    expect(api.delete).toHaveBeenCalledWith("notices/9");
  });

  describe("getCategories()", () => {
    it("omits the status param when status is falsy (default null)", () => {
      api.get.mockReturnValue("CATS");
      const result = getCategories({});
      expect(api.get).toHaveBeenCalledWith(
        "notices/categories?search=&size=10&page=0"
      );
      expect(result).toBe("CATS");
    });

    it("includes the status param when status is provided", () => {
      api.get.mockReturnValue("CATS2");
      const result = getCategories({
        page: 2,
        size: 5,
        search: "term",
        status: "active",
      });
      expect(api.get).toHaveBeenCalledWith(
        "notices/categories?search=term&status=active&size=5&page=2"
      );
      expect(result).toBe("CATS2");
    });
  });

  it("createCategory() posts to the categories endpoint", () => {
    api.post.mockReturnValue("CAT_CREATED");
    const payload = { name: "News" };
    expect(createCategory(payload)).toBe("CAT_CREATED");
    expect(api.post).toHaveBeenCalledWith("notices/categories", payload);
  });

  it("editCategory() puts to the category id endpoint", () => {
    api.put.mockReturnValue("CAT_EDITED");
    const payload = { name: "Updated" };
    expect(editCategory(3, payload)).toBe("CAT_EDITED");
    expect(api.put).toHaveBeenCalledWith("notices/categories/3", payload);
  });

  it("changeCategoryStatus() puts to the change-status endpoint", () => {
    api.put.mockReturnValue("STATUS_CHANGED");
    const payload = { status: "inactive" };
    expect(changeCategoryStatus(4, payload)).toBe("STATUS_CHANGED");
    expect(api.put).toHaveBeenCalledWith(
      "notices/categories/4/change-status",
      payload
    );
  });

  it("removeCategory() deletes the category id endpoint", () => {
    api.delete.mockReturnValue("CAT_DELETED");
    expect(removeCategory(6)).toBe("CAT_DELETED");
    expect(api.delete).toHaveBeenCalledWith("notices/categories/6");
  });

  describe("AnnouncementsService class & singleton", () => {
    it("constructs with the 'notices' resource and extends BaseService", () => {
      const svc = new AnnouncementsService();
      expect(svc).toBeInstanceOf(BaseService);
      expect(svc.resource).toBe("notices");
      expect(svc.api).toBe(api);
    });

    it("exposes the domain functions as instance methods", () => {
      const svc = new AnnouncementsService();
      api.get.mockReturnValue("SLUG_VIA_INSTANCE");
      expect(svc.getAnnouncementBySlug("abc")).toBe("SLUG_VIA_INSTANCE");
      expect(api.get).toHaveBeenCalledWith("notices/slug/abc");
    });

    it("inherits BaseService default verbs", () => {
      api.get.mockReturnValue("LIST");
      expect(announcementsService.list({ q: 1 })).toBe("LIST");
      expect(api.get).toHaveBeenCalledWith("/notices", { params: { q: 1 } });
    });

    it("singleton delegates a domain method through the prototype", () => {
      api.get.mockReturnValue("SINGLETON");
      expect(announcementsService.getAnnouncement(11)).toBe("SINGLETON");
      expect(api.get).toHaveBeenCalledWith("notices/11");
    });

    it("default export is the singleton instance", () => {
      expect(announcementsServiceDefault).toBe(announcementsService);
      expect(announcementsServiceDefault).toBeInstanceOf(AnnouncementsService);
    });
  });
});
