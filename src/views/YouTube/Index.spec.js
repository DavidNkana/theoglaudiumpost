import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";

// --- Mock the dev logger (only console/styling boundary) -------------------
vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Mock vue-router so useRoute/useRouter return controllable spies --------
const replaceMock = vi.fn();
vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {}, params: {} }),
  useRouter: () => ({ replace: replaceMock }),
}));

// --- Stub v3-infinite-loading: render every named slot so the slot template
//     branches (spinner / complete / error+retry) are instrumented. The error
//     slot receives a `retry` fn so the retry button's @click is exercised. ---
const retrySpy = vi.fn();
// Capture the parent's @infinite handler (loadMore) so we can invoke it even
// while the component is unmounted (e.g. when v-if="!isLoading" hides it).
let capturedInfiniteHandler = null;
vi.mock("v3-infinite-loading", async () => {
  const { getCurrentInstance } = await import("vue");
  return {
    default: {
      name: "InfiniteLoading",
      props: ["target"],
      emits: ["infinite"],
      template: `
        <div class="infinite-loading-stub">
          <slot name="spinner" />
          <slot name="complete" />
          <slot name="error" :retry="retry" />
        </div>
      `,
      setup() {
        const inst = getCurrentInstance();
        capturedInfiniteHandler = inst.vnode.props && inst.vnode.props.onInfinite;
        return { retry: retrySpy };
      },
    },
  };
});
// CSS side-effect import must not blow up jsdom.
vi.mock("v3-infinite-loading/lib/style.css", () => ({}));

import { devLog } from "@/utils/devLog";
import Index from "@/views/YouTube/Index.vue";

// --- Lightweight child stubs so only Index.vue is instrumented --------------
const VideoCardStub = {
  name: "VideoCard",
  props: ["video"],
  template: `<div class="video-card-stub">{{ video.id.videoId }}</div>`,
};
const AdBannerStub = {
  name: "AdBanner",
  props: ["size", "placement"],
  template: `<div class="ad-banner-stub" :data-placement="placement"></div>`,
};

/**
 * Build a fake vuex store. `videos`/`hasMore` back the getters, `dispatchImpl`
 * controls the async fetch result, and commit/dispatch are spies.
 */
function makeStore({ videos = [], hasMore = true, dispatchImpl } = {}) {
  const store = {
    state: { youtube: { error: null } },
    getters: {
      "youtube/videos": videos,
      "youtube/hasMore": hasMore,
    },
    commit: vi.fn(),
    dispatch: vi.fn(dispatchImpl || (() => Promise.resolve())),
  };
  return store;
}

// useStore is provided via vuex mock that returns the store we install.
let currentStore;
vi.mock("vuex", () => ({
  useStore: () => currentStore,
}));

function mountComponent({ store } = {}) {
  currentStore = store || makeStore();
  const wrapper = mount(Index, {
    global: {
      stubs: {
        VideoCard: VideoCardStub,
        AdBanner: AdBannerStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
  return { wrapper, store: currentStore };
}

/** Build N video objects with the id.videoId shape the :key relies on. */
function makeVideos(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: { videoId: `vid-${i}` },
    title: `Video ${i}`,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset URL so onMounted's URLSearchParams reads the branch we want.
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("YouTube/Index.vue", () => {
  it("loads channel videos on mount (no URL params) and renders the search UI", async () => {
    const store = makeStore({ videos: makeVideos(2), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();

    // onMounted -> loadVideos -> clearVideos commit + fetchVideos dispatch.
    expect(store.commit).toHaveBeenCalledWith("youtube/clearVideos");
    expect(store.dispatch).toHaveBeenCalledWith("youtube/fetchVideos", {
      size: 12,
      page: 0,
    });
    // searchQuery branch in fetchData NOT taken.
    expect(store.dispatch).not.toHaveBeenCalledWith(
      "youtube/searchVideos",
      expect.anything()
    );

    // !isLoading branch active -> search input + button visible.
    expect(wrapper.find("#searchQuery").exists()).toBe(true);
    const btn = wrapper.find(".search-btn");
    expect(btn.exists()).toBe(true);
    // isLoading false -> "Search" label, button enabled.
    expect(btn.text()).toContain("Search");
    expect(btn.attributes("disabled")).toBeUndefined();

    // videos.length > 0 branch -> the grid + one VideoCard per video.
    expect(wrapper.find(".row.row-cols-1").exists()).toBe(true);
    expect(wrapper.findAll(".video-card-stub")).toHaveLength(2);

    // 2 videos -> shouldShowAdAfter false for both -> no ad banner.
    expect(wrapper.find(".ad-banner-stub").exists()).toBe(false);

    // Loading shimmer (v-else) hidden.
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("renders an AdBanner after the 6th video (shouldShowAdAfter true branch)", async () => {
    const store = makeStore({ videos: makeVideos(6), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();

    expect(wrapper.findAll(".video-card-stub")).toHaveLength(6);
    // index 5 -> (5+1)%6===0 -> one ad banner with IN_ARTICLE_MID placement.
    const ads = wrapper.findAll(".ad-banner-stub");
    expect(ads).toHaveLength(1);
    expect(ads[0].attributes("data-placement")).toBe("in_article_mid");
  });

  it("renders the empty-state (videos.length === 0) with no grid and no cards", async () => {
    const store = makeStore({ videos: [], hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();

    // videos.length > 0 is false -> grid not rendered.
    expect(wrapper.find(".row.row-cols-1").exists()).toBe(false);
    expect(wrapper.find(".video-card-stub").exists()).toBe(false);
    // InfiniteLoading stub still present.
    expect(wrapper.find(".infinite-loading-stub").exists()).toBe(true);
  });

  it("shows the loading shimmer (v-else) and 'Searching...' state while a fetch is pending", async () => {
    // dispatch never resolves -> finally never runs -> isLoading stays true.
    let resolve;
    const pending = new Promise((res) => {
      resolve = res;
    });
    const store = makeStore({
      videos: makeVideos(1),
      hasMore: true,
      dispatchImpl: () => pending,
    });
    const { wrapper } = mountComponent({ store });

    // Let onMounted's synchronous part flip isLoading true.
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // !isLoading false -> the v-else shimmer block renders (v-for index in 3).
    expect(wrapper.find(".shimmer").exists()).toBe(true);
    expect(wrapper.findAll(".col-md-3")).toHaveLength(3);
    // Search input hidden while loading.
    expect(wrapper.find("#searchQuery").exists()).toBe(false);

    // Resolve to flip isLoading back and confirm the search UI returns.
    resolve();
    await flushPromises();
    expect(wrapper.find("#searchQuery").exists()).toBe(true);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("logs and recovers when the channel fetch rejects (fetchData catch branch)", async () => {
    const boom = new Error("fetch boom");
    const store = makeStore({
      videos: [],
      hasMore: true,
      dispatchImpl: () => Promise.reject(boom),
    });
    mountComponent({ store });
    await flushPromises();

    expect(devLog.error).toHaveBeenCalledWith("Error fetching videos:", boom);
    // finally still ran (isLoading reset logged).
    expect(devLog.info).toHaveBeenCalledWith("Setting isLoading:false");
  });

  it("short-circuits fetchData when hasMore is false (early return, no dispatch)", async () => {
    const store = makeStore({ videos: [], hasMore: false });
    mountComponent({ store });
    await flushPromises();

    // clearVideos still committed by loadVideos, but fetchData returns early.
    expect(store.commit).toHaveBeenCalledWith("youtube/clearVideos");
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("runs the search path on mount when ?search= is present and updates the URL with the query", async () => {
    window.history.replaceState({}, "", "/?search=jazz");
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    mountComponent({ store });
    await flushPromises();

    // onMounted -> searchVideos -> searchVideos dispatch (searchQuery truthy).
    expect(store.dispatch).toHaveBeenCalledWith("youtube/searchVideos", {
      query: "jazz",
      size: 12,
      page: 0,
    });
    // router.replace called with the actual query (searchQuery.value || undefined -> "jazz").
    expect(replaceMock).toHaveBeenCalledWith({ query: { search: "jazz" } });
  });

  it("reads ?channelId= into channelId but still loads via the channel path", async () => {
    window.history.replaceState({}, "", "/?channelId=UC123");
    const store = makeStore({ videos: [], hasMore: true });
    mountComponent({ store });
    await flushPromises();

    // channelIdParam branch taken; searchQuery empty -> loadVideos/fetchVideos.
    expect(store.dispatch).toHaveBeenCalledWith("youtube/fetchVideos", {
      size: 12,
      page: 0,
    });
    expect(store.dispatch).not.toHaveBeenCalledWith(
      "youtube/searchVideos",
      expect.anything()
    );
  });

  it("clicking Search clears videos, dispatches the search and replaces URL with undefined when query empty", async () => {
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();
    vi.clearAllMocks();

    // searchQuery is empty -> button click -> searchVideos with empty query.
    await wrapper.find(".search-btn").trigger("click");
    await flushPromises();

    expect(store.commit).toHaveBeenCalledWith("youtube/clearVideos");
    // searchQuery empty -> fetchData takes the else (fetchVideos) branch.
    expect(store.dispatch).toHaveBeenCalledWith("youtube/fetchVideos", {
      size: 12,
      page: 0,
    });
    // router.replace: searchQuery.value || undefined -> undefined branch.
    expect(replaceMock).toHaveBeenCalledWith({ query: { search: undefined } });
  });

  it("typing a query then pressing Enter triggers a search and the watcher clears channelId", async () => {
    window.history.replaceState({}, "", "/?channelId=UC999");
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();
    vi.clearAllMocks();

    const input = wrapper.find("#searchQuery");
    // Setting a truthy value fires the watcher truthy branch (clears channelId).
    await input.setValue("news");
    // keyup.enter -> searchVideos with the typed query.
    await input.trigger("keyup.enter");
    await flushPromises();

    expect(store.dispatch).toHaveBeenCalledWith("youtube/searchVideos", {
      query: "news",
      size: 12,
      page: 0,
    });
    expect(replaceMock).toHaveBeenCalledWith({ query: { search: "news" } });

    // Now clear the input -> watcher falsy branch (no channelId assignment).
    await input.setValue("");
    await flushPromises();
    expect(wrapper.find("#searchQuery").element.value).toBe("");
  });

  it("loadMore returns early without completing while a fetch is loading (isLoading guard)", async () => {
    // First mount cleanly (not loading) so the InfiniteLoading stub captures the
    // parent's loadMore handler.
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();
    expect(capturedInfiniteHandler).toBeInstanceOf(Function);
    const loadMore = capturedInfiniteHandler;

    // Now drive isLoading true via a pending search and invoke the captured
    // handler directly -> the isLoading guard fires the early return.
    let resolve;
    store.dispatch.mockImplementationOnce(
      () => new Promise((res) => (resolve = res))
    );
    wrapper.find(".search-btn").trigger("click");
    await wrapper.vm.$nextTick();
    vi.clearAllMocks();

    const state = { complete: vi.fn(), error: vi.fn() };
    await loadMore(state);

    expect(devLog.info).toHaveBeenCalledWith("Is Loading");
    expect(state.complete).not.toHaveBeenCalled();

    resolve();
    await flushPromises();
  });

  it("loadMore completes the infinite-loading state when not loading", async () => {
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();

    const infinite = wrapper.findComponent({ name: "InfiniteLoading" });
    const state = { complete: vi.fn(), error: vi.fn() };
    infinite.vm.$emit("infinite", state);
    await flushPromises();

    expect(state.complete).toHaveBeenCalledTimes(1);
    expect(state.error).not.toHaveBeenCalled();
  });

  it("loadMore catch branch: when $state.complete throws it logs, decrements page and signals error", async () => {
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();

    const infinite = wrapper.findComponent({ name: "InfiniteLoading" });
    const completeBoom = new Error("complete boom");
    const state = {
      complete: vi.fn(() => {
        throw completeBoom;
      }),
      error: vi.fn(),
    };
    infinite.vm.$emit("infinite", state);
    await flushPromises();

    expect(devLog.debug).toHaveBeenCalledWith(
      "Failed to load more videos:",
      completeBoom
    );
    expect(state.error).toHaveBeenCalledTimes(1);
  });

  it("renders the InfiniteLoading slots and the retry button wires up @click", async () => {
    const store = makeStore({ videos: makeVideos(1), hasMore: true });
    const { wrapper } = mountComponent({ store });
    await flushPromises();

    // spinner + complete + error slot markup all rendered by the stub.
    expect(wrapper.find(".infinite-loading-spinner").exists()).toBe(true);
    expect(wrapper.find(".infinite-loading-complete").exists()).toBe(true);
    const errorBlock = wrapper.find(".infinite-loading-error");
    expect(errorBlock.exists()).toBe(true);

    // Clicking Retry invokes the slot-provided retry fn (template @click="retry").
    await errorBlock.find("button").trigger("click");
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
