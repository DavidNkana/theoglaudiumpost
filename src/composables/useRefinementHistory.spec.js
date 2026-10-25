import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";

// --- Mock external boundaries (only what the source imports) ---
vi.mock("@/features/articles/ArticlesService", () => ({
  refineArticleBySourceId: vi.fn(),
}));

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
  },
}));

import { refineArticleBySourceId } from "@/features/articles/ArticlesService";
import Swal from "sweetalert2";
import { useRefinementHistory } from "@/composables/useRefinementHistory";

describe("useRefinementHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silence/observe console.error invoked by the catch branches.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initialises reactive state with default values", () => {
    const { refinementHistory, isRefining, currentArticleId, lastRefinement, refinementCount } =
      useRefinementHistory();

    expect(refinementHistory.value).toEqual([]);
    expect(isRefining.value).toBe(false);
    expect(currentArticleId.value).toBeNull();
    expect(lastRefinement.value).toBeNull();
    expect(refinementCount.value).toBe(0);
  });

  describe("loadRefinementHistory", () => {
    it("returns early and does not set currentArticleId when articleId is falsy", async () => {
      const { loadRefinementHistory, currentArticleId, refinementHistory } =
        useRefinementHistory();

      // Pre-populate to detect that the body did NOT run.
      refinementHistory.value = [{ id: 1 }];

      const result = await loadRefinementHistory(undefined);

      expect(result).toBeUndefined();
      expect(currentArticleId.value).toBeNull();
      // Untouched because of the early return.
      expect(refinementHistory.value).toEqual([{ id: 1 }]);
    });

    it("returns early when called WITHOUT an argument (optional param missing)", async () => {
      const { loadRefinementHistory, currentArticleId } = useRefinementHistory();

      await loadRefinementHistory();

      expect(currentArticleId.value).toBeNull();
    });

    it("sets currentArticleId and resets history on the success (try) path", async () => {
      const { loadRefinementHistory, currentArticleId, refinementHistory } =
        useRefinementHistory();

      refinementHistory.value = [{ id: 99 }];

      await loadRefinementHistory("article-42");

      expect(currentArticleId.value).toBe("article-42");
      expect(refinementHistory.value).toEqual([]);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("logs and resets history when assigning to the ref throws (catch path)", async () => {
      const { loadRefinementHistory, currentArticleId, refinementHistory } =
        useRefinementHistory();

      // Force the `refinementHistory.value = []` assignment inside the try to throw,
      // then allow it again so the catch's `refinementHistory.value = []` succeeds.
      const realRef = refinementHistory;
      let backing = [];
      let throwOnce = true;
      Object.defineProperty(realRef, "value", {
        configurable: true,
        get() {
          return backing;
        },
        set(v) {
          if (throwOnce) {
            throwOnce = false;
            throw new Error("ref set boom");
          }
          backing = v;
        },
      });

      await loadRefinementHistory("article-77");

      // currentArticleId was set before the throwing assignment.
      expect(currentArticleId.value).toBe("article-77");
      // catch branch logged the error...
      expect(console.error).toHaveBeenCalledWith(
        "Error loading refinement history:",
        expect.any(Error)
      );
      // ...and the second (catch) assignment succeeded.
      expect(realRef.value).toEqual([]);
    });
  });

  describe("addRefinement", () => {
    it("pushes a fully-formed refinement using currentArticleId and provided fields", () => {
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1234567890);
      const isoSpy = vi
        .spyOn(Date.prototype, "toISOString")
        .mockReturnValue("2026-06-18T00:00:00.000Z");

      const { addRefinement, refinementHistory, currentArticleId, refinementCount } =
        useRefinementHistory();

      currentArticleId.value = "art-1";

      addRefinement({
        prompt: "make it shorter",
        contentBefore: "before text",
        contentAfter: "after text",
        provider: "openai",
      });

      expect(refinementHistory.value).toHaveLength(1);
      expect(refinementCount.value).toBe(1);
      expect(refinementHistory.value[0]).toEqual({
        id: 1234567890,
        articleId: "art-1",
        prompt: "make it shorter",
        contentBefore: "before text",
        contentAfter: "after text",
        createdAt: "2026-06-18T00:00:00.000Z",
        provider: "openai",
      });

      dateNowSpy.mockRestore();
      isoSpy.mockRestore();
    });

    it("appends additional refinements and lastRefinement reflects the most recent", () => {
      const { addRefinement, lastRefinement, refinementHistory } = useRefinementHistory();

      addRefinement({
        prompt: "p1",
        contentBefore: "b1",
        contentAfter: "a1",
        provider: "prov1",
      });
      addRefinement({
        prompt: "p2",
        contentBefore: "b2",
        contentAfter: "a2",
        provider: "prov2",
      });

      expect(refinementHistory.value).toHaveLength(2);
      expect(lastRefinement.value.prompt).toBe("p2");
    });
  });

  describe("submitRefinement", () => {
    it("resolves successfully, records history, and toggles isRefining (success path)", async () => {
      refineArticleBySourceId.mockResolvedValue({
        data: { article: "refined content" },
      });

      const { submitRefinement, isRefining, refinementHistory, currentArticleId } =
        useRefinementHistory();

      currentArticleId.value = "article-7";

      const promise = submitRefinement({
        sourceId: "src-1",
        articleId: "article-7",
        prompt: "improve it",
        provider: "anthropic",
        currentContent: "original content",
      });

      // isRefining is set synchronously true before the awaited call resolves.
      expect(isRefining.value).toBe(true);

      const result = await promise;

      expect(refineArticleBySourceId).toHaveBeenCalledWith({
        sourceId: "src-1",
        articleId: "article-7",
        prompt: "improve it",
        provider: "anthropic",
      });

      expect(result).toEqual({
        success: true,
        content: "refined content",
        refinement: {
          prompt: "improve it",
          contentBefore: "original content",
          contentAfter: "refined content",
        },
      });

      // addRefinement was invoked internally.
      expect(refinementHistory.value).toHaveLength(1);
      expect(refinementHistory.value[0]).toMatchObject({
        articleId: "article-7",
        prompt: "improve it",
        contentBefore: "original content",
        contentAfter: "refined content",
        provider: "anthropic",
      });

      // finally block ran.
      expect(isRefining.value).toBe(false);
      expect(Swal.fire).not.toHaveBeenCalled();
    });

    it("handles rejection via the catch branch and runs the finally block (error path)", async () => {
      const err = new Error("network down");
      refineArticleBySourceId.mockRejectedValue(err);

      const { submitRefinement, isRefining, refinementHistory } = useRefinementHistory();

      const result = await submitRefinement({
        sourceId: "src-2",
        articleId: "article-9",
        prompt: "fix",
        provider: "openai",
        currentContent: "content here",
      });

      expect(console.error).toHaveBeenCalledWith("Refinement failed:", err);
      expect(Swal.fire).toHaveBeenCalledWith({
        title: "Error!",
        text: "Failed to process refinement. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });

      expect(result).toEqual({
        success: false,
        error: "network down",
      });

      // No history added on failure.
      expect(refinementHistory.value).toHaveLength(0);
      // finally still reset the flag.
      expect(isRefining.value).toBe(false);
    });

    it("runs finally on the abrupt-completion path when the catch block itself throws", async () => {
      // Reject the API call so the catch block runs...
      refineArticleBySourceId.mockRejectedValue(new Error("api boom"));
      // ...then make Swal.fire throw so an exception escapes through `finally`.
      const swalErr = new Error("swal boom");
      Swal.fire.mockImplementation(() => {
        throw swalErr;
      });

      const { submitRefinement, isRefining } = useRefinementHistory();

      await expect(
        submitRefinement({
          sourceId: "src-3",
          articleId: "article-3",
          prompt: "p",
          provider: "openai",
          currentContent: "c",
        })
      ).rejects.toBe(swalErr);

      // finally still executed even though the exception propagated.
      expect(isRefining.value).toBe(false);
    });
  });

  describe("clearHistory", () => {
    it("empties the refinement history", () => {
      const { addRefinement, clearHistory, refinementHistory, refinementCount } =
        useRefinementHistory();

      addRefinement({
        prompt: "p",
        contentBefore: "b",
        contentAfter: "a",
        provider: "prov",
      });
      expect(refinementHistory.value).toHaveLength(1);

      clearHistory();

      expect(refinementHistory.value).toEqual([]);
      expect(refinementCount.value).toBe(0);
    });
  });

  describe("computed getters", () => {
    it("lastRefinement is null when history is empty and updates reactively", async () => {
      const { addRefinement, lastRefinement } = useRefinementHistory();

      expect(lastRefinement.value).toBeNull();

      addRefinement({
        prompt: "p",
        contentBefore: "b",
        contentAfter: "a",
        provider: "prov",
      });
      await nextTick();

      expect(lastRefinement.value).not.toBeNull();
      expect(lastRefinement.value.prompt).toBe("p");
    });

    it("refinementCount tracks history length reactively", async () => {
      const { addRefinement, refinementCount } = useRefinementHistory();

      expect(refinementCount.value).toBe(0);

      addRefinement({
        prompt: "p",
        contentBefore: "b",
        contentAfter: "a",
        provider: "prov",
      });
      await nextTick();

      expect(refinementCount.value).toBe(1);
    });
  });
});
