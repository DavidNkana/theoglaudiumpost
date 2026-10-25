import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the Vuex store boundary --------------------------------------------
// A shared dispatch spy lets each test drive the mocked async action to BOTH
// resolve and reject, and assert the exact dispatched payload. The getters
// object is consulted by the template's v-for to feed the NewsCard children.
const dispatch = vi.fn();
const getters = { "articles/topStories": [] };
vi.mock("vuex", () => ({
  useStore: () => ({ dispatch, getters }),
}));

import TopStories from "@/views/News/Partials/TopStories.vue";

// Stub the heavy NewsCard child so this spec only instruments TopStories.
// It surfaces the props it receives so we can assert article / isTopStory wiring.
const NewsCardStub = {
  name: "NewsCard",
  props: ["article", "isTopStory"],
  template: `<div class="news-card-stub" :data-id="article.id" :data-top="String(isTopStory)"></div>`,
};

const mountView = () =>
  mount(TopStories, {
    global: {
      stubs: { NewsCard: NewsCardStub },
    },
  });

describe("TopStories.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getters["articles/topStories"] = [];
    // Default: action resolves (success path).
    dispatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the static section header", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".top-stories-section").exists()).toBe(true);
    expect(wrapper.find(".header-badge i").classes()).toContain(
      "bi-lightning-charge-fill"
    );
    expect(wrapper.find(".section-title").text()).toBe("Top Stories");
    expect(wrapper.find(".header-line").exists()).toBe(true);
  });

  it("fetches top stories on mount with the correct type/size payload (success path)", async () => {
    const wrapper = mountView();

    // onMounted -> fetchPosts dispatches exactly once with the topStories payload.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "topStories",
      size: 6,
    });

    await flushPromises();

    // try-block completed: isLoading reset to false -> the v-if grid is shown,
    // the v-else skeleton grid is gone.
    expect(wrapper.find(".skeleton-card").exists()).toBe(false);
  });

  it("renders the loading skeleton grid while the dispatch is pending (v-else branch)", async () => {
    // A never-resolving dispatch keeps isLoading true after the sync part of
    // fetchPosts runs, so the v-else skeleton branch renders.
    let resolveDispatch;
    dispatch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDispatch = resolve;
      })
    );

    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    // v-else branch: exactly 6 skeleton cards, no real NewsCard children.
    expect(wrapper.findAll(".skeleton-card")).toHaveLength(6);
    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(0);
    // Each skeleton renders its inner markup (covers the static skeleton template).
    expect(wrapper.find(".skeleton-image").exists()).toBe(true);
    expect(wrapper.find(".skeleton-title.short").exists()).toBe(true);
    expect(wrapper.find(".skeleton-date").exists()).toBe(true);

    // Let it finish so the pending promise does not leak across tests.
    resolveDispatch();
    await flushPromises();
    expect(wrapper.find(".skeleton-card").exists()).toBe(false);
  });

  it("renders an empty stories grid when the topStories getter is empty (v-for empty)", async () => {
    getters["articles/topStories"] = [];
    const wrapper = mountView();
    await flushPromises();

    // v-if branch active (not loading) but no stories -> no NewsCard children.
    expect(wrapper.find(".stories-grid").exists()).toBe(true);
    expect(wrapper.findAll(".story-item")).toHaveLength(0);
    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(0);
  });

  it("renders one NewsCard per story and wires the article/isTopStory props (v-for non-empty)", async () => {
    getters["articles/topStories"] = [
      { id: 1, title: "A" },
      { id: 2, title: "B" },
      { id: 3, title: "C" },
    ];
    const wrapper = mountView();
    await flushPromises();

    const cards = wrapper.findAllComponents(NewsCardStub);
    expect(cards).toHaveLength(3);
    expect(wrapper.findAll(".story-item")).toHaveLength(3);

    // article prop is the story object; isTopStory is always true.
    expect(cards[0].props("article")).toEqual({ id: 1, title: "A" });
    expect(cards[0].props("isTopStory")).toBe(true);
    expect(cards.map((c) => c.attributes("data-id"))).toEqual(["1", "2", "3"]);
    expect(cards.every((c) => c.attributes("data-top") === "true")).toBe(true);
  });

  it("logs the error and clears loading when the dispatch rejects (catch path)", async () => {
    const error = new Error("boom");
    dispatch.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountView();
    await flushPromises();

    // catch-block executed: console.error called and isLoading reset to false,
    // so the v-if grid (not the skeleton) is shown.
    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", error);
    expect(wrapper.find(".skeleton-card").exists()).toBe(false);
    expect(wrapper.find(".stories-grid").exists()).toBe(true);
  });
});
