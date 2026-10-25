import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock @/utils (heavy ad/image helpers pulled by the barrel) --------------
vi.mock("@/utils", () => ({
  formatDateToLongString: vi.fn(() => "January 1, 2025"),
  setDefaultImage: vi.fn(),
}));

// --- Mock the categories service (external boundary) -------------------------
const getCategoryArticles = vi.fn();
vi.mock("@/features/categories/CategoriesService", () => ({
  getCategoryArticles: (...args) => getCategoryArticles(...args),
}));

// --- Mock heavy child components ---------------------------------------------
vi.mock("@/components/NewsCard.vue", () => ({
  default: {
    name: "NewsCard",
    props: ["article"],
    template: "<div class='news-card-stub'>{{ article.id }}</div>",
  },
}));
vi.mock("@/components/ShimmerCard.vue", () => ({
  default: { name: "ShimmerCard", template: "<div class='shimmer-card-stub' />" },
}));

// --- Mock v3-infinite-loading + its css --------------------------------------
vi.mock("v3-infinite-loading/lib/style.css", () => ({}));
vi.mock("v3-infinite-loading", () => ({
  default: {
    name: "InfiniteLoading",
    props: ["target"],
    emits: ["infinite"],
    // Render the spinner/complete/error slots so their template branches
    // (and the @click="retry" binding) are instrumented.
    template: `
      <div class="infinite-loading-stub">
        <slot name="spinner" />
        <slot name="complete" />
        <slot name="error" :retry="retry" />
      </div>
    `,
    methods: {
      retry() {},
    },
  },
}));

// --- Mock vue-router ----------------------------------------------------------
let routeParams;
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: routeParams }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import Index from "./Index.vue";

const makeArticle = (id) => ({ id, title: `Article ${id}` });

const mountView = () =>
  mount(Index, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  routeParams = { slug: "sports" };
  // Default: one page of articles with a named category.
  getCategoryArticles.mockResolvedValue({
    data: {
      articles: [makeArticle(1), makeArticle(2)],
      category: { name: "Sports" },
    },
  });
});

describe("Category/Index.vue", () => {
  it("shows the shimmer loading state while the initial fetch is in flight", async () => {
    let resolveFetch;
    getCategoryArticles.mockReturnValueOnce(
      new Promise((res) => {
        resolveFetch = res;
      })
    );

    const wrapper = mountView();
    await nextTick();

    // loading branch: isLoading && articles.length == 0
    const shimmers = wrapper.findAll(".shimmer-card-stub");
    expect(shimmers).toHaveLength(4);
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
    expect(wrapper.find("h1").exists()).toBe(false);

    resolveFetch({
      data: { articles: [makeArticle(1)], category: { name: "Sports" } },
    });
    await flushPromises();
    await nextTick();
    expect(wrapper.find(".shimmer-card-stub").exists()).toBe(false);
  });

  it("fetches on mount and renders the articles content state", async () => {
    const wrapper = mountView();

    // initial fetch is issued on mount with page 0 and size 5
    expect(getCategoryArticles).toHaveBeenCalledWith("sports", {
      size: 5,
      page: 0,
    });

    await flushPromises();
    await nextTick();

    // success path: articles rendered via NewsCard
    const cards = wrapper.findAll(".news-card-stub");
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toBe("1");

    // pageTitle resolved from the category name
    expect(wrapper.find("h1").text()).toBe("Category: Sports");
    // content container (with scrollTarget ref) is present
    expect(wrapper.find(".news-articles").exists()).toBe(true);
    // empty-state message is NOT shown
    expect(wrapper.text()).not.toContain("No articles found in this category.");
  });

  it("falls back to the slug-based title when the category name is missing", async () => {
    getCategoryArticles.mockResolvedValueOnce({
      data: { articles: [makeArticle(1)] }, // no category -> nullish coalescing fallback
    });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // `res.data?.category?.name ?? \`Category: ${slug}\`` -> the ?? fallback
    expect(wrapper.find("h1").text()).toBe("Category: Category: sports");
  });

  it("shows the empty state when the initial fetch returns no articles", async () => {
    getCategoryArticles.mockResolvedValueOnce({ data: { articles: [] } });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // empty branch: articles.length === 0 (and not loading)
    expect(wrapper.text()).toContain("No articles found in this category.");
    expect(wrapper.find(".news-card-stub").exists()).toBe(false);
    expect(wrapper.find(".news-articles").exists()).toBe(false);
    // pageTitle keeps the initial "Category: <slug>" set in the isInitial branch
    expect(wrapper.find("h1").text()).toBe("Category: Category: sports");
  });

  it("treats a response with no data object as empty (optional-chaining branch)", async () => {
    getCategoryArticles.mockResolvedValueOnce({});

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // res.data?.articles?.length is falsy -> hasMore false, empty state
    expect(wrapper.text()).toContain("No articles found in this category.");
  });

  it("logs and recovers when the initial fetch rejects (catch path)", async () => {
    const err = new Error("boom");
    getCategoryArticles.mockRejectedValueOnce(err);
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(consoleErr).toHaveBeenCalledWith(err);
    // finally: isLoading false; no articles -> empty state
    expect(wrapper.text()).toContain("No articles found in this category.");

    consoleErr.mockRestore();
  });

  describe("loadMore (infinite loading)", () => {
    const getInfinite = (wrapper) =>
      wrapper.findComponent({ name: "InfiniteLoading" });

    it("loads the next page and marks loaded when more data is available", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      getCategoryArticles.mockClear();
      getCategoryArticles.mockResolvedValueOnce({
        data: { articles: [makeArticle(3)], category: { name: "Sports" } },
      });

      const $state = { loaded: vi.fn(), complete: vi.fn() };
      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();
      await nextTick();

      // non-initial fetch: page is still 0 here (incremented AFTER load), size 5
      expect(getCategoryArticles).toHaveBeenCalledWith("sports", {
        size: 5,
        page: 0,
      });
      expect($state.loaded).toHaveBeenCalled();
      expect($state.complete).not.toHaveBeenCalled();

      // pushed onto the existing list (non-initial branch)
      expect(wrapper.findAll(".news-card-stub")).toHaveLength(3);
    });

    it("increments the page so subsequent loads request the next page", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const $state = { loaded: vi.fn(), complete: vi.fn() };

      getCategoryArticles.mockResolvedValueOnce({
        data: { articles: [makeArticle(3)] },
      });
      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      getCategoryArticles.mockClear();
      getCategoryArticles.mockResolvedValueOnce({
        data: { articles: [makeArticle(4)] },
      });
      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      // currentPage was bumped to 1 after the first successful loadMore
      expect(getCategoryArticles).toHaveBeenCalledWith("sports", {
        size: 5,
        page: 1,
      });
    });

    it("completes the loader when a load returns no new articles", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      // next fetch returns empty -> fetchData returns [] -> $state.complete()
      getCategoryArticles.mockResolvedValueOnce({ data: { articles: [] } });
      const $state = { loaded: vi.fn(), complete: vi.fn() };

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect($state.complete).toHaveBeenCalled();
      expect($state.loaded).not.toHaveBeenCalled();
    });

    it("completes the loader immediately when there is no more data (hasMore false)", async () => {
      // Initial fetch returns empty -> hasMore becomes false. But empty state
      // hides InfiniteLoading, so drive loadMore through the component instance.
      getCategoryArticles.mockResolvedValueOnce({ data: { articles: [] } });
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const $state = { loaded: vi.fn(), complete: vi.fn() };
      getCategoryArticles.mockClear();

      await wrapper.vm.loadMore($state);
      await flushPromises();

      // !hasMore guard -> complete() and NO further fetch
      expect($state.complete).toHaveBeenCalled();
      expect($state.loaded).not.toHaveBeenCalled();
      expect(getCategoryArticles).not.toHaveBeenCalled();
    });

    it("completes the loader when loadMore's fetch rejects (catch path)", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
      // fetchData rejects -> catch logs, sets hasMore false, returns [] ->
      // loadMore sees an empty array -> $state.complete().
      const err = new Error("load failed");
      getCategoryArticles.mockRejectedValueOnce(err);
      const $state = { loaded: vi.fn(), complete: vi.fn() };

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect(consoleErr).toHaveBeenCalledWith(err);
      expect($state.complete).toHaveBeenCalled();
      expect($state.loaded).not.toHaveBeenCalled();
      consoleErr.mockRestore();
    });
  });

  it("renders the infinite-loading spinner, complete and error slot templates", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // spinner slot
    expect(wrapper.find(".infinite-loading-spinner").exists()).toBe(true);
    // complete slot
    expect(wrapper.find(".infinite-loading-complete").text()).toContain("End!");
    // error slot with retry button
    const errorBlock = wrapper.find(".infinite-loading-error");
    expect(errorBlock.exists()).toBe(true);
    expect(errorBlock.text()).toContain("Error loading.");

    // click retry to exercise the @click="retry" binding
    const retryBtn = errorBlock.find("button");
    expect(retryBtn.text()).toBe("Retry");
    await retryBtn.trigger("click");
  });
});
