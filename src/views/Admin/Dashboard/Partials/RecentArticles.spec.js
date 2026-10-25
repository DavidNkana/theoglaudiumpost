import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// Mock the articles service — single boundary the component imports.
const getArticles = vi.fn();
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticles: (...args) => getArticles(...args),
}));

// Mock the time-ago formatter so we can assert exactly which date is used.
const formatTimeAgo = vi.fn((d) => `ago:${d}`);
vi.mock("@/utils", () => ({
  formatTimeAgo: (...args) => formatTimeAgo(...args),
}));

import RecentArticles from "./RecentArticles.vue";

// Light stub for the child component so it does not pull MediaService/onMounted
// fetching; it just surfaces the bound media-id so we can assert the prop.
const TableImageWithPlaceholderStub = {
  name: "TableImageWithPlaceholder",
  props: ["mediaId"],
  template: '<div class="ti-stub" :data-media-id="mediaId"></div>',
};

const mountComponent = () =>
  mount(RecentArticles, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        TableImageWithPlaceholder: TableImageWithPlaceholderStub,
      },
    },
  });

beforeEach(() => {
  getArticles.mockReset();
  formatTimeAgo.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("RecentArticles.vue", () => {
  it("renders the loading shimmer (v-else branch) before data resolves", async () => {
    // Never-resolving promise keeps isLoading true so the v-else template runs.
    getArticles.mockReturnValue(new Promise(() => {}));
    const wrapper = mountComponent();
    // Let onMounted -> fetchData flip isLoading true and re-render.
    await wrapper.vm.$nextTick();

    // Header + View all link render regardless of state.
    expect(wrapper.find(".card-title").text()).toBe("Recent Articles");
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/admin/articles");
    expect(link.text()).toBe("View all");

    // Loading branch: 5 shimmer rows, no list-group.
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(5);
    expect(wrapper.find(".list-group").exists()).toBe(false);
  });

  it("fetches with size 5 and renders articles (success, both cover_id branches)", async () => {
    getArticles.mockResolvedValue({
      status: 200,
      data: {
        articles: [
          {
            id: 1,
            cover_id: "cov-1",
            title: "First Article",
            summary: "Summary one",
            scheduledFor: "2026-01-01",
            created_at: "2025-12-01",
          },
          {
            id: 2,
            // no cover_id -> v-if false branch
            title: "Second Article",
            summary: "Summary two",
            // no scheduledFor -> falls back to created_at via || operator
            created_at: "2025-11-15",
          },
        ],
      },
    });

    const wrapper = mountComponent();
    await flushPromises();

    // Called with the fixed paging size.
    expect(getArticles).toHaveBeenCalledWith({ size: 5 });

    // Loading finished -> list-group shown, shimmer gone.
    expect(wrapper.find(".list-group").exists()).toBe(true);
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(0);

    const items = wrapper.findAll(".list-group-item");
    expect(items).toHaveLength(2);

    // First item: cover_id truthy -> child stub rendered with media-id.
    const stub = items[0].find(".ti-stub");
    expect(stub.exists()).toBe(true);
    expect(stub.attributes("data-media-id")).toBe("cov-1");
    expect(items[0].find("h6").text()).toBe("First Article");
    expect(items[0].find("p").text()).toBe("Summary one");

    // Second item: no cover_id -> child not rendered.
    expect(items[1].find(".ti-stub").exists()).toBe(false);
    expect(items[1].find("h6").text()).toBe("Second Article");

    // formatTimeAgo: scheduledFor used when present, else created_at.
    expect(formatTimeAgo).toHaveBeenNthCalledWith(1, "2026-01-01");
    expect(formatTimeAgo).toHaveBeenNthCalledWith(2, "2025-11-15");
    expect(items[0].find("small").text()).toBe("ago:2026-01-01");
    expect(items[1].find("small").text()).toBe("ago:2025-11-15");
  });

  it("renders an empty list (v-for empty) when articles is missing (?? [] branch)", async () => {
    // data has no `articles` key -> nullish coalescing falls back to [].
    getArticles.mockResolvedValue({ status: 200, data: {} });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find(".list-group").exists()).toBe(true);
    expect(wrapper.findAll(".list-group-item")).toHaveLength(0);
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(0);
  });

  it("handles a non-200 status by throwing and entering the catch (error path)", async () => {
    getArticles.mockResolvedValue({ status: 500, data: { articles: [] } });

    const wrapper = mountComponent();
    await flushPromises();

    // Catch ran: console.error called, isLoading reset to false.
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(console.error.mock.calls[0][0].message).toBe(
      "Unable to Fetch Recent Articles"
    );

    // Loading ended; articles stays the initial {} so no items render.
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(0);
    expect(wrapper.find(".list-group").exists()).toBe(true);
    expect(wrapper.findAll(".list-group-item")).toHaveLength(0);
  });

  it("handles a rejected service call (catch branch via reject)", async () => {
    const boom = new Error("network down");
    getArticles.mockRejectedValue(boom);

    const wrapper = mountComponent();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(boom);
    // isLoading reset -> shimmer gone, list-group container shown.
    expect(wrapper.findAll(".shimmer-row")).toHaveLength(0);
    expect(wrapper.find(".list-group").exists()).toBe(true);
  });
});
