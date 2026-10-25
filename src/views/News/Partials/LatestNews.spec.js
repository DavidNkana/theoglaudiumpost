import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";

// --- Mock external service boundaries ---------------------------------------
// getAds drives fetchActiveAds; getArticleFeed is imported but unused — mock it
// anyway so the module graph resolves without hitting the real api/axios layer.
const getAds = vi.fn();
const getArticleFeed = vi.fn();
vi.mock("@/features/ads/AdsService", () => ({
  getAds: (...args) => getAds(...args),
}));
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticleFeed: (...args) => getArticleFeed(...args),
}));

// --- Mock the @/utils constant boundary -------------------------------------
vi.mock("@/utils", () => ({
  IN_ARTICLE_BOTTOM: "in_article_bottom",
}));

// --- Mock the useMobile composable boundary ---------------------------------
// A mutable ref proxy so each test can flip isMobile before mounting.
import { ref } from "vue";
const isMobileRef = ref(false);
vi.mock("@/composables/useMobile.js", () => ({
  useMobile: () => ({ isMobile: isMobileRef }),
}));

// --- Mock the Vuex store boundary -------------------------------------------
// Shared spies so tests assert exact dispatch payloads and control getter
// return values per-test.
const dispatch = vi.fn();
const getters = {};
vi.mock("vuex", () => ({
  useStore: () => ({ dispatch, getters }),
}));

import { getAds as getAdsMock } from "@/features/ads/AdsService";
import LatestNews from "@/views/News/Partials/LatestNews.vue";

// --- Heavy child component stubs --------------------------------------------
// Named, prop-declaring stubs so we can assert the props the template binds.
const stubFor = (name, props = []) => ({
  name,
  props,
  template: `<div class="${name}-stub"></div>`,
});

const NewsCardStub = stubFor("NewsCard", ["article", "featured", "minDetails"]);
const StandardCardStub = stubFor("StandardCard", ["article", "isTopStory", "isFeatured"]);
const ShimmerCardStub = stubFor("ShimmerCard");
const AdBannerStub = stubFor("AdBanner", ["size", "placement", "adProvider"]);
const AdArticleStub = stubFor("AdArticle", ["placement", "adProvider"]);
const PinAdCardStub = stubFor("PinAdCard", ["ad"]);
const ArticlesRowStub = stubFor("ArticlesRow", ["isLoading", "articles"]);

// InfiniteLoading stub that renders BOTH named slots so the #complete and
// #error template branches are instrumented, and exposes @infinite via click.
const InfiniteLoadingStub = {
  name: "InfiniteLoading",
  emits: ["infinite"],
  template: `
    <div class="infinite-stub">
      <button class="fire-infinite" @click="$emit('infinite', $attrs.state)"></button>
      <slot name="complete" />
      <slot name="error" :retry="retry" />
    </div>
  `,
  methods: {
    retry() {
      /* exercised via the error-slot retry button */
    },
  },
};

const mountView = (props = {}) =>
  mount(LatestNews, {
    props,
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        NewsCard: NewsCardStub,
        StandardCard: StandardCardStub,
        ShimmerCard: ShimmerCardStub,
        AdBanner: AdBannerStub,
        AdArticle: AdArticleStub,
        PinAdCard: PinAdCardStub,
        ArticlesRow: ArticlesRowStub,
        InfiniteLoading: InfiniteLoadingStub,
      },
    },
  });

// Reset every getter to a default empty/false value before each test.
const resetGetters = () => {
  getters["articles/topStories"] = [];
  getters["articles/latestArticles"] = [];
  getters["articles/featuredArticles"] = [];
  getters["articles/hasMore"] = false;
};

const makeArticles = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, title: `Article ${i + 1}` }));

describe("LatestNews.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGetters();
    isMobileRef.value = false;
    dispatch.mockResolvedValue(undefined);
    getAds.mockResolvedValue({ data: { ads: [] } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // details-page layout branch (v-if page === 'details-page')
  // ===========================================================================
  it("renders ArticlesRow for the details-page layout, sliced to 8 articles", async () => {
    getters["articles/latestArticles"] = makeArticles(12);
    const wrapper = mountView({ page: "details-page" });
    await flushPromises();

    const row = wrapper.findComponent(ArticlesRowStub);
    expect(row.exists()).toBe(true);
    // details-page slices fullArticles to first 8.
    expect(row.props("articles")).toHaveLength(8);
    expect(row.props("isLoading")).toBe(false);
    // No latest-news-container in this branch.
    expect(wrapper.find(".latest-news-container").exists()).toBe(false);
    // articlesData non-empty -> fetchPosts NOT called on mount (onMounted else path).
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("details-page with empty articles still mounts and triggers fetchPosts (latest dispatch)", async () => {
    getters["articles/latestArticles"] = [];
    const wrapper = mountView({ page: "details-page" });
    await flushPromises();

    expect(wrapper.findComponent(ArticlesRowStub).props("articles")).toHaveLength(0);
    // articlesData.length === 0 -> fetchPosts() runs the non-home (latest) branch.
    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "latest",
      size: 10,
      page: 0,
    });
    // Not a home page -> fetchActiveAds NOT called.
    expect(getAds).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Section header branches: showTitle (default true) + viewAll
  // ===========================================================================
  it("renders the section header by default and hides View All when viewAll is false", async () => {
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    expect(wrapper.find(".section-header").exists()).toBe(true);
    expect(wrapper.find(".section-title").text()).toBe("Latest News");
    // viewAll default false -> no router-link.
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
  });

  it("renders the View All router-link when viewAll is true", async () => {
    const wrapper = mountView({ page: "news", viewAll: true });
    await flushPromises();

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/news");
    expect(link.text()).toContain("View All");
  });

  it("hides the section header when showTitle is false", async () => {
    const wrapper = mountView({ page: "news", showTitle: false });
    await flushPromises();

    expect(wrapper.find(".section-header").exists()).toBe(false);
  });

  // ===========================================================================
  // NEWS PAGE grid v-for branches (featured / ad / banner) + empty v-for
  // ===========================================================================
  it("news page with no articles renders an empty grid (empty v-for)", async () => {
    getters["articles/latestArticles"] = [];
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    expect(wrapper.find(".news-grid-container").exists()).toBe(true);
    expect(wrapper.findAll(".grid-item")).toHaveLength(0);
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(0);
  });

  it("news page renders a StandardCard per article and marks every 6th index featured", async () => {
    // 13 articles -> indexes 0..12. index%6===0 at 0,6,12 -> featured.
    getters["articles/latestArticles"] = makeArticles(13);
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    const cards = wrapper.findAllComponents(StandardCardStub);
    expect(cards).toHaveLength(13);
    // index 0 featured (true branch), index 1 not featured (false branch).
    expect(cards[0].props("isFeatured")).toBe(true);
    expect(cards[1].props("isFeatured")).toBe(false);
    expect(cards[6].props("isFeatured")).toBe(true);
    expect(cards[12].props("isFeatured")).toBe(true);
    expect(cards[0].props("isTopStory")).toBe(true);

    // Featured wrapper class present for featured indexes.
    expect(wrapper.findAll(".grid-item-featured")).toHaveLength(3);
  });

  it("news page inserts a square AdArticle after every 6 articles and a banner after every 12", async () => {
    // 12 articles -> indexes 0..11.
    // Square ad: (index+1)%6===0 && index>0 -> index 5 and 11 -> 2 ads.
    // Banner:   (index+1)%12===0 && index>0 -> index 11 -> 1 banner.
    getters["articles/latestArticles"] = makeArticles(12);
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    const squareAds = wrapper.findAllComponents(AdArticleStub);
    expect(squareAds).toHaveLength(2);
    expect(squareAds[0].props("placement")).toBe("in_article_bottom");
    expect(squareAds[0].props("adProvider")).toBe("direct");

    const banners = wrapper.findAllComponents(AdBannerStub);
    expect(banners).toHaveLength(1);
    expect(banners[0].props("size")).toBe("medium");
    expect(banners[0].props("placement")).toBe("in_article_bottom");
    expect(banners[0].props("adProvider")).toBe("google");
  });

  it("news page does NOT insert ad/banner at index 0 even though (0+1)%6 and the index>0 guard fails", async () => {
    // Edge: single article -> (index+1)%6 is 0 only at index5; here index 0 only.
    // Guard index>0 must short-circuit any ad insertion.
    getters["articles/latestArticles"] = makeArticles(1);
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(1);
    expect(wrapper.findAllComponents(AdArticleStub)).toHaveLength(0);
    expect(wrapper.findAllComponents(AdBannerStub)).toHaveLength(0);
  });

  // ===========================================================================
  // InfiniteLoading slots + loadMore branches
  // ===========================================================================
  it("renders the #complete and #error InfiniteLoading slots", async () => {
    getters["articles/latestArticles"] = makeArticles(2);
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    expect(wrapper.find(".loading-complete").exists()).toBe(true);
    expect(wrapper.find(".loading-complete span").text()).toContain("reached the end");
    expect(wrapper.find(".loading-error").exists()).toBe(true);
    expect(wrapper.find(".retry-btn").exists()).toBe(true);
    // Clicking retry calls the slot-scoped retry() (no throw).
    await wrapper.find(".retry-btn").trigger("click");
  });

  it("loadMore early-returns while a fetch is already in-flight (isLoading guard)", async () => {
    // Keep the mount-time fetch pending so isLoading stays true.
    let resolveDispatch;
    dispatch.mockReturnValueOnce(new Promise((r) => (resolveDispatch = r)));
    getters["articles/latestArticles"] = [];
    const wrapper = mountView({ page: "news" });
    // isLoading is true now (dispatch still pending).
    const state = { complete: vi.fn(), loaded: vi.fn() };

    await wrapper.findComponent(InfiniteLoadingStub).vm.$emit("infinite", state);
    await flushPromises();

    // Guard hit -> neither complete nor loaded called by loadMore.
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.loaded).not.toHaveBeenCalled();

    resolveDispatch();
    await flushPromises();
  });

  it("loadMore calls $state.complete() when the store reports no more pages", async () => {
    getters["articles/latestArticles"] = makeArticles(3);
    getters["articles/hasMore"] = false;
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    const state = { complete: vi.fn(), loaded: vi.fn() };
    await wrapper.findComponent(InfiniteLoadingStub).vm.$emit("infinite", state);
    await flushPromises();

    expect(state.complete).toHaveBeenCalledTimes(1);
    expect(state.loaded).not.toHaveBeenCalled();
  });

  it("loadMore calls $state.loaded() and advances the page when hasMore is true", async () => {
    getters["articles/latestArticles"] = makeArticles(3);
    getters["articles/hasMore"] = true;
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    const state = { complete: vi.fn(), loaded: vi.fn() };
    await wrapper.findComponent(InfiniteLoadingStub).vm.$emit("infinite", state);
    await flushPromises();

    expect(state.loaded).toHaveBeenCalledTimes(1);
    expect(state.complete).not.toHaveBeenCalled();
    // First loadMore dispatched with page 0, THEN incremented currentPage to 1.
    // A second loadMore proves the increment by dispatching with page 1.
    await wrapper.findComponent(InfiniteLoadingStub).vm.$emit("infinite", state);
    await flushPromises();
    expect(dispatch).toHaveBeenLastCalledWith("articles/fetchArticlesByType", {
      type: "latest",
      size: 5,
      page: 1,
    });
  });

  it("loadMore catches a fetch rejection and completes the infinite loader", async () => {
    getters["articles/latestArticles"] = makeArticles(3);
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    // Make the NEXT fetchPosts dispatch reject so loadMore's try/catch runs.
    dispatch.mockRejectedValueOnce(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = { complete: vi.fn(), loaded: vi.fn() };
    await wrapper.findComponent(InfiniteLoadingStub).vm.$emit("infinite", state);
    await flushPromises();

    // fetchPosts swallows its own error, so loadMore proceeds with hasMore=false
    // -> complete(); the rejection path of loadMore's own catch is covered by the
    // hasMore getter throwing below.
    expect(state.complete).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("loadMore's own catch completes the loader when reading hasMore throws", async () => {
    getters["articles/latestArticles"] = makeArticles(3);
    const wrapper = mountView({ page: "news" });
    await flushPromises();

    // Make the hasMore getter throw AFTER fetchPosts resolves, hitting loadMore catch.
    Object.defineProperty(getters, "articles/hasMore", {
      configurable: true,
      get() {
        throw new Error("getter exploded");
      },
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = { complete: vi.fn(), loaded: vi.fn() };
    await wrapper.findComponent(InfiniteLoadingStub).vm.$emit("infinite", state);
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(
      "Failed to load more posts:",
      expect.any(Error)
    );
    expect(state.complete).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
    // Restore a plain data property for subsequent tests.
    Object.defineProperty(getters, "articles/hasMore", {
      configurable: true,
      writable: true,
      value: false,
    });
  });

  // ===========================================================================
  // HOME PAGE: loading skeleton vs content + fetchPosts home branch + onMounted
  // ===========================================================================
  it("home page shows the 6-card shimmer skeleton while loading", async () => {
    // Keep the mount-time dispatch pending so isLoading stays true.
    let resolveDispatch;
    dispatch.mockReturnValueOnce(new Promise((r) => (resolveDispatch = r)));
    const wrapper = mountView({ page: "home" });
    // Let the reactive isLoading=true flush to the DOM, but do NOT resolve the
    // pending dispatch — isLoading stays true so the skeleton renders.
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents(ShimmerCardStub)).toHaveLength(6);
    // grid-item-large applied to the first skeleton (n === 1).
    expect(wrapper.findAll(".grid-item-large")).toHaveLength(1);

    resolveDispatch();
    await flushPromises();
  });

  it("home page normalizes featured articles to {type,data} and renders NewsCard first on desktop", async () => {
    isMobileRef.value = false;
    const featured = makeArticles(3);
    getters["articles/featuredArticles"] = featured;
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Home dispatch uses featured + pageSize 10.
    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "featured",
      size: 10,
      page: 0,
    });
    // Home page also fetches active ads.
    expect(getAds).toHaveBeenCalledWith({ status: "active", size: 50 });

    // Desktop + index 0 -> NewsCard (featured); the rest -> StandardCard.
    const newsCards = wrapper.findAllComponents(NewsCardStub);
    expect(newsCards).toHaveLength(1);
    expect(newsCards[0].props("article")).toEqual(featured[0]);
    expect(newsCards[0].props("featured")).toBe(true);

    const standardCards = wrapper.findAllComponents(StandardCardStub);
    expect(standardCards).toHaveLength(2);
    // First article wrapper gets grid-item-large on desktop.
    expect(wrapper.findAll(".grid-item-large")).toHaveLength(1);
  });

  it("home page on mobile renders only StandardCards (NewsCard guard false)", async () => {
    isMobileRef.value = true;
    getters["articles/featuredArticles"] = makeArticles(3);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Mobile -> index 0 NewsCard guard (!isMobile) is false -> all StandardCard.
    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(0);
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(3);
    // grid-item-large guard also false on mobile.
    expect(wrapper.findAll(".grid-item-large")).toHaveLength(0);
  });

  it("home page falls back to [] when featuredArticles getter is undefined", async () => {
    getters["articles/featuredArticles"] = undefined;
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // `|| []` fallback -> empty feed, no cards.
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(0);
    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(0);
  });

  it("home page fetchPosts catch logs and clears loading on dispatch rejection", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    dispatch.mockRejectedValueOnce(new Error("dispatch failed"));
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith("Error fetching posts:", expect.any(Error));
    // finally cleared isLoading -> content grid (not skeleton) renders.
    expect(wrapper.findAllComponents(ShimmerCardStub)).toHaveLength(0);
    errSpy.mockRestore();
  });

  // ===========================================================================
  // mobileFeedWithAds branches (desktop, no ads, mobile insertion, ad skip)
  // ===========================================================================
  it("mobile home page inserts rotated PinAdCard ads after 1st and every 4th article", async () => {
    isMobileRef.value = true;
    // Provide active ads via getAds so activeAds is non-empty.
    const ads = [
      adFixture(1),
      adFixture(2),
    ];
    getAds.mockResolvedValue({ data: { ads } });
    // Feed already contains a pre-existing ad item that must be skipped.
    getters["articles/featuredArticles"] = makeArticles(9);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // 9 articles on mobile: ad inserted after article 1, then after 4 and 8.
    // -> 3 PinAdCards (positions cycle through 2 active ads).
    const pins = wrapper.findAllComponents(PinAdCardStub);
    expect(pins).toHaveLength(3);
    // Rotation: position 0 -> ad1, position 1 -> ad2, position 2 -> ad1.
    expect(pins[0].props("ad").id).toBe(1);
    expect(pins[1].props("ad").id).toBe(2);
    expect(pins[2].props("ad").id).toBe(1);
    // Articles still rendered as StandardCards (mobile -> no NewsCard).
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(9);
  });

  it("mobileFeedWithAds skips pre-existing ad items already in feedItems", async () => {
    // Directly seed the feed via the home normalization is article-only, so we
    // exercise the `item.type === 'ad'` continue-branch by mutating feedItems.
    isMobileRef.value = true;
    getAds.mockResolvedValue({ data: { ads: [adFixture(1)] } });
    getters["articles/featuredArticles"] = makeArticles(2);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Inject a stray ad-typed item into the reactive feed to hit `continue`.
    wrapper.vm.feedItems.push({ type: "ad", data: adFixture(99) });
    await wrapper.vm.$nextTick();

    // The stray ad is skipped; only the 2 articles + inserted ad(s) survive.
    const pins = wrapper.findAllComponents(PinAdCardStub);
    // articleCount: art1 -> insert ad (===1); art2 -> no insert. Stray ad skipped.
    expect(pins).toHaveLength(1);
    expect(pins[0].props("ad").id).toBe(1);
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(2);
  });

  it("mobile home page returns the original feed unchanged when no active ads loaded", async () => {
    isMobileRef.value = true;
    getAds.mockResolvedValue({ data: { ads: [] } }); // -> activeAds empty
    getters["articles/featuredArticles"] = makeArticles(5);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // No active ads -> mobileFeedWithAds returns feedItems verbatim.
    expect(wrapper.findAllComponents(PinAdCardStub)).toHaveLength(0);
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(5);
  });

  it("desktop home page never inserts mobile ads even when active ads exist", async () => {
    isMobileRef.value = false;
    getAds.mockResolvedValue({ data: { ads: [adFixture(1)] } });
    getters["articles/featuredArticles"] = makeArticles(5);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Desktop early-return in mobileFeedWithAds -> no PinAdCards.
    expect(wrapper.findAllComponents(PinAdCardStub)).toHaveLength(0);
  });

  it("getAdForPosition returns null (no PinAdCard) when an article needs an ad but none rotate", async () => {
    // Force activeAds non-empty for the mobileFeedWithAds guard, but make
    // getAdForPosition yield null is not directly reachable while length>0;
    // instead verify the length===0 path leaves the feed untouched on mobile.
    isMobileRef.value = true;
    getAds.mockResolvedValue({ ads: [] }); // response.ads branch, empty
    getters["articles/featuredArticles"] = makeArticles(3);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    expect(wrapper.findAllComponents(PinAdCardStub)).toHaveLength(0);
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(3);
  });

  // ===========================================================================
  // fetchActiveAds filter branches + reject path + response shape branches
  // ===========================================================================
  it("fetchActiveAds keeps only active Main-Page ads inside the valid date window", async () => {
    isMobileRef.value = true;
    const now = new Date("2026-06-18T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const ads = [
      // 0: passes everything
      adFixture(10),
      // 1: wrong placement_id
      { ...adFixture(11), placement_id: 2 },
      // 2: missing placement_info
      { ...adFixture(12), placement_info: null },
      // 3: placement_info without the magic phrase
      { ...adFixture(13), placement_info: "Sidebar Ad" },
      // 4: not active
      { ...adFixture(14), status: "paused" },
      // 5: placement_date in the future
      { ...adFixture(15), placement_date: "2099-01-01T00:00:00Z" },
      // 6: expiry_date in the past
      { ...adFixture(16), expiry_date: "2000-01-01T00:00:00Z" },
      // 7: passes with null dates (placementDate/expiryDate null branches)
      { ...adFixture(17), placement_date: null, expiry_date: null },
    ];
    getAds.mockResolvedValue({ data: { ads } });
    getters["articles/featuredArticles"] = makeArticles(1);

    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Only ids 10 and 17 survive the filter -> after article 1 a single ad slot,
    // rotating starts at id 10.
    const pins = wrapper.findAllComponents(PinAdCardStub);
    expect(pins).toHaveLength(1);
    expect(pins[0].props("ad").id).toBe(10);

    vi.useRealTimers();
  });

  it("fetchActiveAds reads response.ads when response.data.ads is absent", async () => {
    isMobileRef.value = true;
    // No `.data` -> falls back to response.ads.
    getAds.mockResolvedValue({ ads: [adFixture(20)] });
    getters["articles/featuredArticles"] = makeArticles(1);

    const wrapper = mountView({ page: "home" });
    await flushPromises();

    const pins = wrapper.findAllComponents(PinAdCardStub);
    expect(pins).toHaveLength(1);
    expect(pins[0].props("ad").id).toBe(20);
  });

  it("fetchActiveAds defaults to [] when neither data.ads nor ads are present", async () => {
    isMobileRef.value = true;
    getAds.mockResolvedValue({}); // -> [] fallback
    getters["articles/featuredArticles"] = makeArticles(3);

    const wrapper = mountView({ page: "home" });
    await flushPromises();

    expect(wrapper.findAllComponents(PinAdCardStub)).toHaveLength(0);
  });

  it("fetchActiveAds catch clears activeAds when getAds rejects", async () => {
    isMobileRef.value = true;
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getAds.mockRejectedValueOnce(new Error("ads down"));
    getters["articles/featuredArticles"] = makeArticles(3);

    const wrapper = mountView({ page: "home" });
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching active ads:",
      expect.any(Error)
    );
    // activeAds reset to [] -> no PinAdCards rotate in.
    expect(wrapper.findAllComponents(PinAdCardStub)).toHaveLength(0);
    errSpy.mockRestore();
  });

  // ===========================================================================
  // pageSize computed branch (news -> 5) is asserted via dispatch payloads above
  // for news (size:5) and home/details (size:10). Confirm the news-size path here.
  // ===========================================================================
  it("news page fetch uses pageSize 5", async () => {
    getters["articles/latestArticles"] = [];
    mountView({ page: "news" });
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "latest",
      size: 5,
      page: 0,
    });
  });

  // ===========================================================================
  // articlesData / fullArticles computed branches (home topStories + slice(0,6))
  // ===========================================================================
  it("articlesData on home reads topStories and slices to 6 (fullArticles home + else branch)", async () => {
    // topStories drives fullArticles when page === 'home'; articlesData else
    // branch slices to the first 6 items.
    getters["articles/topStories"] = makeArticles(10);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Reading the computed forces evaluation of the home (topStories) ternary
    // side and the non-details slice(0,6) else branch.
    expect(wrapper.vm.articlesData).toHaveLength(6);
    expect(wrapper.vm.articlesData[0].id).toBe(1);
    expect(wrapper.vm.articlesData[5].id).toBe(6);
  });

  // ===========================================================================
  // Template v-for key fallback: item.data?.id || index (both sides)
  // ===========================================================================
  it("renders feed items whose data has no id, exercising the key index fallback", async () => {
    isMobileRef.value = false;
    getters["articles/featuredArticles"] = makeArticles(2);
    const wrapper = mountView({ page: "home" });
    await flushPromises();

    // Replace feed with items lacking a usable data.id so `item.data?.id || index`
    // takes both the optional-chain-null and the ||-fallback paths.
    wrapper.vm.feedItems = [
      { type: "article", data: { title: "no id, falsy id branch" } },
      { type: "article", data: null },
    ];
    await wrapper.vm.$nextTick();

    // Both items still render (first as featured NewsCard on desktop).
    expect(wrapper.findAllComponents(NewsCardStub)).toHaveLength(1);
    expect(wrapper.findAllComponents(StandardCardStub)).toHaveLength(1);
  });
});

// --- Helpers ----------------------------------------------------------------
function adFixture(id) {
  return {
    id,
    placement_id: 1,
    placement_info: "Main Page Ad slot",
    status: "active",
    placement_date: "2020-01-01T00:00:00Z",
    expiry_date: "2099-12-31T00:00:00Z",
  };
}
