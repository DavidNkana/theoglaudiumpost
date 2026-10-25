import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock services (external boundaries) -------------------------------------
const getArticles = vi.fn();
const getAds = vi.fn();

vi.mock("@/features/articles/ArticlesService", () => ({
  getArticles: (...args) => getArticles(...args),
}));

vi.mock("@/features/ads/AdsService", () => ({
  getAdByPlacement: vi.fn(),
  trackImpression: vi.fn(),
  trackClick: vi.fn(),
  getAllAdByPlacement: vi.fn(),
  getAds: (...args) => getAds(...args),
}));

// --- Mock v3-infinite-loading + its css --------------------------------------
vi.mock("v3-infinite-loading/lib/style.css", () => ({}));
vi.mock("v3-infinite-loading", () => ({
  default: {
    name: "InfiniteLoading",
    emits: ["infinite"],
    // Render the complete + error slots so their template branches are covered.
    template: `
      <div class="infinite-loading-stub">
        <slot name="complete" />
        <slot name="error" :retry="retry" />
      </div>
    `,
    methods: {
      retry() {},
    },
  },
}));

// --- Mock heavy child components ---------------------------------------------
// MasonryGrid: render the #item slot for every item so PinCard / PinAdCard
// branches are exercised, and the #empty slot so its template renders.
vi.mock("@/components/MasonryGrid.vue", () => ({
  default: {
    name: "MasonryGrid",
    props: ["items", "loading", "empty", "columnWidth", "gap"],
    template: `
      <div class="masonry-grid-stub">
        <div class="masonry-items">
          <template v-for="(item, i) in items" :key="i">
            <slot name="item" :item="item" />
          </template>
        </div>
        <div class="masonry-empty"><slot name="empty" /></div>
      </div>
    `,
  },
}));

vi.mock("@/components/PinCard.vue", () => ({
  default: {
    name: "PinCard",
    props: ["article", "isTopStory", "isFeatured", "isPopular"],
    template: `<div class="pin-card-stub" :data-id="article && article.id"
      :data-top="String(isTopStory)" :data-featured="String(isFeatured)"
      :data-popular="String(isPopular)"></div>`,
  },
}));

vi.mock("@/components/PinAdCard.vue", () => ({
  default: {
    name: "PinAdCard",
    props: ["ad"],
    template: `<div class="pin-ad-card-stub" :data-ad-id="ad && ad.id"></div>`,
  },
}));

vi.mock("@/components/ShimmerCard.vue", () => ({
  default: { name: "ShimmerCard", template: "<div class='shimmer-stub' />" },
}));

import NewspaperView from "./NewspaperView.vue";

// --- Helpers -----------------------------------------------------------------
const article = (id, extra = {}) => ({ id, ...extra });

const articlesResponse = (articles, totalPages = 1, status = 200) => ({
  status,
  data: { articles, totalPages },
});

const mountView = (props = {}) =>
  mount(NewspaperView, {
    props,
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  // Sensible defaults so onMounted does not blow up.
  getArticles.mockResolvedValue(articlesResponse([], 1));
  getAds.mockResolvedValue({ data: { ads: [] } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewspaperView", () => {
  it("renders the container and infinite loading slots (complete + error)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".newspaper-view").exists()).toBe(true);
    expect(wrapper.find(".newspaper-container").exists()).toBe(true);
    // complete slot
    expect(wrapper.find(".infinite-loading-complete").text()).toContain(
      "End of content"
    );
    // error slot with retry button
    expect(wrapper.find(".infinite-loading-error").exists()).toBe(true);
    await wrapper.find(".infinite-loading-error button").trigger("click");
  });

  it("renders the empty slot message when there are no articles", async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.find(".no-articles-message h3").text()).toBe(
      "No articles found"
    );
  });

  it("fetchPosts (page 0, status 200) processes article_type / type / default", async () => {
    getArticles.mockResolvedValueOnce(
      articlesResponse(
        [
          article(1, { article_type: "top" }),
          article(2, { type: "featured" }),
          article(3),
        ],
        1
      )
    );
    const wrapper = mountView();
    await flushPromises();

    const cards = wrapper.findAll(".pin-card-stub");
    expect(cards.length).toBe(3);
    // article_type "top" -> isTopStory true
    expect(cards[0].attributes("data-top")).toBe("true");
    // type "featured" -> isFeatured true
    expect(cards[1].attributes("data-featured")).toBe("true");
    // default "regular" -> none set
    expect(cards[2].attributes("data-top")).toBe("false");
  });

  it("getArticles is called with latest-mode date filter (startDate set, endDate null)", async () => {
    mountView({ mode: "latest", windowDays: 14 });
    await flushPromises();
    const args = getArticles.mock.calls[0][0];
    expect(args.startDate).toEqual(expect.any(String));
    expect(args.endDate).toBeNull();
    expect(args.category).toBe("");
    expect(args.status).toBe("published");
  });

  it("getArticles is called with archive-mode date filter (startDate null, endDate set)", async () => {
    mountView({ mode: "archive", windowDays: 7 });
    await flushPromises();
    const args = getArticles.mock.calls[0][0];
    expect(args.startDate).toBeNull();
    expect(args.endDate).toEqual(expect.any(String));
  });

  it("uses default props when mode/windowDays omitted (validator passes)", () => {
    // exercise the prop validator with a valid value
    const validator = NewspaperView.props.mode.validator;
    expect(validator("latest")).toBe(true);
    expect(validator("archive")).toBe(true);
    expect(validator("nope")).toBe(false);
  });

  it("fetchPosts non-200 response leaves articles untouched but stops loading", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(9)], 1, 500));
    const wrapper = mountView();
    await flushPromises();
    // status !== 200 branch: processing block skipped, no cards rendered
    expect(wrapper.findAll(".pin-card-stub").length).toBe(0);
    expect(wrapper.find(".no-articles-message").exists()).toBe(true);
  });

  it("fetchPosts page-0 empty articles array hits the mock-data fallback", async () => {
    // allArticles null -> processedArticles []  AND empty fallback branch
    getArticles.mockResolvedValueOnce({
      status: 200,
      data: { articles: null, totalPages: 1 },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll(".pin-card-stub").length).toBe(0);
  });

  it("fetchPosts catch path (rejected) keeps view in empty state", async () => {
    getArticles.mockRejectedValueOnce(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll(".pin-card-stub").length).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching posts:",
      expect.any(Error)
    );
  });

  it("content computed mixes ads in after every 4 articles (cycling ads)", async () => {
    getArticles.mockResolvedValueOnce(
      articlesResponse(
        [1, 2, 3, 4, 5, 6].map((id) => article(id)),
        1
      )
    );
    getAds.mockResolvedValueOnce({
      data: { ads: [{ id: "a1", placement_id: 1, status: "active" }] },
    });
    const wrapper = mountView();
    await flushPromises();

    // 6 articles + ads inserted at index 0 and index 4 => 2 ads
    expect(wrapper.findAll(".pin-card-stub").length).toBe(6);
    expect(wrapper.findAll(".pin-ad-card-stub").length).toBe(2);
  });

  it("content computed returns ads-only when there are no articles", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([], 1));
    getAds.mockResolvedValueOnce({
      data: { ads: [{ id: "a1", placement_id: 1, status: "active" }] },
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll(".pin-card-stub").length).toBe(0);
    expect(wrapper.findAll(".pin-ad-card-stub").length).toBe(1);
  });

  it("articles computed returns [] (and logs) when articlesData is not an array", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(1)], 1));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll(".pin-card-stub").length).toBe(1);

    // Corrupt the reactive state to hit the defensive non-array guard.
    wrapper.vm.articlesData = "not-an-array";
    await nextTick();

    expect(wrapper.findAll(".pin-card-stub").length).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      "articlesData is not an array:",
      "not-an-array"
    );
  });

  it("fetchAd filters ads: placement_id===1 active in-range passes; others fail", async () => {
    // 5 articles -> ad slots at index 0 and 4 -> renders ads[0] and ads[1]
    getArticles.mockResolvedValueOnce(
      articlesResponse([1, 2, 3, 4, 5].map((id) => article(id)), 1)
    );
    const future = "2999-01-01T00:00:00Z";
    const past = "2000-01-01T00:00:00Z";
    getAds.mockResolvedValueOnce({
      data: {
        ads: [
          // passes: placement_id 1, active, within range (no dates)
          { id: "pass1", placement_id: 1, status: "active" },
          // passes via placement_info text + explicit valid date range
          {
            id: "pass2",
            placement_id: 99,
            placement_info: "Some MAIN PAGE AD here",
            status: "Active",
            placement_date: past,
            expiry_date: future,
          },
          // fails: wrong placement + no info
          { id: "fail-placement", placement_id: 2, status: "active" },
          // fails: inactive
          { id: "fail-status", placement_id: 1, status: "paused" },
          // fails: placement_date in the future
          {
            id: "fail-future",
            placement_id: 1,
            status: "active",
            placement_date: future,
          },
          // fails: expiry_date in the past
          {
            id: "fail-expired",
            placement_id: 1,
            status: "active",
            expiry_date: past,
          },
        ],
      },
    });
    const wrapper = mountView();
    await flushPromises();
    const adIds = wrapper
      .findAll(".pin-ad-card-stub")
      .map((c) => c.attributes("data-ad-id"));
    expect(adIds).toContain("pass1");
    expect(adIds).toContain("pass2");
    expect(adIds).not.toContain("fail-placement");
    expect(adIds).not.toContain("fail-status");
    expect(adIds).not.toContain("fail-future");
    expect(adIds).not.toContain("fail-expired");
  });

  it("fetchAd reads ads from response.ads when response.data.ads is absent", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([], 1));
    getAds.mockResolvedValueOnce({
      ads: [{ id: "fromTop", placement_id: 1, status: "active" }],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(
      wrapper.find(".pin-ad-card-stub").attributes("data-ad-id")
    ).toBe("fromTop");
  });

  it("fetchAd falls back to [] when response has neither data.ads nor ads", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(1)], 1));
    getAds.mockResolvedValueOnce(null);
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll(".pin-ad-card-stub").length).toBe(0);
  });

  it("fetchAd catch path logs error", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(1)], 1));
    getAds.mockRejectedValueOnce(new Error("ad fail"));
    const wrapper = mountView();
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching ad:",
      expect.any(Error)
    );
    expect(wrapper.findAll(".pin-ad-card-stub").length).toBe(0);
  });

  it("selectCategory: 'all' selection sends empty category filter and refetches", async () => {
    getArticles.mockResolvedValue(articlesResponse([article(1)], 1));
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();

    wrapper.vm.selectCategory("all");
    await flushPromises();
    expect(getArticles).toHaveBeenCalledTimes(1);
    expect(getArticles.mock.calls[0][0].category).toBe("");
  });

  it("selectCategory: specific category filters the rendered articles", async () => {
    getArticles.mockResolvedValue(
      articlesResponse(
        [
          article(1, { category: { name: "Sports" } }),
          article(2, { category: { name: "News" } }),
          article(3), // no category -> article.category falsy -> filtered out
        ],
        1
      )
    );
    const wrapper = mountView();
    await flushPromises();
    getArticles.mockClear();

    wrapper.vm.selectCategory("Sports");
    await flushPromises();

    expect(getArticles.mock.calls[0][0].category).toBe("Sports");
    const cards = wrapper.findAll(".pin-card-stub");
    expect(cards.length).toBe(1);
    expect(cards[0].attributes("data-id")).toBe("1");
  });

  it("loadMore: appends next page and calls $state.loaded when more pages remain", async () => {
    getArticles.mockResolvedValueOnce(
      articlesResponse([article(1)], 3) // totalPages 3 -> hasMore true
    );
    const wrapper = mountView();
    await flushPromises();

    getArticles.mockResolvedValueOnce(articlesResponse([article(2)], 3));
    const $state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore($state);
    await flushPromises();

    expect($state.loaded).toHaveBeenCalled();
    expect($state.complete).not.toHaveBeenCalled();
    // appended -> two cards now
    expect(wrapper.findAll(".pin-card-stub").length).toBe(2);
  });

  it("loadMore: calls $state.complete when no more pages", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(1)], 1));
    const wrapper = mountView();
    await flushPromises();

    getArticles.mockResolvedValueOnce(articlesResponse([article(2)], 1));
    const $state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore($state);
    await flushPromises();

    expect($state.complete).toHaveBeenCalled();
    expect($state.loaded).not.toHaveBeenCalled();
  });

  it("loadMore: early-returns while isLoading is true", async () => {
    // Make the initial fetch hang so isLoading stays true.
    let resolveInitial;
    getArticles.mockReturnValueOnce(
      new Promise((res) => {
        resolveInitial = res;
      })
    );
    const wrapper = mountView();
    await nextTick();

    const $state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore($state);
    // isLoading is true -> early return, no $state interaction
    expect($state.loaded).not.toHaveBeenCalled();
    expect($state.complete).not.toHaveBeenCalled();

    resolveInitial(articlesResponse([], 1));
    await flushPromises();
  });

  it("loadMore: error response from fetchPosts triggers $state.complete", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(1)], 3));
    const wrapper = mountView();
    await flushPromises();

    // Next fetch rejects -> fetchPosts resolves to {status:'error'}
    getArticles.mockRejectedValueOnce(new Error("page fail"));
    const $state = { loaded: vi.fn(), complete: vi.fn() };
    wrapper.vm.loadMore($state);
    await flushPromises();

    expect($state.complete).toHaveBeenCalled();
    expect($state.loaded).not.toHaveBeenCalled();
  });

  it("loadMore: catch path when fetchPosts chain throws synchronously", async () => {
    getArticles.mockResolvedValueOnce(articlesResponse([article(1)], 3));
    const wrapper = mountView();
    await flushPromises();

    // $state.loaded throws -> the .then callback throws -> .catch runs.
    const err = new Error("loaded throws");
    const $state = {
      loaded: vi.fn(() => {
        throw err;
      }),
      complete: vi.fn(),
    };
    getArticles.mockResolvedValueOnce(articlesResponse([article(2)], 3));
    wrapper.vm.loadMore($state);
    await flushPromises();

    expect($state.complete).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load more posts:",
      err
    );
  });

  it("onMounted initial fetchPosts rejection is handled by fetchPosts' own catch", async () => {
    getArticles.mockRejectedValueOnce(new Error("initial fail"));
    mountView();
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching posts:",
      expect.any(Error)
    );
  });
});
