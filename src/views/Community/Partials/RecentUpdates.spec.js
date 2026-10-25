import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock @/utils (formatTimeAgo) --------------------------------------------
vi.mock("@/utils", () => ({
  formatTimeAgo: vi.fn(() => "1 hour ago"),
}));

// --- Mock heavy child components ---------------------------------------------
vi.mock("@/components/EventCard.vue", () => ({
  default: {
    name: "EventCard",
    props: ["event", "minDetails"],
    template: "<div class='event-card-stub'>{{ event.title }}</div>",
  },
}));
vi.mock("@/views/News/Partials/ArticlesRow.vue", () => ({
  default: {
    name: "ArticlesRow",
    props: ["isLoading", "articles"],
    template: "<div class='articles-row-stub' :data-loading='isLoading' />",
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

import RecentUpdates from "./RecentUpdates.vue";
import { formatTimeAgo } from "@/utils";

const NOTICES = [
  { slug: "first-notice", title: "First Notice", publish_date: "2026-06-01" },
  { slug: "second-notice", title: "Second Notice", publish_date: "2026-06-02" },
  { slug: "third-notice", title: "Third Notice", publish_date: "2026-06-03" },
];

function makeWrapper(props = {}) {
  return mount(RecentUpdates, {
    props,
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

describe("RecentUpdates.vue", () => {
  it("dispatches notices/fetchRecentNotices on mount with correct payload", async () => {
    recent = NOTICES;
    makeWrapper();
    await flushPromises();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith("notices/fetchRecentNotices", {
      type: "communityUpdates",
      size: 8,
    });
  });

  it("renders nothing when there are no recent notices (outer v-if false)", async () => {
    recent = [];
    const wrapper = makeWrapper();
    await flushPromises();

    expect(wrapper.find(".card").exists()).toBe(false);
    expect(wrapper.find(".section-header").exists()).toBe(false);
    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("handles undefined recent getter via optional chaining (outer v-if false)", async () => {
    recent = undefined;
    const wrapper = makeWrapper();
    await flushPromises();

    expect(wrapper.find(".card").exists()).toBe(false);
    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("renders the notices card layout when page is 'notices'", async () => {
    recent = NOTICES;
    const wrapper = makeWrapper({ page: "notices", title: "Community News" });
    await flushPromises();

    const card = wrapper.find(".card");
    expect(card.exists()).toBe(true);
    expect(wrapper.find(".card-header h5").text()).toBe("Community News");

    const items = wrapper.findAll(".list-group-item");
    expect(items).toHaveLength(NOTICES.length);

    // formatTimeAgo called for each notice with its publish_date.
    expect(formatTimeAgo).toHaveBeenCalledWith("2026-06-01");
    expect(formatTimeAgo).toHaveBeenCalledWith("2026-06-02");
    expect(items[0].find("small").text()).toBe("1 hour ago");

    // router-link targets the community slug route.
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].props("to")).toBe("/community/first-notice");
    expect(links[0].text()).toBe("First Notice");
  });

  it("renders the section layout (v-else) when page is not 'notices', with View All link and EventCard first", async () => {
    recent = NOTICES;
    const wrapper = makeWrapper({ page: "feed", title: "Updates", showViewAll: true });
    await flushPromises();

    // v-else branch
    expect(wrapper.find(".card").exists()).toBe(false);
    expect(wrapper.find(".section-header").exists()).toBe(true);
    expect(wrapper.find(".section-title").text()).toBe("Updates");

    // View All link rendered (showViewAll true)
    const viewAll = wrapper
      .findAllComponents(RouterLinkStub)
      .find((l) => l.props("to") === "/community");
    expect(viewAll).toBeTruthy();
    expect(viewAll.text()).toBe("View All");

    // First item is an EventCard (index == 0)
    const eventCard = wrapper.find(".event-card-stub");
    expect(eventCard.exists()).toBe(true);
    expect(eventCard.text()).toBe("First Notice");

    // Remaining items (v-else, index != 0) rendered as list-group-item-action
    const actionItems = wrapper.findAll(".list-group-item-action");
    expect(actionItems).toHaveLength(NOTICES.length - 1);
    expect(actionItems[0].text()).toContain("Second Notice");

    // ArticlesRow not rendered when not loading
    expect(wrapper.find(".articles-row-stub").exists()).toBe(false);
  });

  it("hides the View All link when showViewAll is false", async () => {
    recent = NOTICES;
    const wrapper = makeWrapper({ page: "feed", showViewAll: false });
    await flushPromises();

    const viewAll = wrapper
      .findAllComponents(RouterLinkStub)
      .find((l) => l.props("to") === "/community");
    expect(viewAll).toBeUndefined();
    expect(wrapper.text()).not.toContain("View All");
  });

  it("shows ArticlesRow loading placeholder (v-else of !isLoading) while fetch is in flight", async () => {
    recent = NOTICES;
    // Keep the dispatch pending so isLoading stays true during render.
    let resolveDispatch;
    dispatch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        })
    );

    const wrapper = makeWrapper({ page: "feed" });
    await flushPromises();

    // isLoading is true -> ArticlesRow shown, notice list hidden
    const articlesRow = wrapper.find(".articles-row-stub");
    expect(articlesRow.exists()).toBe(true);
    expect(articlesRow.attributes("data-loading")).toBe("true");
    expect(wrapper.find(".event-card-stub").exists()).toBe(false);

    // Resolve and confirm it flips to the real list.
    resolveDispatch();
    await flushPromises();
    expect(wrapper.find(".articles-row-stub").exists()).toBe(false);
    expect(wrapper.find(".event-card-stub").exists()).toBe(true);
  });

  it("logs an error and stops loading when the fetch rejects (catch path)", async () => {
    recent = NOTICES;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");
    dispatch = vi.fn().mockRejectedValue(failure);

    const wrapper = makeWrapper({ page: "feed" });
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith("Error fetching posts:", failure);

    // finally still ran: isLoading false -> notice list rendered, not ArticlesRow.
    expect(wrapper.find(".articles-row-stub").exists()).toBe(false);
    expect(wrapper.find(".event-card-stub").exists()).toBe(true);

    errorSpy.mockRestore();
  });

  it("renders a single EventCard and no action items when only one notice exists", async () => {
    recent = [NOTICES[0]];
    const wrapper = makeWrapper({ page: "feed" });
    await flushPromises();

    expect(wrapper.find(".event-card-stub").exists()).toBe(true);
    expect(wrapper.findAll(".list-group-item-action")).toHaveLength(0);
  });
});
