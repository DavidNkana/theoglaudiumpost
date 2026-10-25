import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock the Vuex store boundary --------------------------------------------
// A shared dispatch spy + getters bag lets each test drive the async fetch path
// (resolve AND reject) and control what topStories the v-for renders.
const dispatch = vi.fn();
const getters = {};
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch,
    getters,
  }),
}));

import HomeTopStories from "@/views/News/Partials/HomeTopStories.vue";

// Stub the heavy child components. NewsCard pulls in media services / many
// boundaries; ArticlesRow is the loading skeleton. Both are stubbed so we can
// assert presence + the props the parent passes without their real internals.
const NewsCardStub = {
  name: "NewsCard",
  props: {
    article: { type: Object },
    // Boolean type so the template's `min-details` shorthand coerces to `true`.
    minDetails: { type: Boolean, default: false },
  },
  template: `<div class="news-card-stub" :data-title="article.title" :data-min="String(minDetails)"></div>`,
};

const ArticlesRowStub = {
  name: "ArticlesRow",
  props: {
    isLoading: { type: Boolean, default: false },
    articles: { type: Array, default: () => [] },
  },
  template: `<div class="articles-row-stub" :data-loading="String(isLoading)" :data-count="articles.length"></div>`,
};

const mountView = () =>
  mount(HomeTopStories, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        NewsCard: NewsCardStub,
        ArticlesRow: ArticlesRowStub,
      },
    },
  });

const sampleStories = [
  { slug: "lead-story", title: "Lead Story" },
  { slug: "second-story", title: "Second Story" },
  { slug: "third-story", title: "Third Story" },
];

const setStories = (stories) => {
  getters["articles/topStories"] = stories;
};

describe("HomeTopStories.vue", () => {
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    setStories([]);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("dispatches fetchArticlesByType on mount and ends in the not-loading state", async () => {
    dispatch.mockResolvedValueOnce(undefined);
    const wrapper = mountView();

    // onMounted -> fetchPosts dispatched with the exact type/size payload.
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "topStories",
      size: 10,
    });

    await flushPromises();

    // finally{} set isLoading=false -> the list branch (v-if !isLoading) renders,
    // the loading ArticlesRow (v-else) is gone.
    expect(wrapper.find(".list-group").exists()).toBe(true);
    expect(wrapper.findComponent(ArticlesRowStub).exists()).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("renders the ArticlesRow loading branch (v-else) while the fetch is pending", async () => {
    // Hold the dispatch promise open so isLoading stays true.
    let resolveDispatch;
    dispatch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDispatch = resolve;
      })
    );
    const wrapper = mountView();

    // isLoading was set true synchronously inside fetchPosts (before the await);
    // let Vue flush that reactive update to the DOM without resolving the fetch.
    await nextTick();

    // isLoading was set true synchronously inside fetchPosts before awaiting.
    const row = wrapper.findComponent(ArticlesRowStub);
    expect(row.exists()).toBe(true);
    expect(row.props("isLoading")).toBe(true);
    expect(row.props("articles")).toEqual([]);
    // List branch absent while loading.
    expect(wrapper.find(".list-group").exists()).toBe(false);

    resolveDispatch();
    await flushPromises();
    expect(wrapper.findComponent(ArticlesRowStub).exists()).toBe(false);
  });

  it("renders an empty list (empty v-for) when there are no top stories", async () => {
    dispatch.mockResolvedValueOnce(undefined);
    setStories([]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".list-group").exists()).toBe(true);
    // No NewsCard (index 0 branch) and no list items (v-else branch).
    expect(wrapper.findComponent(NewsCardStub).exists()).toBe(false);
    expect(wrapper.findAll(".list-group-item")).toHaveLength(0);
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);
  });

  it("renders the first story as a NewsCard (index==0) and the rest as router-link items (v-else)", async () => {
    dispatch.mockResolvedValueOnce(undefined);
    setStories(sampleStories);
    const wrapper = mountView();
    await flushPromises();

    // index === 0 -> NewsCard with min-details, exactly one.
    const cards = wrapper.findAllComponents(NewsCardStub);
    expect(cards).toHaveLength(1);
    expect(cards[0].props("article")).toEqual(sampleStories[0]);
    expect(cards[0].props("minDetails")).toBe(true);

    // The remaining two stories -> v-else list items with router-links.
    const items = wrapper.findAll(".list-group-item");
    expect(items).toHaveLength(2);

    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links).toHaveLength(2);
    expect(links[0].props("to")).toBe("/news/second-story");
    expect(links[1].props("to")).toBe("/news/third-story");
    expect(links[0].text()).toBe("Second Story");
    expect(links[1].text()).toBe("Third Story");
  });

  it("renders only the NewsCard when there is a single top story (no v-else items)", async () => {
    dispatch.mockResolvedValueOnce(undefined);
    setStories([{ slug: "solo", title: "Solo Story" }]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(1);
    expect(wrapper.findAll(".list-group-item")).toHaveLength(0);
  });

  it("logs the error in the catch branch when the dispatch rejects but still clears loading", async () => {
    const boom = new Error("network down");
    dispatch.mockRejectedValueOnce(boom);
    const wrapper = mountView();
    await flushPromises();

    // catch{} logged; finally{} still flipped isLoading=false -> list branch shows.
    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", boom);
    expect(wrapper.find(".list-group").exists()).toBe(true);
    expect(wrapper.findComponent(ArticlesRowStub).exists()).toBe(false);
  });
});
