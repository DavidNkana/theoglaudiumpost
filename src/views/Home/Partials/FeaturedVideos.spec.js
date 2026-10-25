import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";
import { createStore } from "vuex";
import FeaturedVideos from "@/views/Home/Partials/FeaturedVideos.vue";

// Mock the dev logger so the catch branch can be asserted without real console
// styling/noise and without depending on @/config/env.
vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

import { devLog } from "@/utils/devLog";

// Stub the VideoCard child so this spec only instruments FeaturedVideos.vue.
const VideoCardStub = {
  name: "VideoCard",
  props: ["video"],
  template: `<div class="video-card-stub">{{ video.title }}</div>`,
};

/**
 * Build a vuex store whose `youtube/recent` getter returns the supplied list
 * and whose dispatch is a spy that resolves or rejects on demand.
 */
function makeStore({ videos = [], dispatchImpl } = {}) {
  const store = createStore({
    getters: {
      "youtube/recent": () => videos,
    },
  });
  const dispatch = vi.fn(dispatchImpl || (() => Promise.resolve()));
  store.dispatch = dispatch;
  return { store, dispatch };
}

function mountComponent({ videos, dispatchImpl } = {}) {
  const { store, dispatch } = makeStore({ videos, dispatchImpl });
  const wrapper = mount(FeaturedVideos, {
    global: {
      plugins: [store],
      stubs: {
        VideoCard: VideoCardStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
  return { wrapper, store, dispatch };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeaturedVideos.vue", () => {
  it("dispatches youtube/fetchRecentVideos on mount with the default channel + size", async () => {
    const { dispatch } = mountComponent({ videos: [] });
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("youtube/fetchRecentVideos", {
      channelId: "",
      size: 10,
    });
  });

  it("renders nothing when there are no videos (empty length short-circuits the v-if)", async () => {
    const { wrapper } = mountComponent({ videos: [] });
    await flushPromises();

    // Outer section hidden -> no header, no grid, no cards.
    expect(wrapper.find("section").exists()).toBe(false);
    expect(wrapper.find(".video-card-stub").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Featured Videos");
  });

  it("renders the section, header, View All link and a VideoCard per video once loaded", async () => {
    const videos = [
      { id: "a", title: "First Video" },
      { id: "b", title: "Second Video" },
    ];
    const { wrapper } = mountComponent({ videos });
    await flushPromises();

    // Section visible: featuredVideos.length truthy AND !isLoading (finally ran).
    const section = wrapper.find("section");
    expect(section.exists()).toBe(true);

    // Header content.
    expect(wrapper.find(".section-title").text()).toBe("Featured Videos");

    // "View All" router-link points to the podcasts route.
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/podcasts");
    expect(link.text()).toBe("View All");

    // One VideoCard per video, with the video prop passed through (v-for non-empty).
    const cards = wrapper.findAllComponents(VideoCardStub);
    expect(cards).toHaveLength(2);
    expect(cards[0].props("video")).toEqual(videos[0]);
    expect(cards[1].props("video")).toEqual(videos[1]);
    expect(wrapper.text()).toContain("First Video");
    expect(wrapper.text()).toContain("Second Video");
  });

  it("hides the section while loading even when videos are present (right side of && evaluated)", async () => {
    // dispatch never resolves -> finally never runs -> isLoading stays true.
    let resolveDispatch;
    const pending = new Promise((res) => {
      resolveDispatch = res;
    });
    const videos = [{ id: "a", title: "Loading Video" }];
    const { wrapper } = mountComponent({
      videos,
      dispatchImpl: () => pending,
    });

    // Let the synchronous part of onMounted run (isLoading set to true).
    await wrapper.vm.$nextTick();

    // featuredVideos.length is truthy, so the && evaluates !isLoading (false)
    // -> section hidden during the in-flight fetch.
    expect(wrapper.find("section").exists()).toBe(false);

    // Resolve the in-flight dispatch and confirm the section then appears
    // (finally flips isLoading back to false).
    resolveDispatch();
    await flushPromises();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("logs via devLog.error and recovers when the dispatch rejects (catch + finally branches)", async () => {
    const rejection = new Error("yt boom");
    const videos = [{ id: "a", title: "After Error" }];
    const { wrapper, dispatch } = mountComponent({
      videos,
      dispatchImpl: () => Promise.reject(rejection),
    });

    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("youtube/fetchRecentVideos", {
      channelId: "",
      size: 10,
    });
    expect(devLog.error).toHaveBeenCalledWith(
      "Error Fetching Recent YT: ",
      rejection
    );

    // finally still flips isLoading to false, so with videos present the
    // section renders despite the rejection.
    expect(wrapper.find("section").exists()).toBe(true);
    expect(wrapper.find(".video-card-stub").text()).toBe("After Error");
  });
});
