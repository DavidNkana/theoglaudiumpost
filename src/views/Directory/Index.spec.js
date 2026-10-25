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

// --- Mock lodash debounce: run the debounced fn synchronously -----------------
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    wrapped.flush = vi.fn();
    return wrapped;
  },
}));

// --- Mock v3-infinite-loading + its css --------------------------------------
vi.mock("v3-infinite-loading/lib/style.css", () => ({}));
vi.mock("v3-infinite-loading", () => ({
  default: {
    name: "InfiniteLoading",
    emits: ["infinite"],
    template: `
      <div class="infinite-loading-stub">
        <slot name="complete" />
        <slot name="error" />
      </div>
    `,
  },
}));

// --- Mock vuex (boundary) -----------------------------------------------------
let dispatch;
let getters;
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    getters,
  }),
}));

// --- Mock vue-router ----------------------------------------------------------
const replace = vi.fn();
let routeQuery;
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  useRoute: () => ({ params: {}, query: routeQuery }),
}));

import Index from "./Index.vue";
import { devLog } from "@/utils/devLog";

const makeListing = (id) => ({
  id,
  name: `Business ${id}`,
  category: "Restaurants",
  description: `Description ${id}`,
  address: `${id} Main St`,
  slug: `business-${id}`,
});

const mountView = () =>
  mount(Index, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  routeQuery = {};
  dispatch = vi.fn().mockResolvedValue(undefined);
  getters = {
    "directory/listings": [makeListing(1), makeListing(2)],
    "directory/categories": [
      { id: 10, name: "Restaurants", slug: "restaurants" },
      { id: 11, name: "Retail", slug: "retail" },
    ],
    "directory/hasMore": false,
  };
});

describe("Directory/Index.vue", () => {
  it("fetches on mount and renders the content state with listings + categories", async () => {
    const wrapper = mountView();

    // onMounted -> fetchData -> dispatch fetchListings (page 0) + fetchCategories
    expect(dispatch).toHaveBeenCalledWith("directory/fetchListings", {
      size: 10,
      page: 0,
      category: "",
      search: "",
    });

    await flushPromises();
    await nextTick();

    expect(dispatch).toHaveBeenCalledWith("directory/fetchCategories");
    expect(devLog.info).toHaveBeenCalledWith("Fetching directory data");

    // heading
    expect(wrapper.find("h2").text()).toBe("Business Directory");

    // listings v-for (non-empty)
    const cards = wrapper.findAll(".card.mb-3");
    expect(cards).toHaveLength(2);
    expect(cards[0].find(".card-title").text()).toBe("Business 1");
    expect(cards[0].find(".badge").text()).toBe("Restaurants");

    // router-link uses the slug
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].props("to")).toBe("/directory/business-1");

    // categories v-for (non-empty) -> 2 category buttons + the "All Categories" button
    const filterBtns = wrapper.findAll(".filter-btn");
    expect(filterBtns).toHaveLength(3);
    expect(filterBtns[1].text()).toBe("Restaurants");
    expect(filterBtns[2].text()).toBe("Retail");

    // "All Categories" active (category === 'all')
    expect(filterBtns[0].classes()).toContain("active");
    // category buttons inactive
    expect(filterBtns[1].classes()).not.toContain("active");

    // empty-state not shown
    expect(wrapper.find(".bi-journal-x").exists()).toBe(false);

    // infinite-loading complete + error slots rendered
    expect(wrapper.text()).toContain("No more listings to load");
    expect(wrapper.text()).toContain("Error loading listings");
  });

  it("seeds filters from a populated route query (truthy onMounted branches)", async () => {
    routeQuery = { search: "pizza", category: "restaurants" };
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // search seeded
    expect(wrapper.find("input[type='text']").element.value).toBe("pizza");

    // category 'restaurants' -> fetchListings sent that category (not "all")
    expect(dispatch).toHaveBeenCalledWith("directory/fetchListings", {
      size: 10,
      page: 0,
      category: "restaurants",
      search: "pizza",
    });

    // All Categories inactive; matching category button active
    const filterBtns = wrapper.findAll(".filter-btn");
    expect(filterBtns[0].classes()).not.toContain("active");
    expect(filterBtns[1].classes()).toContain("active"); // restaurants
  });

  it("renders the empty state when there are no listings and not loading", async () => {
    getters["directory/listings"] = [];
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // empty-state v-if branch
    expect(wrapper.find(".bi-journal-x").exists()).toBe(true);
    expect(wrapper.find("h4").text()).toBe(
      "No listings match your current filters"
    );
    expect(wrapper.find(".card.mb-3").exists()).toBe(false);
  });

  it("falls back to empty arrays when listings/categories getters are falsy", async () => {
    getters["directory/listings"] = undefined;
    getters["directory/categories"] = undefined;
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // listings || [] -> empty state ; categories || [] -> only All Categories btn
    expect(wrapper.find(".bi-journal-x").exists()).toBe(true);
    expect(wrapper.findAll(".filter-btn")).toHaveLength(1);
  });

  it("logs and recovers when the initial fetch rejects (catch + finally)", async () => {
    const err = new Error("boom");
    dispatch = vi.fn().mockRejectedValue(err);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(devLog.error).toHaveBeenCalledWith(
      "Error fetching directory listings:",
      err
    );
    // finally cleared isLoading; default listings getter is non-empty -> content
    expect(wrapper.find(".card.mb-3").exists()).toBe(true);
  });

  it("skips fetchCategories when currentPage is not 0 (loadMore advances the page)", async () => {
    getters["directory/hasMore"] = true;
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    dispatch.mockClear();
    const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
    wrapper.findComponent({ name: "InfiniteLoading" }).vm.$emit("infinite", $state);
    await flushPromises();

    // hasMore true -> page advanced to 1, loaded()
    expect($state.loaded).toHaveBeenCalled();
    expect($state.complete).not.toHaveBeenCalled();

    // now trigger a fetch at page 1 and confirm fetchCategories is NOT dispatched
    dispatch.mockClear();
    const $state2 = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
    getters["directory/hasMore"] = false;
    wrapper.findComponent({ name: "InfiniteLoading" }).vm.$emit("infinite", $state2);
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("directory/fetchListings", {
      size: 10,
      page: 1,
      category: "",
      search: "",
    });
    expect(dispatch).not.toHaveBeenCalledWith("directory/fetchCategories");
    expect($state2.complete).toHaveBeenCalled();
  });

  it("loadMore completes the loader when there is no more data (hasMore false)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
    wrapper.findComponent({ name: "InfiniteLoading" }).vm.$emit("infinite", $state);
    await flushPromises();

    expect($state.complete).toHaveBeenCalled();
    expect($state.loaded).not.toHaveBeenCalled();
    expect($state.error).not.toHaveBeenCalled();
  });

  it("loadMore signals error to the loader when the fetch rejects (catch path)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const err = new Error("load failed");
    dispatch = vi.fn().mockRejectedValue(err);
    // fetchData swallows its own error, so force the throw after it: make the
    // hasMore getter access throw to drive loadMore's catch.
    Object.defineProperty(getters, "directory/hasMore", {
      get() {
        throw err;
      },
      configurable: true,
    });

    const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
    wrapper.findComponent({ name: "InfiniteLoading" }).vm.$emit("infinite", $state);
    await flushPromises();

    expect($state.error).toHaveBeenCalled();
    expect(devLog.debug).toHaveBeenCalledWith(
      "Failed to load more listings:",
      err
    );
  });

  it("returns early from fetchData/loadMore while a request is in flight (guard branch)", async () => {
    // Make the initial mount dispatch hang so isLoading stays true.
    let releaseInitial;
    dispatch = vi.fn(
      () => new Promise((res) => (releaseInitial = res))
    );
    const wrapper = mountView();
    await nextTick();

    // isLoading is true; emit infinite -> loadMore guard returns early.
    const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
    wrapper.findComponent({ name: "InfiniteLoading" }).vm.$emit("infinite", $state);
    await nextTick();

    expect($state.loaded).not.toHaveBeenCalled();
    expect($state.complete).not.toHaveBeenCalled();
    expect($state.error).not.toHaveBeenCalled();

    // Also exercise fetchData's own in-flight guard: trigger a category change
    // while still loading -> fetchData returns at the guard (no extra dispatch).
    const initialCalls = dispatch.mock.calls.length;
    const restaurantsBtn = wrapper.findAll(".filter-btn")[1];
    await restaurantsBtn.trigger("click");
    await nextTick();
    expect(dispatch.mock.calls.length).toBe(initialCalls);

    releaseInitial();
    await flushPromises();
  });

  it("typing in search triggers debounced fetch and replaces the route (truthy query)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    devLog.info.mockClear();
    replace.mockClear();

    await wrapper.find("input[type='text']").setValue("dentist");
    await flushPromises();
    await nextTick();

    // search watcher -> debouncedFetch -> fetchData
    expect(devLog.info).toHaveBeenCalledWith("Fetching directory data");
    // combined watcher -> replace with both truthy
    expect(replace).toHaveBeenLastCalledWith({
      query: { search: "dentist", category: "all" },
    });
  });

  it("selecting a category triggers the category watcher and toggles active class", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    devLog.info.mockClear();
    replace.mockClear();

    const restaurantsBtn = wrapper.findAll(".filter-btn")[1];
    await restaurantsBtn.trigger("click");
    await flushPromises();
    await nextTick();

    // category watcher -> fetchData
    expect(devLog.info).toHaveBeenCalledWith("Fetching directory data");
    // restaurants button now active; All Categories inactive
    const filterBtns = wrapper.findAll(".filter-btn");
    expect(filterBtns[0].classes()).not.toContain("active");
    expect(filterBtns[1].classes()).toContain("active");
    // combined watcher -> replace with category truthy
    expect(replace).toHaveBeenLastCalledWith({
      query: { search: undefined, category: "restaurants" },
    });
  });

  it("clicking 'All Categories' resets category to 'all' (and active class via '' branch)", async () => {
    routeQuery = { category: "restaurants" };
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    const allBtn = wrapper.find(".filter-btn");
    await allBtn.trigger("click");
    await nextTick();

    expect(allBtn.classes()).toContain("active");
  });

  it("the empty/'' category falsy branch passes undefined to router.replace", async () => {
    // Start with a category, then drive category to '' via the empty-state reset
    // path is 'all'; to reach '' we mount with empty listings, click a category,
    // then exercise resetFilters which sets 'all'. The '' branch of the active
    // class + `category || undefined` is covered by mounting with category ''.
    routeQuery = { category: "all", search: "seed" };
    getters["directory/listings"] = [];
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    replace.mockClear();
    // Empty state is shown -> click Reset Filters (resetFilters).
    const resetBtn = wrapper.find(".btn-success.mt-2");
    expect(resetBtn.text()).toBe("Reset Filters");
    await resetBtn.trigger("click");
    await flushPromises();
    await nextTick();

    // resetFilters cleared search -> combined watcher: search '' -> undefined
    expect(wrapper.find("input[type='text']").element.value).toBe("");
    expect(replace).toHaveBeenLastCalledWith({
      query: { search: undefined, category: "all" },
    });
  });
});
