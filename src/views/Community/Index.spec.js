import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock devLog (external boundary -> @/config/env) --------------------------
vi.mock("@/utils/devLog", () => ({
  devLog: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Mock @/utils (pulls heavy ad/image helpers) ------------------------------
vi.mock("@/utils", () => ({
  formatTimeAgo: vi.fn(() => "1 hour ago"),
  IN_ARTICLE_TOP: "in_article_top",
  IN_ARTICLE_MID: "in_article_mid",
  SIDEBAR_MID: "sidebar_mid",
}));

// --- Mock lodash debounce so the search watcher fires synchronously -----------
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    return wrapped;
  },
}));

// --- Mock AdBanner (heavy child) ---------------------------------------------
vi.mock("@/components/AdBanner.vue", () => ({
  default: {
    name: "AdBanner",
    props: ["size", "placement"],
    template: "<div class='ad-banner-stub' :data-placement='placement' />",
  },
}));

// --- Mock v3-infinite-loading + its css --------------------------------------
vi.mock("v3-infinite-loading/lib/style.css", () => ({}));
vi.mock("v3-infinite-loading", () => ({
  default: {
    name: "InfiniteLoading",
    emits: ["infinite"],
    // Render every slot so their template branches are covered.
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

// --- Mock child partials ------------------------------------------------------
vi.mock("./Partials/Contacts.vue", () => ({
  default: { name: "Contacts", template: "<div class='contacts-stub' />" },
}));
vi.mock("./Partials/RecentUpdates.vue", () => ({
  default: {
    name: "RecentUpdates",
    template: "<div class='recent-updates-stub' />",
  },
}));

// --- Mock vuex ----------------------------------------------------------------
let dispatch;
let commit;
let getters;
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    commit: (...a) => commit(...a),
    getters,
  }),
}));

// --- Mock vue-router ----------------------------------------------------------
let routeQuery;
let routerReplace;
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: (...a) => routerReplace(...a) }),
  useRoute: () => ({ params: {}, query: routeQuery }),
}));

import Index from "./Index.vue";
import { devLog } from "@/utils/devLog";
import { formatTimeAgo } from "@/utils";

const makeNotice = (id, overrides = {}) => ({
  id,
  slug: `slug-${id}`,
  title: `Notice ${id}`,
  content: `<b>body ${id}</b>`,
  location: `Loc ${id}`,
  publish_date: "2024-01-01",
  image: { file: `/img-${id}.png` },
  category: { id: id * 10, name: `Cat ${id}` },
  ...overrides,
});

const mountView = () =>
  mount(Index, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  dispatch = vi.fn().mockResolvedValue(undefined);
  commit = vi.fn();
  routerReplace = vi.fn();
  routeQuery = {};
  getters = {
    "notices/notices": [makeNotice(1), makeNotice(2)],
    "notices/categories": [
      { id: 1, name: "News", announcements: 3 },
      { id: 2, name: "Events" }, // no announcements -> covers v-if="category.announcements" else
    ],
    "notices/hasMore": true,
  };
});

describe("Community/Index.vue", () => {
  it("dispatches the initial fetch on mount with default 'all' filters and renders content", async () => {
    const wrapper = mountView();

    // onMounted -> fetchInitialData dispatches fetchNotices (all -> "") then fetchCategories
    expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
      type: "all",
      size: 10,
      page: 0,
      category: "",
      priority: "",
      search: "",
    });

    await flushPromises();
    await nextTick();

    // fetchCategories runs after the first dispatch resolves
    expect(dispatch).toHaveBeenCalledWith("notices/fetchCategories");

    // success path: initialLoadComplete true -> notices list rendered
    const cards = wrapper.findAll(".alert-card");
    expect(cards).toHaveLength(2);
    expect(wrapper.find("h2").text()).toBe("Community Notices");

    // sidebar partials always present
    expect(wrapper.find(".contacts-stub").exists()).toBe(true);
    expect(wrapper.find(".recent-updates-stub").exists()).toBe(true);

    // category filter buttons render (not loading) + Latest + 2 categories
    const filterBtns = wrapper.findAll(".filter-btn");
    expect(filterBtns).toHaveLength(3);
    expect(filterBtns[0].text()).toBe("Latest");
    // category.announcements branch -> "(3)" present for News, absent for Events
    expect(wrapper.html()).toContain("(3)");

    // formatTimeAgo + content rendering exercised
    expect(formatTimeAgo).toHaveBeenCalledWith("2024-01-01");
    expect(devLog.info).toHaveBeenCalledWith("Initial data fetched");
  });

  it("reads search/category/priority from route query on mount", async () => {
    routeQuery = { search: "fire", category: "5", priority: "high" };
    mountView();

    expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
      type: "all",
      size: 10,
      page: 0,
      category: "5",
      priority: "high",
      search: "fire",
    });
    await flushPromises();
  });

  it("renders the loading shimmer skeleton while the initial load is in flight", async () => {
    // fetchInitialData awaits two dispatches; collect every resolver so we can
    // settle all of them at once and let isLoading flip back to false.
    const resolvers = [];
    dispatch = vi.fn(() => new Promise((res) => resolvers.push(res)));

    const wrapper = mountView();
    await nextTick();

    // isLoading true -> v-else-if shimmer branch (6 skeletons)
    const shimmers = wrapper.findAll(".shimmer");
    expect(shimmers).toHaveLength(6);
    // category buttons not rendered while loading
    expect(wrapper.find(".filter-btn").exists()).toBe(false);

    // drain all pending dispatches (resolving one queues the next)
    while (resolvers.length) {
      resolvers.shift()();
      await flushPromises();
    }
    await nextTick();
    expect(wrapper.findAll(".shimmer")).toHaveLength(0);
  });

  it("logs and recovers when the initial fetch rejects (catch path)", async () => {
    const err = new Error("boom");
    dispatch = vi.fn().mockRejectedValue(err);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(devLog.error).toHaveBeenCalledWith(
      "Error fetching initial data:",
      err
    );
    // finally still flips initialLoadComplete -> notices (default getter) render
    expect(wrapper.find(".notices-container").exists()).toBe(true);
  });

  it("filteredNotices: excludes Funeral notices when category is 'all'", async () => {
    getters["notices/notices"] = [
      makeNotice(1),
      makeNotice(2, { category: { id: 99, name: "Funeral Service" } }),
      makeNotice(3, { category: null }), // covers optional chaining on missing category
    ];
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // Funeral one filtered out -> 2 remain
    expect(wrapper.findAll(".alert-card")).toHaveLength(2);
  });

  it("filteredNotices: returns the raw getter (no Funeral filter) for a specific category", async () => {
    routeQuery = { category: "7" };
    getters["notices/notices"] = [
      makeNotice(1),
      makeNotice(2, { category: { id: 7, name: "Funeral Notice" } }),
    ];
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // specific-category branch returns notices unfiltered -> both cards (incl. Funeral)
    expect(wrapper.findAll(".alert-card")).toHaveLength(2);
  });

  it("filteredNotices: handles a falsy notices getter via optional chaining", async () => {
    getters["notices/notices"] = undefined;
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // computed returns undefined -> v-else-if initialLoadComplete still renders, no cards
    expect(wrapper.findAll(".alert-card")).toHaveLength(0);
  });

  it("shows the no-results state and resetFilters restores defaults", async () => {
    routeQuery = { category: "7" }; // specific category so filteredNotices === raw getter
    getters["notices/notices"] = []; // length 0
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // no-results branch: (category != 'all') && length 0 && !isLoading
    expect(wrapper.find(".results h4").text()).toBe(
      "No notices match your current filters"
    );

    commit.mockClear();
    dispatch.mockClear();
    await wrapper.find(".results button").trigger("click");

    // resetFilters: clears notices, resets page, re-fetches with default filters
    expect(commit).toHaveBeenCalledWith("notices/clearNotices");
    expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
      type: "all",
      size: 10,
      page: 0,
      category: "",
      priority: "",
      search: "",
    });
  });

  it("renders an ad banner after every 6th notice (shouldShowAdAfter)", async () => {
    getters["notices/notices"] = Array.from({ length: 7 }, (_, i) =>
      makeNotice(i + 1)
    );
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // 7 notices -> ad after index 5 (the 6th) -> exactly one in-article ad banner
    const inArticleAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(inArticleAds).toHaveLength(1);
  });

  it("filterCategory toggles via the inline notice-tag click and the Latest button", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    routerReplace.mockClear();
    // clicking a category filter button sets the category (filterCategory(id))
    const filterBtns = wrapper.findAll(".filter-btn");
    await filterBtns[1].trigger("click"); // category id 1
    await flushPromises();
    expect(routerReplace).toHaveBeenCalled();

    // clicking it again toggles back to "" (filters.category === id -> "")
    await filterBtns[1].trigger("click");
    await flushPromises();

    // "Latest" button (filterCategory('')) — category is '' so it toggles to '' (no-op branch)
    await wrapper.findAll(".filter-btn")[0].trigger("click");
    await flushPromises();
    expect(wrapper.html()).toBeTruthy();
  });

  it("clicking the inline category tag on a notice sets filters.category", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    routerReplace.mockClear();
    // the small.cursor-pointer inside a card sets filters.category = alert.category.id
    const tag = wrapper.find(".meta-info .cursor-pointer");
    await tag.trigger("click");
    await flushPromises();
    // category/priority watcher fired -> clearNotices + replace query
    expect(commit).toHaveBeenCalledWith("notices/clearNotices");
    expect(routerReplace).toHaveBeenCalled();
  });

  it("search watcher (debounced) clears notices, resets page and fetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    commit.mockClear();
    dispatch.mockClear();
    // mutate the search filter on the vm to trigger the watcher
    wrapper.vm.filters.search = "storm";
    await flushPromises();

    expect(commit).toHaveBeenCalledWith("notices/clearNotices");
    expect(dispatch).toHaveBeenCalledWith(
      "notices/fetchNotices",
      expect.objectContaining({ search: "storm", page: 0 })
    );
  });

  it("fetchData returns early when a request is already in flight (isLoading guard)", async () => {
    // keep the mount fetch pending so isLoading stays true
    let resolveFetch;
    dispatch = vi.fn(() => new Promise((res) => { resolveFetch = res; }));
    const wrapper = mountView();
    await nextTick();

    dispatch.mockClear();
    // trigger category watcher -> fetchData runs but bails on the isLoading guard
    wrapper.vm.filters.category = "9";
    await nextTick();
    expect(dispatch).not.toHaveBeenCalled();

    resolveFetch();
    await flushPromises();
  });

  it("fetchData catch path logs when the fetch rejects", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const err = new Error("search failed");
    dispatch = vi.fn().mockRejectedValue(err);
    commit.mockClear();

    // category watcher -> fetchData -> rejects
    wrapper.vm.filters.category = "3";
    await flushPromises();
    expect(devLog.error).toHaveBeenCalledWith("Error fetching posts:", err);
  });

  it("router.replace watcher uses undefined for empty filter values", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    routerReplace.mockClear();
    // truthy values pass through; default category is still "all" here
    wrapper.vm.filters.priority = "high";
    wrapper.vm.filters.search = "snow";
    await flushPromises();
    expect(routerReplace).toHaveBeenLastCalledWith({
      query: { search: "snow", category: "all", priority: "high" },
    });

    // now empty every filter to hit the `value || undefined` (falsy) branch
    routerReplace.mockClear();
    wrapper.vm.filters.search = "";
    wrapper.vm.filters.category = "";
    wrapper.vm.filters.priority = "";
    await flushPromises();
    expect(routerReplace).toHaveBeenLastCalledWith({
      query: { search: undefined, category: undefined, priority: undefined },
    });
  });

  describe("loadMore (infinite loading)", () => {
    const getInfinite = (wrapper) =>
      wrapper.findComponent({ name: "InfiniteLoading" });

    it("loads the next page and marks loaded when more data is available", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      dispatch.mockClear();

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
        type: "all",
        size: 10,
        page: 1,
        category: "",
        priority: "",
        search: "",
      });
      expect($state.loaded).toHaveBeenCalled();
      expect($state.complete).not.toHaveBeenCalled();
    });

    it("completes immediately when there is no more data before fetching", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      getters["notices/hasMore"] = false;
      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      dispatch.mockClear();

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      // early return -> complete, no dispatch
      expect($state.complete).toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(devLog.info).toHaveBeenCalledWith("No more data available");
    });

    it("completes after fetching when the new page reports no more data", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      // hasMore true on entry, false after the fetch resolves. Define it on the
      // live getters object the component already holds a reference to.
      let call = 0;
      Object.defineProperty(getters, "notices/hasMore", {
        configurable: true,
        get() {
          call += 1;
          return call === 1; // true first read, false second read
        },
      });

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect($state.complete).toHaveBeenCalled();
      expect($state.loaded).not.toHaveBeenCalled();
    });

    it("passes specific category/priority filters through on the next page fetch", async () => {
      // route query supplies non-"all" filters so the ternaries take their
      // false branch (filters.value.category / .priority pass through verbatim)
      routeQuery = { category: "5", priority: "high" };
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      dispatch.mockClear();

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
        type: "all",
        size: 10,
        page: 1,
        category: "5",
        priority: "high",
        search: "",
      });
      expect($state.loaded).toHaveBeenCalled();
    });

    it("signals error to the loader when the fetch rejects (catch path)", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const err = new Error("load failed");
      dispatch = vi.fn().mockRejectedValue(err);
      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect($state.error).toHaveBeenCalled();
      expect(devLog.error).toHaveBeenCalledWith(
        "Failed to load more posts:",
        err
      );
    });

    it("returns early from loadMore while another request is in flight (guard branch)", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const infinite = wrapper.findComponent({ name: "InfiniteLoading" });
      const $stateA = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      const $stateB = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };

      // make the loadMore dispatch hang so isLoading stays true for the 2nd call
      let resolveMore;
      dispatch = vi.fn(() => new Promise((res) => { resolveMore = res; }));

      infinite.vm.$emit("infinite", $stateA); // sets isLoading true, awaits
      infinite.vm.$emit("infinite", $stateB); // hits the in-flight guard
      await nextTick();

      expect(devLog.info).toHaveBeenCalledWith("Already loading, returning");
      expect(dispatch).toHaveBeenCalledTimes(1);

      resolveMore();
      await flushPromises();
    });
  });

  it("renders the infinite-loading spinner, complete and error slot templates", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".infinite-loading-spinner").exists()).toBe(true);
    expect(wrapper.find(".infinite-loading-complete").text()).toContain("End!");

    const errorBlock = wrapper.find(".infinite-loading-error");
    expect(errorBlock.exists()).toBe(true);
    expect(errorBlock.text()).toContain("Error loading.");

    // click retry to exercise the @click="retry" binding
    await errorBlock.find("button").trigger("click");
  });

  it("falls back to the placeholder image when a notice has no image", async () => {
    getters["notices/notices"] = [makeNotice(1, { image: null })];
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const img = wrapper.find(".notice-image");
    expect(img.attributes("src")).toBe("/placeholder-image.png");
  });

  it("renders the empty categories list branch (no filter buttons, no shimmer)", async () => {
    getters["notices/categories"] = []; // length 0 -> template v-if false, not loading -> neither branch
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".filter-btn").exists()).toBe(false);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });
});
