import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock heavy child component ----------------------------------------------
vi.mock("@/components/EventCard.vue", () => ({
  default: {
    name: "EventCard",
    props: ["event"],
    template: "<div class='event-card-stub'>{{ event.title }}</div>",
  },
}));

// --- Mock vuex ----------------------------------------------------------------
let dispatch;
let recent;
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    getters: {
      get "notices/recent"() {
        return recent;
      },
    },
  }),
}));

import CommunityUpdates from "./CommunityUpdates.vue";

const NOTICES = [
  { id: 1, slug: "first-notice", title: "First Notice" },
  { id: 2, slug: "second-notice", title: "Second Notice" },
  { id: 3, slug: "third-notice", title: "Third Notice" },
];

function makeWrapper() {
  return mount(CommunityUpdates, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dispatch = vi.fn().mockResolvedValue(undefined);
  recent = [];
});

describe("CommunityUpdates.vue", () => {
  it("dispatches notices/fetchRecentNotices on mount with the correct payload", async () => {
    makeWrapper();
    await flushPromises();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("notices/fetchRecentNotices", {
      type: "communityUpdates",
      size: 8,
    });
  });

  it("renders the section header with title and a View All router-link to /notices", async () => {
    const wrapper = makeWrapper();
    await flushPromises();

    expect(wrapper.find(".section-title").text()).toBe(
      "Latest Community Updates"
    );

    const viewAll = wrapper.findComponent(RouterLinkStub);
    expect(viewAll.props("to")).toBe("/notices");
    expect(viewAll.text()).toBe("View All");
  });

  it("renders no EventCard columns when the recent getter is empty (v-for empty branch)", async () => {
    recent = [];
    const wrapper = makeWrapper();
    await flushPromises();

    expect(wrapper.findAll(".col-md-4")).toHaveLength(0);
    expect(wrapper.find(".event-card-stub").exists()).toBe(false);
  });

  it("renders one EventCard column per notice when the getter has items (v-for non-empty branch)", async () => {
    recent = NOTICES;
    const wrapper = makeWrapper();
    await flushPromises();

    const columns = wrapper.findAll(".col-md-4");
    expect(columns).toHaveLength(NOTICES.length);

    const cards = wrapper.findAll(".event-card-stub");
    expect(cards).toHaveLength(NOTICES.length);
    expect(cards[0].text()).toBe("First Notice");
    expect(cards[1].text()).toBe("Second Notice");
    expect(cards[2].text()).toBe("Third Notice");
  });

  it("toggles isLoading: true while the dispatch is in flight, false after it resolves (finally)", async () => {
    let resolveDispatch;
    dispatch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        })
    );

    const wrapper = makeWrapper();
    // onMounted ran synchronously up to the awaited dispatch.
    expect(wrapper.vm.isLoading).toBe(true);

    resolveDispatch();
    await flushPromises();
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it("logs an error and still clears loading when the dispatch rejects (catch + finally)", async () => {
    recent = NOTICES;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");
    dispatch = vi.fn().mockRejectedValue(failure);

    const wrapper = makeWrapper();
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", failure);
    // finally still ran.
    expect(wrapper.vm.isLoading).toBe(false);
    // Render still completes against the recent getter.
    expect(wrapper.findAll(".event-card-stub")).toHaveLength(NOTICES.length);

    errorSpy.mockRestore();
  });
});
