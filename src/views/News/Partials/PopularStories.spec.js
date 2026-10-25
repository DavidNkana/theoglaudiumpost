import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the Vuex store boundary --------------------------------------------
// A shared dispatch spy lets each test drive the mocked async action to BOTH
// resolve and reject, and assert the exact dispatched payload. The getters
// object is consulted by the template to feed ArticlesRow's :articles prop.
const dispatch = vi.fn();
const getters = { "articles/popularArticles": [] };
vi.mock("vuex", () => ({
  useStore: () => ({ dispatch, getters }),
}));

import PopularStories from "@/views/News/Partials/PopularStories.vue";

// Stub the heavy ArticlesRow child so this spec only instruments PopularStories.
// It exposes the props it receives so we can assert isLoading / articles wiring.
const ArticlesRowStub = {
  name: "ArticlesRow",
  props: ["isLoading", "articles"],
  template: `<div class="articles-row-stub" :data-loading="String(isLoading)" :data-count="articles.length"></div>`,
};

const mountView = (props = {}) =>
  mount(PopularStories, {
    props,
    global: {
      stubs: { ArticlesRow: ArticlesRowStub },
    },
  });

describe("PopularStories.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getters["articles/popularArticles"] = [];
    // Default: action resolves (success path).
    dispatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the static section header and the ArticlesRow child", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".popular-news").classes()).toEqual(
      expect.arrayContaining(["popular-news", "d-none", "d-lg-block"])
    );
    expect(wrapper.find(".section-title").text()).toBe("Popular Stories");
    expect(wrapper.find(".section-line").exists()).toBe(true);
    expect(wrapper.findComponent(ArticlesRowStub).exists()).toBe(true);
  });

  it("uses the default `page` prop ('home') when none is provided", () => {
    const wrapper = mountView();
    expect(wrapper.props("page")).toBe("home");
  });

  it("accepts an explicit `page` prop override", () => {
    const wrapper = mountView({ page: "news" });
    expect(wrapper.props("page")).toBe("news");
  });

  it("fetches popular articles on mount with the correct type/size payload (success path)", async () => {
    const wrapper = mountView();

    // onMounted -> fetchPosts dispatches exactly once with the popular payload.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "popular",
      size: 8,
    });

    await flushPromises();

    // try-block completed: isLoading set back to false on success.
    expect(wrapper.findComponent(ArticlesRowStub).props("isLoading")).toBe(false);
  });

  it("passes the store's popularArticles getter through to ArticlesRow", async () => {
    getters["articles/popularArticles"] = [
      { id: 1, title: "A" },
      { id: 2, title: "B" },
    ];
    const wrapper = mountView();
    await flushPromises();

    const row = wrapper.findComponent(ArticlesRowStub);
    expect(row.props("articles")).toEqual([
      { id: 1, title: "A" },
      { id: 2, title: "B" },
    ]);
    expect(wrapper.find(".articles-row-stub").attributes("data-count")).toBe("2");
  });

  it("logs the error and clears loading when the dispatch rejects (catch path)", async () => {
    const error = new Error("boom");
    dispatch.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountView();
    await flushPromises();

    // catch-block executed: console.error called and isLoading reset to false.
    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", error);
    expect(wrapper.findComponent(ArticlesRowStub).props("isLoading")).toBe(false);
  });
});
