import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for store/modules/notices.js.
 *
 * This Vuex module manages community notices/announcements. The only external
 * boundary is the AnnouncementsService (getAnnouncements / getAnnouncementBySlug
 * / getCategories), which is mocked so every action branch — cache hit, success,
 * HTTP-error throw, and catch — can be exercised deterministically.
 *
 * Getters and mutations are plain functions on the exported module object, so we
 * invoke them directly against a fresh state() each test.
 */

vi.mock("@/features/announcements/AnnouncementsService", () => ({
  getAnnouncements: vi.fn(),
  getAnnouncementBySlug: vi.fn(),
  getCategories: vi.fn(),
}));

import {
  getAnnouncements,
  getAnnouncementBySlug,
  getCategories,
} from "@/features/announcements/AnnouncementsService";

import noticesModule from "@/store/modules/notices";

const { state: stateFactory, getters, mutations, actions } = noticesModule;

beforeEach(() => {
  vi.clearAllMocks();
});

function freshState() {
  return stateFactory();
}

describe("module shape", () => {
  it("is a namespaced module exposing state/getters/mutations/actions", () => {
    expect(noticesModule.namespaced).toBe(true);
    expect(typeof noticesModule.state).toBe("function");
    expect(noticesModule.getters).toBeTypeOf("object");
    expect(noticesModule.mutations).toBeTypeOf("object");
    expect(noticesModule.actions).toBeTypeOf("object");
  });

  it("state factory returns a fresh independent object each call", () => {
    const a = freshState();
    const b = freshState();
    expect(a).not.toBe(b);
    expect(a.all.noticesByPage).not.toBe(b.all.noticesByPage);
    expect(a).toEqual({
      page: 0,
      all: {
        noticesByPage: {},
        hasMore: true,
        total: 0,
        totalPages: 0,
        page: 0,
        size: 8,
      },
      funerals: {
        noticesByPage: {},
        hasMore: true,
        total: 0,
        totalPages: 0,
        page: 0,
        size: 8,
      },
      recent: [],
      categories: [],
      error: null,
    });
  });
});

describe("getters", () => {
  it("currentPage returns state.page", () => {
    const s = freshState();
    s.page = 5;
    expect(getters.currentPage(s)).toBe(5);
  });

  it("notices flattens noticesByPage across pages", () => {
    const s = freshState();
    s.all.noticesByPage = { 0: [{ id: 1 }], 1: [{ id: 2 }, { id: 3 }] };
    expect(getters.notices(s)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("funerals flattens funeral noticesByPage across pages", () => {
    const s = freshState();
    s.funerals.noticesByPage = { 0: [{ id: 9 }], 2: [{ id: 10 }] };
    expect(getters.funerals(s)).toEqual([{ id: 9 }, { id: 10 }]);
  });

  describe("categories", () => {
    it("excludes id 14 and any category whose name contains 'funeral' (case-insensitive)", () => {
      const s = freshState();
      s.categories = [
        { id: 1, name: "News" },
        { id: 14, name: "Reserved" }, // excluded by id
        { id: 2, name: "Funeral Notices" }, // excluded by name
        { id: 3, name: "deathFUNERALannounce" }, // excluded by name (mixed case)
        { id: 4, name: "Events" },
      ];
      expect(getters.categories(s)).toEqual([
        { id: 1, name: "News" },
        { id: 4, name: "Events" },
      ]);
    });

    it("keeps a category whose name is missing (optional chaining short-circuits)", () => {
      const s = freshState();
      s.categories = [{ id: 5 }, { id: 6, name: null }];
      // name?.toLowerCase()?.includes(...) is undefined -> !undefined -> true
      expect(getters.categories(s)).toEqual([{ id: 5 }, { id: 6, name: null }]);
    });
  });

  it("recent returns state.recent", () => {
    const s = freshState();
    s.recent = [{ id: 1 }];
    expect(getters.recent(s)).toBe(s.recent);
  });

  describe("uniqueNotices", () => {
    it("deduplicates notices by id (keeps first seen, drops duplicates)", () => {
      const s = freshState();
      const localGetters = {
        notices: [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }],
      };
      const result = getters.uniqueNotices(s, localGetters);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it("returns an empty array when there are no notices", () => {
      const s = freshState();
      expect(getters.uniqueNotices(s, { notices: [] })).toEqual([]);
    });
  });

  describe("relatedNotices", () => {
    it("returns notices in the same category excluding the given id", () => {
      // NOTE: relatedNotices is declared as (getters) => ({id, categoryId}) => ...
      // so the FIRST positional arg it receives is treated as `getters`.
      const localGetters = {
        uniqueNotices: [
          { id: 1, category_id: 10 },
          { id: 2, category_id: 10 },
          { id: 3, category_id: 20 },
        ],
      };
      const fn = getters.relatedNotices(localGetters);
      expect(fn({ id: 1, categoryId: 10 })).toEqual([
        { id: 2, category_id: 10 },
      ]);
    });

    it("optional-chains when uniqueNotices is undefined (returns undefined)", () => {
      const fn = getters.relatedNotices({});
      expect(fn({ id: 1, categoryId: 10 })).toBeUndefined();
    });
  });

  describe("getNoticeBySlugFromStore", () => {
    it("returns the matching notice with non-null content", () => {
      const s = freshState();
      const localGetters = {
        uniqueNotices: [
          { slug: "a", content: null },
          { slug: "b", content: "hello" },
        ],
      };
      const fn = getters.getNoticeBySlugFromStore(s, localGetters);
      expect(fn("b")).toEqual({ slug: "b", content: "hello" });
    });

    it("returns null when slug matches but content is null", () => {
      const s = freshState();
      const localGetters = {
        uniqueNotices: [{ slug: "a", content: null }],
      };
      const fn = getters.getNoticeBySlugFromStore(s, localGetters);
      expect(fn("a")).toBeNull();
    });

    it("returns null when no slug matches", () => {
      const s = freshState();
      const localGetters = {
        uniqueNotices: [{ slug: "a", content: "x" }],
      };
      const fn = getters.getNoticeBySlugFromStore(s, localGetters);
      expect(fn("missing")).toBeNull();
    });

    it("returns null (via optional chaining) when uniqueNotices is undefined", () => {
      const s = freshState();
      const fn = getters.getNoticeBySlugFromStore(s, {});
      expect(fn("a")).toBeNull();
    });
  });

  it("hasMore returns state.all.hasMore", () => {
    const s = freshState();
    s.all.hasMore = false;
    expect(getters.hasMore(s)).toBe(false);
  });

  it("hasMoreFunerals returns state.funerals.hasMore", () => {
    const s = freshState();
    s.funerals.hasMore = false;
    expect(getters.hasMoreFunerals(s)).toBe(false);
  });
});

describe("mutations", () => {
  it("setRecent assigns the recent array", () => {
    const s = freshState();
    mutations.setRecent(s, [{ id: 1 }]);
    expect(s.recent).toEqual([{ id: 1 }]);
  });

  describe("setByType", () => {
    it("updates the page bucket when type exists in state", () => {
      const s = freshState();
      mutations.setByType(s, {
        type: "all",
        announcements: [{ id: 1 }],
        page: 2,
        total: 50,
        totalPages: 7,
        hasMore: true,
      });
      expect(s.all.noticesByPage[2]).toEqual([{ id: 1 }]);
      expect(s.all.page).toBe(2);
      expect(s.all.total).toBe(50);
      expect(s.all.totalPages).toBe(7);
      expect(s.all.hasMore).toBe(true);
    });

    it("is a no-op when type does not exist in state", () => {
      const s = freshState();
      const before = JSON.parse(JSON.stringify(s));
      mutations.setByType(s, {
        type: "nonexistent",
        announcements: [{ id: 1 }],
        page: 0,
        total: 1,
        totalPages: 1,
        hasMore: false,
      });
      expect(JSON.parse(JSON.stringify(s))).toEqual(before);
    });
  });

  it("setCategories assigns the categories array", () => {
    const s = freshState();
    mutations.setCategories(s, [{ id: 1 }]);
    expect(s.categories).toEqual([{ id: 1 }]);
  });

  it("setError assigns the error message", () => {
    const s = freshState();
    mutations.setError(s, "boom");
    expect(s.error).toBe("boom");
  });

  describe("addNotice", () => {
    it("adds a notice to the current page, creating the bucket when absent", () => {
      const s = freshState();
      s.page = 0;
      mutations.addNotice(s, { notice: { slug: "x", id: 1 } });
      expect(s.all.noticesByPage[0]).toEqual([{ slug: "x", id: 1 }]);
    });

    it("appends to an existing current-page bucket", () => {
      const s = freshState();
      s.page = 1;
      s.all.noticesByPage[1] = [{ slug: "a", id: 1 }];
      mutations.addNotice(s, { notice: { slug: "b", id: 2 } });
      expect(s.all.noticesByPage[1]).toEqual([
        { slug: "a", id: 1 },
        { slug: "b", id: 2 },
      ]);
    });

    it("does nothing when a notice with the same slug already exists", () => {
      const s = freshState();
      s.page = 0;
      // The dedup check looks at page.notices (a nested .notices array) on each
      // page bucket. Provide that shape so `exists` becomes true.
      s.all.noticesByPage[0] = { notices: [{ slug: "dup" }] };
      mutations.addNotice(s, { notice: { slug: "dup", id: 99 } });
      // Unchanged: still the original object, no push happened.
      expect(s.all.noticesByPage[0]).toEqual({ notices: [{ slug: "dup" }] });
    });

    it("treats buckets without a .notices array as empty when deduplicating", () => {
      const s = freshState();
      s.page = 0;
      // Array bucket has no `.notices` property -> flatMap yields [] for it,
      // so no duplicate is detected and the new notice is added.
      s.all.noticesByPage[0] = [{ slug: "existing", id: 1 }];
      mutations.addNotice(s, { notice: { slug: "new", id: 2 } });
      expect(s.all.noticesByPage[0]).toEqual([
        { slug: "existing", id: 1 },
        { slug: "new", id: 2 },
      ]);
    });
  });

  it("clearNotices resets the all bucket to defaults", () => {
    const s = freshState();
    s.all.noticesByPage = { 0: [{ id: 1 }] };
    s.all.total = 99;
    mutations.clearNotices(s);
    expect(s.all).toEqual({
      noticesByPage: {},
      hasMore: true,
      total: 0,
      totalPages: 0,
      page: 0,
      size: 8,
    });
  });
});

describe("actions.fetchRecentNotices", () => {
  it("returns early without an API call when recent notices already loaded", async () => {
    const commit = vi.fn();
    const state = freshState();
    state.recent = [{ id: 1 }];
    await actions.fetchRecentNotices({ commit, state }, {});
    expect(getAnnouncements).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("fetches and commits setRecent on success (defaults applied for omitted args)", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({
      status: 200,
      data: { announcements: [{ id: 7 }], total: 1, totalPages: 1 },
    });
    await actions.fetchRecentNotices({ commit, state }, { type: "news" });
    expect(getAnnouncements).toHaveBeenCalledWith({
      size: 8,
      page: 0,
      priority: "",
      category: "",
      search: "",
      exludeFunerals: true,
      status: "published",
    });
    expect(commit).toHaveBeenCalledWith("setRecent", [{ id: 7 }]);
  });

  it("passes through explicitly provided args", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({
      status: 200,
      data: { announcements: [], total: 0, totalPages: 0 },
    });
    await actions.fetchRecentNotices(
      { commit, state },
      {
        type: "news",
        size: 3,
        page: 2,
        search: "q",
        priority: "high",
        category: "5",
      }
    );
    expect(getAnnouncements).toHaveBeenCalledWith({
      size: 3,
      page: 2,
      priority: "high",
      category: "5",
      search: "q",
      exludeFunerals: true,
      status: "published",
    });
  });

  it("throws and commits setError when the response status is not 200", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({ status: 500, data: {} });
    await expect(
      actions.fetchRecentNotices({ commit, state }, { type: "news" })
    ).rejects.toThrow("Failed to fetch news articles");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch news articles"
    );
  });

  it("throws and commits setError when the API rejects", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockRejectedValue(new Error("network"));
    await expect(
      actions.fetchRecentNotices({ commit, state }, {})
    ).rejects.toThrow("network");
    expect(commit).toHaveBeenCalledWith("setError", "network");
  });
});

describe("actions.fetchNotices", () => {
  it("returns early when the requested page bucket already has notices", async () => {
    const commit = vi.fn();
    const state = freshState();
    state.all.noticesByPage[0] = [{ id: 1 }];
    await actions.fetchNotices({ commit, state, getters: {} }, { page: 0 });
    expect(getAnnouncements).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("fetches when the page bucket exists but is empty (length 0 branch)", async () => {
    const commit = vi.fn();
    const state = freshState();
    state.all.noticesByPage[0] = []; // truthy object, length 0 -> proceed
    getAnnouncements.mockResolvedValue({
      status: 200,
      data: { announcements: [{ id: 1 }], total: 5, totalPages: 3 },
    });
    await actions.fetchNotices({ commit, state, getters: {} }, { page: 0 });
    expect(getAnnouncements).toHaveBeenCalled();
  });

  it("fetches and commits setByType with defaults; hasMore reflects page<totalPages (true)", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({
      status: 200,
      data: { announcements: [{ id: 1 }], total: 20, totalPages: 3 },
    });
    await actions.fetchNotices({ commit, state, getters: {} }, {});
    expect(getAnnouncements).toHaveBeenCalledWith({
      size: 10,
      page: 0,
      priority: "",
      category: "",
      search: "",
      exludeFunerals: true,
      status: "published",
    });
    expect(commit).toHaveBeenCalledWith("setByType", {
      type: "all",
      announcements: [{ id: 1 }],
      page: 0,
      total: 20,
      totalPages: 3,
      hasMore: true,
    });
  });

  it("computes hasMore=false when page is not less than totalPages", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({
      status: 200,
      data: { announcements: [], total: 0, totalPages: 0 },
    });
    await actions.fetchNotices(
      { commit, state, getters: {} },
      { page: 0, type: "all" }
    );
    expect(commit).toHaveBeenCalledWith(
      "setByType",
      expect.objectContaining({ hasMore: false })
    );
  });

  it("uses explicit args and the funerals type bucket", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({
      status: 200,
      data: { announcements: [{ id: 2 }], total: 8, totalPages: 1 },
    });
    await actions.fetchNotices(
      { commit, state, getters: {} },
      {
        type: "funerals",
        size: 4,
        page: 1,
        search: "s",
        priority: "low",
        category: "9",
        exludeFunerals: false,
      }
    );
    expect(getAnnouncements).toHaveBeenCalledWith({
      size: 4,
      page: 1,
      priority: "low",
      category: "9",
      search: "s",
      exludeFunerals: false,
      status: "published",
    });
    expect(commit).toHaveBeenCalledWith(
      "setByType",
      expect.objectContaining({ type: "funerals", page: 1 })
    );
  });

  it("throws and commits setError when status is not 200", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockResolvedValue({ status: 404, data: {} });
    await expect(
      actions.fetchNotices({ commit, state, getters: {} }, { type: "all" })
    ).rejects.toThrow("Failed to fetch all articles");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch all articles"
    );
  });

  it("throws and commits setError when the API rejects", async () => {
    const commit = vi.fn();
    const state = freshState();
    getAnnouncements.mockRejectedValue(new Error("down"));
    await expect(
      actions.fetchNotices({ commit, state, getters: {} }, {})
    ).rejects.toThrow("down");
    expect(commit).toHaveBeenCalledWith("setError", "down");
  });
});

describe("actions.fetchCategories", () => {
  it("returns early when categories already loaded", async () => {
    const commit = vi.fn();
    const state = freshState();
    state.categories = [{ id: 1 }];
    await actions.fetchCategories({ commit, state });
    expect(getCategories).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("fetches and commits setCategories on success", async () => {
    const commit = vi.fn();
    const state = freshState();
    getCategories.mockResolvedValue({
      status: 200,
      data: { categories: [{ id: 3 }] },
    });
    await actions.fetchCategories({ commit, state });
    expect(getCategories).toHaveBeenCalledWith({ size: 100 });
    expect(commit).toHaveBeenCalledWith("setCategories", [{ id: 3 }]);
  });

  it("throws and commits setError when status is not 200", async () => {
    const commit = vi.fn();
    const state = freshState();
    getCategories.mockResolvedValue({ status: 500, data: {} });
    await expect(actions.fetchCategories({ commit, state })).rejects.toThrow(
      "Failed to fetch categories"
    );
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch categories"
    );
  });

  it("throws and commits setError when the API rejects", async () => {
    const commit = vi.fn();
    const state = freshState();
    getCategories.mockRejectedValue(new Error("cat-fail"));
    await expect(actions.fetchCategories({ commit, state })).rejects.toThrow(
      "cat-fail"
    );
    expect(commit).toHaveBeenCalledWith("setError", "cat-fail");
  });
});

describe("actions.fetchSingleNotice", () => {
  it("returns the existing notice from the store without an API call", async () => {
    const commit = vi.fn();
    const existing = { slug: "a", content: "x" };
    const localGetters = { getNoticeBySlugFromStore: () => existing };
    const result = await actions.fetchSingleNotice(
      { commit, getters: localGetters },
      "a"
    );
    expect(result).toBe(existing);
    expect(getAnnouncementBySlug).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("fetches, processes (with category id), commits addNotice, and returns it", async () => {
    const commit = vi.fn();
    const localGetters = { getNoticeBySlugFromStore: () => null };
    getAnnouncementBySlug.mockResolvedValue({
      status: 200,
      data: {
        slug: "b",
        image: "img.png",
        category: { id: 42 },
        content: "body",
      },
    });
    const result = await actions.fetchSingleNotice(
      { commit, getters: localGetters },
      "b"
    );
    expect(getAnnouncementBySlug).toHaveBeenCalledWith("b");
    expect(result).toEqual({
      slug: "b",
      image: "img.png",
      category: { id: 42 },
      content: "body",
      categoryId: 42,
    });
    expect(commit).toHaveBeenCalledWith("addNotice", { notice: result });
  });

  it("processes a notice with no category (optional chaining -> categoryId undefined)", async () => {
    const commit = vi.fn();
    const localGetters = { getNoticeBySlugFromStore: () => null };
    getAnnouncementBySlug.mockResolvedValue({
      status: 200,
      data: { slug: "c", image: null },
    });
    const result = await actions.fetchSingleNotice(
      { commit, getters: localGetters },
      "c"
    );
    expect(result.categoryId).toBeUndefined();
    expect(commit).toHaveBeenCalledWith(
      "addNotice",
      expect.objectContaining({ notice: expect.objectContaining({ slug: "c" }) })
    );
  });

  it("throws 'Notice not found' when status is not 200", async () => {
    const commit = vi.fn();
    const localGetters = { getNoticeBySlugFromStore: () => null };
    getAnnouncementBySlug.mockResolvedValue({ status: 404, data: { slug: "d" } });
    await expect(
      actions.fetchSingleNotice({ commit, getters: localGetters }, "d")
    ).rejects.toThrow("Notice not found");
    expect(commit).toHaveBeenCalledWith("setError", "Notice not found");
  });

  it("throws 'Notice not found' when status is 200 but data is falsy", async () => {
    const commit = vi.fn();
    const localGetters = { getNoticeBySlugFromStore: () => null };
    getAnnouncementBySlug.mockResolvedValue({ status: 200, data: null });
    await expect(
      actions.fetchSingleNotice({ commit, getters: localGetters }, "e")
    ).rejects.toThrow("Notice not found");
    expect(commit).toHaveBeenCalledWith("setError", "Notice not found");
  });

  it("commits setError and rethrows when the API rejects", async () => {
    const commit = vi.fn();
    const localGetters = { getNoticeBySlugFromStore: () => null };
    getAnnouncementBySlug.mockRejectedValue(new Error("boom"));
    await expect(
      actions.fetchSingleNotice({ commit, getters: localGetters }, "f")
    ).rejects.toThrow("boom");
    expect(commit).toHaveBeenCalledWith("setError", "boom");
  });
});
