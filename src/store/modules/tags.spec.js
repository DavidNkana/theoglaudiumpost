/**
 * Unit tests for store/modules/tags.js
 *
 * Vuex module managing content tags. We isolate the unit by mocking the only
 * external boundary it imports: getTags from "@/features/tags/TagsService".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the single external collaborator the module imports.
vi.mock("@/features/tags/TagsService", () => ({
  getTags: vi.fn(),
}));

import { getTags } from "@/features/tags/TagsService";
import tagsModule from "@/store/modules/tags.js";

describe("store/modules/tags.js", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("module shape", () => {
    it("is namespaced and exposes state/getters/mutations/actions", () => {
      expect(tagsModule.namespaced).toBe(true);
      expect(typeof tagsModule.state).toBe("function");
      expect(tagsModule.getters).toBeTypeOf("object");
      expect(tagsModule.mutations).toBeTypeOf("object");
      expect(tagsModule.actions).toBeTypeOf("object");
    });
  });

  describe("state()", () => {
    it("returns a fresh default state object", () => {
      const s1 = tagsModule.state();
      const s2 = tagsModule.state();
      expect(s1).toEqual({ tags: [], error: null });
      // factory returns a new object each call (no shared reference)
      expect(s1).not.toBe(s2);
    });
  });

  describe("getters.tags", () => {
    it("returns the tags array from state", () => {
      const state = { tags: [{ id: 1 }, { id: 2 }], error: null };
      expect(tagsModule.getters.tags(state)).toBe(state.tags);
      expect(tagsModule.getters.tags(state)).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe("mutations.setTags", () => {
    it("sets the tags array on state from the payload", () => {
      const state = { tags: [], error: null };
      const payload = { tags: [{ id: 10 }, { id: 11 }] };
      tagsModule.mutations.setTags(state, payload);
      expect(state.tags).toBe(payload.tags);
      expect(state.tags).toEqual([{ id: 10 }, { id: 11 }]);
    });
  });

  describe("mutations.setError", () => {
    it("sets the error message on state", () => {
      const state = { tags: [], error: null };
      tagsModule.mutations.setError(state, "boom");
      expect(state.error).toBe("boom");
    });
  });

  describe("actions.fetchTags", () => {
    it("returns early without calling the service when tags already loaded", async () => {
      const commit = vi.fn();
      const state = { tags: [{ id: 1 }], error: null };

      const result = await tagsModule.actions.fetchTags({ commit, state });

      expect(result).toBeUndefined();
      expect(getTags).not.toHaveBeenCalled();
      expect(commit).not.toHaveBeenCalled();
    });

    it("fetches tags and commits setTags with at most 10 items on success", async () => {
      const commit = vi.fn();
      const state = { tags: [], error: null };

      // 12 items so we exercise the slice(0, 10) limiting.
      const data = Array.from({ length: 12 }, (_, i) => ({ id: i }));
      getTags.mockResolvedValue({ status: 200, data });

      await tagsModule.actions.fetchTags({ commit, state });

      expect(getTags).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledWith("setTags", {
        tags: data.slice(0, 10),
      });
      // Confirm exactly 10 were committed.
      expect(commit.mock.calls[0][1].tags).toHaveLength(10);
    });

    it("commits setError and rethrows when response.status is not 200", async () => {
      const commit = vi.fn();
      const state = { tags: [], error: null };

      getTags.mockResolvedValue({ status: 500, data: [] });

      await expect(
        tagsModule.actions.fetchTags({ commit, state }),
      ).rejects.toThrow("Failed to fetch tags");

      expect(commit).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledWith("setError", "Failed to fetch tags");
    });

    it("commits setError and rethrows when the service rejects", async () => {
      const commit = vi.fn();
      const state = { tags: [], error: null };

      const err = new Error("network down");
      getTags.mockRejectedValue(err);

      await expect(
        tagsModule.actions.fetchTags({ commit, state }),
      ).rejects.toThrow("network down");

      expect(commit).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledWith("setError", "network down");
    });
  });
});
