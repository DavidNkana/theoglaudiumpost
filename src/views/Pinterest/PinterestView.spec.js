import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";

// ---- Mock external service boundaries ----
vi.mock("@/features/ads/AdsService", () => ({
  getAdByPlacement: vi.fn(),
  trackImpression: vi.fn(),
  trackClick: vi.fn(),
}));
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticles: vi.fn(),
}));

// v3-infinite-loading ships a side-effect CSS import; stub the package so we
// can render its slots and capture the @infinite handler.
vi.mock("v3-infinite-loading", () => ({
  default: defineComponent({
    name: "InfiniteLoading",
    emits: ["infinite"],
    setup(_, { slots }) {
      return () =>
        h("div", { class: "infinite-loading-stub" }, [
          slots.spinner ? slots.spinner() : null,
          slots.complete ? slots.complete() : null,
          slots.error ? slots.error({ retry: () => {} }) : null,
        ]);
    },
  }),
}));
vi.mock("v3-infinite-loading/lib/style.css", () => ({}));

import { getAdByPlacement, trackImpression, trackClick } from "@/features/ads/AdsService";
import { getArticles } from "@/features/articles/ArticlesService";
import PinterestView from "@/views/Pinterest/PinterestView.vue";

// ---- Child component stubs ----
// MasonryGrid renders the #item slot for every item and the #empty slot when
// there are no items, and exposes positionItems() so updateMasonryLayout runs.
const positionItems = vi.fn();
const MasonryGridStub = defineComponent({
  name: "MasonryGrid",
  props: ["items", "loading", "columnWidth", "gap"],
  setup(props, { slots, expose }) {
    expose({ positionItems });
    return () =>
      h("div", { class: "masonry-grid-stub" }, [
        props.items.length === 0 && slots.empty
          ? slots.empty()
          : props.items.map((item) => h("div", { key: item.id }, slots.item ? slots.item({ item }) : [])),
      ]);
  },
});

const PinCardStub = defineComponent({
  name: "PinCard",
  props: ["article", "isTopStory", "isFeatured", "isPopular"],
  emits: ["loaded"],
  setup(props, { emit }) {
    return () =>
      h(
        "div",
        {
          class: "pin-card-stub",
          "data-top": String(props.isTopStory),
          "data-featured": String(props.isFeatured),
          "data-popular": String(props.isPopular),
          onClick: () => emit("loaded"),
        },
        props.article && props.article.title ? props.article.title : ""
      );
  },
});

const ShimmerCardStub = { name: "ShimmerCard", template: "<div />" };

const mountView = () =>
  mount(PinterestView, {
    global: {
      stubs: {
        MasonryGrid: MasonryGridStub,
        PinCard: PinCardStub,
        ShimmerCard: ShimmerCardStub,
      },
    },
  });

const okResponse = (articles, totalPages = 1) => ({
  status: 200,
  data: { articles, totalPages },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Default happy-path mocks; individual tests override as needed.
  getArticles.mockResolvedValue(okResponse([], 1));
  getAdByPlacement.mockResolvedValue({ status: 200, data: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PinterestView.vue", () => {
  it("renders articles, sets PinCard type flags, and orders newest first", async () => {
    const articles = [
      { id: 1, title: "Old", article_type: "regular", created_at: "2020-01-01T00:00:00Z" },
      { id: 2, title: "Top", type: "top", created_at: "2024-01-01T00:00:00Z" },
    ];
    getArticles.mockResolvedValue(okResponse(articles, 2));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const cards = wrapper.findAll(".pin-card-stub");
    expect(cards).toHaveLength(2);
    // Newest (2024 "Top") sorted first.
    expect(cards[0].text()).toBe("Top");
    expect(cards[0].attributes("data-top")).toBe("true");
    expect(cards[0].attributes("data-featured")).toBe("false");
    expect(cards[1].text()).toBe("Old");

    // getArticles invoked with the all-articles query (category empty for "all").
    expect(getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ type: "", size: 26, page: 0, status: "published", category: "", sort: "created_at:desc" })
    );
    // positionItems eventually runs via watch + onMounted layout updates.
    expect(positionItems).toHaveBeenCalled();
  });

  it("uses mock data fallback when API returns an empty list on page 0", async () => {
    getArticles.mockResolvedValue(okResponse([], 1));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const cards = wrapper.findAll(".pin-card-stub");
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.text())).toEqual([
      "Sample Article 1",
      "Sample Article 2",
      "Sample Article 3",
    ]);
  });

  it("uses mock data fallback when the fetch rejects on page 0 (catch path)", async () => {
    getArticles.mockRejectedValue(new Error("boom"));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.findAll(".pin-card-stub")).toHaveLength(3);
    expect(console.error).toHaveBeenCalledWith("Error fetching posts:", expect.any(Error));
  });

  it("logs raw article_type values and sorts by id when timestamps are missing", async () => {
    const articles = [
      { id: 5, title: "A", article_type: "featured" }, // no timestamp
      { id: 9, title: "B" }, // no timestamp, no type -> 'regular'
    ];
    getArticles.mockResolvedValue(okResponse(articles, 1));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const cards = wrapper.findAll(".pin-card-stub");
    // id desc fallback: 9 before 5.
    expect(cards[0].text()).toBe("B");
    expect(cards[1].text()).toBe("A");
    expect(cards[0].attributes("data-featured")).toBe("false");
    expect(cards[1].attributes("data-featured")).toBe("true");
  });

  it("orders entries with one missing and one present timestamp (NaN tb / NaN ta branches)", async () => {
    const articles = [
      { id: 1, title: "HasDate", created_at: "2023-05-05T00:00:00Z" },
      { id: 2, title: "NoDate" },
      { id: 3, title: "AlsoHasDate", published_at: "2025-05-05T00:00:00Z" },
    ];
    getArticles.mockResolvedValue(okResponse(articles, 1));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const titles = wrapper.findAll(".pin-card-stub").map((c) => c.text());
    // Both NaN branches of the comparator run; the dated pair is ordered newest
    // first relative to each other, and the undated article is still present.
    expect(titles).toHaveLength(3);
    expect(titles).toContain("NoDate");
    expect(titles.indexOf("AlsoHasDate")).toBeLessThan(titles.indexOf("HasDate"));
  });

  it("falls back to 0 when sorting two undated articles that both lack ids", async () => {
    // Two undated, id-less articles drive the (b?.id || 0) - (a?.id || 0)
    // default-to-zero branches in the comparator.
    const articles = [
      { title: "NoIdA" },
      { title: "NoIdB" },
    ];
    getArticles.mockResolvedValue(okResponse(articles, 1));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const titles = wrapper.findAll(".pin-card-stub").map((c) => c.text());
    expect(titles).toHaveLength(2);
    expect(titles).toEqual(expect.arrayContaining(["NoIdA", "NoIdB"]));
  });

  it("ignores responses whose status is not 200", async () => {
    // Non-200 status skips the processing block; page 0 with no articles then
    // falls back to mock data is NOT triggered here because the block is skipped
    // entirely, leaving articlesData empty -> empty state slot.
    getArticles.mockResolvedValue({ status: 204, data: { articles: [], totalPages: 0 } });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.findAll(".pin-card-stub")).toHaveLength(0);
    expect(wrapper.find(".no-articles-message").exists()).toBe(true);
  });

  it("updateMasonryLayout is a no-op when the grid ref is null", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    positionItems.mockClear();
    // Null the template ref so updateMasonryLayout takes its falsy branch.
    wrapper.vm.masonryGridRef = null;
    wrapper.vm.updateMasonryLayout();
    await nextTick();
    await nextTick();

    expect(positionItems).not.toHaveBeenCalled();
  });

  it("renders the empty-state slot when no articles match the selected category", async () => {
    const articles = [
      { id: 1, title: "Comm", created_at: "2024-01-01T00:00:00Z", category: { name: "Community" } },
    ];
    getArticles.mockResolvedValue(okResponse(articles, 1));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // Select a category with no matching articles -> empty slot shows.
    await wrapper.vm.selectCategory("Sports");
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".no-articles-message").exists()).toBe(true);
    expect(wrapper.text()).toContain("No articles found");
  });

  it("filters articles by category and passes the category to the service", async () => {
    const articles = [
      { id: 1, title: "Comm", created_at: "2024-01-01T00:00:00Z", category: { name: "Community" } },
      { id: 2, title: "Biz", created_at: "2024-01-02T00:00:00Z", category: { name: "Business" } },
      { id: 3, title: "NoCat", created_at: "2024-01-03T00:00:00Z" },
    ];
    getArticles.mockResolvedValue(okResponse(articles, 1));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    await wrapper.vm.selectCategory("Community");
    await flushPromises();
    await nextTick();

    const titles = wrapper.findAll(".pin-card-stub").map((c) => c.text());
    expect(titles).toEqual(["Comm"]);
    expect(getArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: "Community" })
    );
  });

  it("renders the ad card, tracks impression, and tracks click", async () => {
    getAdByPlacement.mockResolvedValue({
      status: 200,
      data: {
        id: 42,
        title: "Buy Now",
        description: "Great deal",
        url: "https://example.com",
        image_url: "https://example.com/img.png",
      },
    });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".ad-card").exists()).toBe(true);
    expect(wrapper.find(".card-title").text()).toBe("Buy Now");
    expect(wrapper.find(".card-text").text()).toBe("Great deal");
    expect(wrapper.find(".ad-image img").attributes("src")).toBe("https://example.com/img.png");
    expect(trackImpression).toHaveBeenCalledWith(42);

    await wrapper.find("a.btn-dark").trigger("click");
    expect(trackClick).toHaveBeenCalledWith(42);
  });

  it("renders the ad without an image and without tracking impression when id is absent", async () => {
    getAdByPlacement.mockResolvedValue({
      status: 200,
      data: { title: "NoId Ad", description: "desc", url: "https://x.test" },
    });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".ad-card").exists()).toBe(true);
    expect(wrapper.find(".ad-image").exists()).toBe(false);
    expect(trackImpression).not.toHaveBeenCalled();
  });

  it("does not render the ad card when the placement response has no data", async () => {
    getAdByPlacement.mockResolvedValue({ status: 200, data: null });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".ad-card").exists()).toBe(false);
  });

  it("handles ad fetch rejection (catch path) without rendering an ad", async () => {
    getAdByPlacement.mockRejectedValue(new Error("ad boom"));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".ad-card").exists()).toBe(false);
    expect(console.error).toHaveBeenCalledWith("Error fetching ad:", expect.any(Error));
  });

  it("guards updateMasonryLayout when the grid ref is missing (computed error branch)", async () => {
    // Returning a non-array from the service drives the Array.isArray guard,
    // which also means MasonryGrid renders with zero items.
    getArticles.mockResolvedValue({ status: 200, data: { articles: null, totalPages: 1 } });

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // Force articlesData to a non-array so the computed logs and returns [].
    wrapper.vm.articlesData = "not-an-array";
    await nextTick();
    expect(wrapper.findAll(".pin-card-stub")).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(
      "articlesData is not an array:",
      "not-an-array"
    );
  });

  it("loadMore returns early while a fetch is in flight", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    wrapper.vm.isLoading = true;
    const state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore(state);
    await flushPromises();

    expect(state.loaded).not.toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
  });

  it("loadMore calls $state.loaded when more pages remain", async () => {
    // Page 0 has 2 pages so hasMore stays true after loading page 1.
    getArticles.mockImplementation(({ page }) =>
      Promise.resolve(
        okResponse(
          [{ id: 100 + page, title: `P${page}`, created_at: `2024-0${page + 1}-01T00:00:00Z` }],
          5
        )
      )
    );

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore(state);
    await flushPromises();
    await nextTick();

    expect(state.loaded).toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
  });

  it("loadMore calls $state.complete when there are no more pages", async () => {
    getArticles.mockImplementation(({ page }) =>
      // totalPages 1 -> hasMore false after page increment.
      Promise.resolve(okResponse([{ id: 200 + page, title: `Q${page}`, created_at: "2024-01-01T00:00:00Z" }], 1))
    );

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore(state);
    await flushPromises();
    await nextTick();

    expect(state.complete).toHaveBeenCalled();
    expect(state.loaded).not.toHaveBeenCalled();
  });

  it("loadMore calls $state.complete when fetchPosts resolves with an error status", async () => {
    // First call (onMounted) succeeds; subsequent call rejects -> fetchPosts
    // resolves with { status: 'error' }.
    getArticles
      .mockResolvedValueOnce(okResponse([{ id: 1, title: "init", created_at: "2024-01-01T00:00:00Z" }], 3))
      .mockRejectedValueOnce(new Error("page fail"));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore(state);
    await flushPromises();
    await nextTick();

    expect(state.complete).toHaveBeenCalled();
    expect(state.loaded).not.toHaveBeenCalled();
  });

  it("loadMore catch path calls $state.complete when the success callback throws", async () => {
    // totalPages 3 -> hasMore true after page 1 so $state.loaded() is invoked;
    // making loaded() throw drives the .then() callback into loadMore's catch.
    getArticles.mockResolvedValue(
      okResponse([{ id: 1, title: "x", created_at: "2024-01-01T00:00:00Z" }], 3)
    );

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const state = {
      loaded: vi.fn(() => {
        throw new Error("loaded boom");
      }),
      complete: vi.fn(),
    };
    wrapper.vm.loadMore(state);
    await flushPromises();
    await nextTick();
    await flushPromises();

    expect(state.loaded).toHaveBeenCalled();
    expect(state.complete).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load more posts:",
      expect.any(Error)
    );
  });

  it("appends articles on subsequent pages instead of replacing them", async () => {
    getArticles
      .mockResolvedValueOnce(okResponse([{ id: 1, title: "first", created_at: "2024-01-01T00:00:00Z" }], 5))
      .mockResolvedValueOnce(okResponse([{ id: 2, title: "second", created_at: "2024-02-01T00:00:00Z" }], 5));

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore(state);
    await flushPromises();
    await nextTick();

    const titles = wrapper.findAll(".pin-card-stub").map((c) => c.text()).sort();
    expect(titles).toEqual(["first", "second"]);
  });

  it("renders the InfiniteLoading slot content (spinner, complete, error)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".infinite-loading-spinner").exists()).toBe(true);
    expect(wrapper.find(".infinite-loading-complete").text()).toContain("End of content");
    const errorEl = wrapper.find(".infinite-loading-error");
    expect(errorEl.exists()).toBe(true);
    // Exercise the retry button handler from the error slot.
    await errorEl.find("button").trigger("click");
  });

  it("emitting loaded from a PinCard triggers a layout update", async () => {
    getArticles.mockResolvedValue(
      okResponse([{ id: 1, title: "card", created_at: "2024-01-01T00:00:00Z" }], 1)
    );

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    positionItems.mockClear();
    await wrapper.find(".pin-card-stub").trigger("click");
    await nextTick();
    await nextTick();

    expect(positionItems).toHaveBeenCalled();
  });

  it("removes the window load listener on unmount", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("load", expect.any(Function));
  });
});
