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
}));

// --- Mock AdBanner (heavy child) ---------------------------------------------
vi.mock("@/components/AdBanner.vue", () => ({
  default: { name: "AdBanner", template: "<div class='ad-banner-stub' />" },
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

// --- Mock child components ----------------------------------------------------
vi.mock("./FuneralNotice.vue", () => ({
  default: {
    name: "FuneralNotice",
    props: ["notice"],
    template: "<div class='funeral-notice-stub'>{{ notice.id }}</div>",
  },
}));
vi.mock("../Community/Partials/Contacts.vue", () => ({
  default: { name: "Contacts", template: "<div class='contacts-stub' />" },
}));
vi.mock("../Community/Partials/RecentUpdates.vue", () => ({
  default: { name: "RecentUpdates", template: "<div class='recent-updates-stub' />" },
}));

// --- Mock vuex ----------------------------------------------------------------
let dispatch;
let getters;
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    getters,
  }),
}));

// --- Mock vue-router (imported but unused; keep boundary mocked) --------------
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}));

import Index from "./Index.vue";
import { devLog } from "@/utils/devLog";

const makeNotice = (id) => ({ id, name: `Notice ${id}` });

const mountView = () =>
  mount(Index, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  dispatch = vi.fn().mockResolvedValue(undefined);
  getters = {
    "notices/funerals": [makeNotice(1), makeNotice(2)],
    "notices/hasMoreFunerals": true,
  };
});

describe("Announcements/Index.vue", () => {
  it("fetches initial data on mount and renders the notices content state", async () => {
    const wrapper = mountView();
    // initial fetch is dispatched on mount
    expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
      type: "funerals",
      size: 10,
      page: 0,
      category: 14,
    });

    await flushPromises();
    await nextTick();

    // success path: initialLoadComplete true, notices rendered
    const notices = wrapper.findAll(".funeral-notice-stub");
    expect(notices).toHaveLength(2);
    expect(notices[0].text()).toBe("1");
    // sidebar always rendered
    expect(wrapper.find(".contacts-stub").exists()).toBe(true);
    expect(wrapper.find(".recent-updates-stub").exists()).toBe(true);
    // heading
    expect(wrapper.find("h2").text()).toBe("Funeral Announcements");
    expect(devLog.info).toHaveBeenCalledWith("Initial data fetched");
  });

  it("shows the loading spinner while the initial load is in flight", async () => {
    // Keep dispatch pending so isLoading stays true and initialLoadComplete false
    let resolveFetch;
    dispatch = vi.fn(
      () => new Promise((res) => { resolveFetch = res; })
    );

    const wrapper = mountView();
    await nextTick();

    // loading branch: !initialLoadComplete && isLoading
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".visually-hidden").text()).toBe("Loading...");
    expect(wrapper.find(".funeral-notice-stub").exists()).toBe(false);

    resolveFetch();
    await flushPromises();
    await nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
  });

  it("shows the empty state when no notices come back after initial load", async () => {
    getters["notices/funerals"] = [];
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // empty branch: filteredNotices.length === 0 && initialLoadComplete
    expect(wrapper.find("h4").text()).toBe("No funeral announcements found");
    expect(wrapper.find(".funeral-notice-stub").exists()).toBe(false);
  });

  it("falls back to an empty array when the funerals getter is falsy", async () => {
    // covers the `|| []` branch in the computed
    getters["notices/funerals"] = undefined;
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find("h4").text()).toBe("No funeral announcements found");
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
    // finally: initialLoadComplete becomes true -> empty state shows (funerals still mocked array, so content)
    // funerals getter is the default 2-item array, so content state renders
    expect(wrapper.find(".funeral-notice-stub").exists()).toBe(true);
  });

  it("dispatches the initial fetch exactly once on mount", async () => {
    let resolveFetch;
    dispatch = vi.fn(
      () => new Promise((res) => { resolveFetch = res; })
    );
    const wrapper = mountView();
    await nextTick();

    expect(dispatch).toHaveBeenCalledTimes(1);

    resolveFetch();
    await flushPromises();
    wrapper.unmount();
  });

  describe("loadMore (infinite loading)", () => {
    const getInfinite = (wrapper) => wrapper.findComponent({ name: "InfiniteLoading" });

    it("loads the next page and marks loaded when more data is available", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      dispatch.mockClear();

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect(dispatch).toHaveBeenCalledWith("notices/fetchNotices", {
        type: "funerals",
        size: 10,
        page: 1,
        category: 14,
      });
      expect($state.loaded).toHaveBeenCalled();
      expect($state.complete).not.toHaveBeenCalled();
    });

    it("completes the infinite loader when no more data is available", async () => {
      const wrapper = mountView();
      await flushPromises();
      await nextTick();

      getters["notices/hasMoreFunerals"] = false;
      const $state = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };

      getInfinite(wrapper).vm.$emit("infinite", $state);
      await flushPromises();

      expect($state.complete).toHaveBeenCalled();
      expect($state.loaded).not.toHaveBeenCalled();
      expect(devLog.info).toHaveBeenCalledWith("No more data available");
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
      // Make the initial dispatch hang so isLoading stays true.
      let resolveFetch;
      dispatch = vi.fn(
        () => new Promise((res) => { resolveFetch = res; })
      );
      const wrapper = mountView();
      await nextTick();

      // While still loading, the content state is NOT rendered (spinner shows),
      // so InfiniteLoading isn't mounted. Resolve, then trigger, then immediately
      // re-trigger to hit the in-flight guard.
      resolveFetch();
      await flushPromises();
      await nextTick();

      const infinite = wrapper.findComponent({ name: "InfiniteLoading" });
      const $stateA = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };
      const $stateB = { loaded: vi.fn(), complete: vi.fn(), error: vi.fn() };

      // Make the loadMore dispatch hang so isLoading is true for the second call.
      let resolveMore;
      dispatch = vi.fn(
        () => new Promise((res) => { resolveMore = res; })
      );

      infinite.vm.$emit("infinite", $stateA); // sets isLoading = true, awaits
      infinite.vm.$emit("infinite", $stateB); // hits the guard -> returns early
      await nextTick();

      expect(devLog.info).toHaveBeenCalledWith("Already loading, returning");
      // second call never dispatched
      expect(dispatch).toHaveBeenCalledTimes(1);

      resolveMore();
      await flushPromises();
    });
  });

  it("renders the infinite-loading complete and error slot templates", async () => {
    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // complete slot
    expect(wrapper.find(".infinite-loading-complete").text()).toContain(
      "No more announcements to load"
    );
    // error slot with retry button
    const errorBlock = wrapper.find(".infinite-loading-error");
    expect(errorBlock.exists()).toBe(true);
    expect(errorBlock.text()).toContain("Error loading announcements.");

    // click retry to exercise the @click="retry" binding
    const retryBtn = errorBlock.find("button");
    expect(retryBtn.text()).toBe("Try Again");
    await retryBtn.trigger("click");
  });
});
