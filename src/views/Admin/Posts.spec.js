import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// vue-router -> useRoute / useRouter return controllable mocks
const push = vi.fn();
let routeMock;
vi.mock("vue-router", () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ push }),
}));

import Posts from "@/views/Admin/Posts.vue";

function mountPosts() {
  return mount(Posts, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMock = { query: {} };
  vi.useFakeTimers();
  // Deterministic mock data: Math.random -> 0 so generateMockPosts is stable.
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Posts.vue (Admin)", () => {
  it("renders the loading spinner before the fetch timeout resolves", () => {
    const wrapper = mountPosts();

    // loading starts true -> spinner row visible, no data rows yet
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("tbody tr td .visually-hidden").text()).toBe("Loading...");
    // Pagination hidden while total is 0
    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(false);
  });

  it("renders posts, stats, categories and pagination after the fetch resolves (default 'all' tab)", async () => {
    const wrapper = mountPosts();

    // onMounted fired fetchStats + fetchCategories synchronously, fetchPosts via setTimeout
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Stats rendered
    expect(wrapper.findAll(".card-text").map((c) => c.text())).toEqual([
      "42",
      "18",
      "7",
      "3",
    ]);

    // Categories rendered into the select (4 + the "All Categories" option)
    const options = wrapper.find("select.form-select").findAll("option");
    expect(options).toHaveLength(5);
    expect(options[1].text()).toBe("News");

    // 10 mock posts rendered (no loading / empty rows)
    const dataRows = wrapper.findAll("tbody tr").filter((r) => r.find("td").exists());
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("No posts found");
    // Each post id 1..10 present
    expect(wrapper.findAll("tbody tr")).toHaveLength(10);

    // featured_image branch: even ids get an <img>, odd ids do not.
    const imgs = wrapper.findAll("tbody tr img");
    expect(imgs.length).toBe(5); // i=2,4,6,8,10

    // Pagination shown because total > 0
    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(true);

    // Status badge classes (Math.random()->0 means status index 0 => 'approved' for 'all')
    const badge = wrapper.find("tbody tr td span");
    expect(badge.classes()).toContain("bg-success");
    expect(dataRows.length).toBe(10);
  });

  it("activates the correct tab and sets status filter for a non-'all' tab via the route query + watcher", async () => {
    routeMock = { query: { tab: "approved" } };
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // The 'approved' router-link is marked active
    const links = wrapper.findAllComponents(RouterLinkStub);
    const approvedLink = links.find((l) => l.text().trim() === "Approved");
    expect(approvedLink.classes()).toContain("active");

    // Non-'all' tab => generateMockPosts forces every post status to 'approved'
    const badges = wrapper.findAll("tbody tr td span");
    badges.forEach((b) => expect(b.classes()).toContain("bg-success"));
  });

  it("covers all status badge classes including the secondary fallback", async () => {
    const wrapper = mountPosts();
    expect(wrapper.vm.getStatusBadgeClass("approved")).toBe("badge bg-success");
    expect(wrapper.vm.getStatusBadgeClass("draft")).toBe("badge bg-info");
    expect(wrapper.vm.getStatusBadgeClass("pending")).toBe("badge bg-warning");
    expect(wrapper.vm.getStatusBadgeClass("rejected")).toBe("badge bg-danger");
    expect(wrapper.vm.getStatusBadgeClass("anything-else")).toBe("badge bg-secondary");
  });

  it("formats dates with the en-ZA locale", () => {
    const wrapper = mountPosts();
    const formatted = wrapper.vm.formatDate("2024-01-15T00:00:00Z");
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/Jan/);
  });

  it("createNewPost and editPost navigate via the router", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find(".card-header button.btn-primary").trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/posts/create");

    await wrapper.find("tbody tr .btn-outline-primary").trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/posts/edit/1");
  });

  it("applyFilters resets to page 1 and refetches", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Move off page 1 first
    wrapper.vm.pagination.current_page = 2;
    await wrapper.find(".btn-outline-secondary").trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(1);
  });

  it("v-model binds the search and category filters", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("input[type='text']").setValue("hello");
    expect(wrapper.vm.filters.search).toBe("hello");

    // option :value is bound to the numeric category.id, so v-model stores a number
    await wrapper.find("select.form-select").setValue(2);
    expect(wrapper.vm.filters.category).toBe(2);
  });

  it("changePage ignores out-of-range pages and accepts valid ones", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // last_page is 3 after fetch
    expect(wrapper.vm.pagination.last_page).toBe(3);

    // Below range -> no change
    wrapper.vm.changePage(0);
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // Above range -> no change
    wrapper.vm.changePage(99);
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // Valid -> updates and refetches
    wrapper.vm.changePage(2);
    expect(wrapper.vm.pagination.current_page).toBe(2);
  });

  it("changePage works through the pagination Previous/Next/number links", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Click a numbered page link (renders pages 1..3)
    const pageLinks = wrapper.findAll("nav .pagination li a.page-link");
    // Last link is "Next", first is "Previous"; click "Next"
    await pageLinks[pageLinks.length - 1].trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(2);

    // Click "Previous"
    await pageLinks[0].trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // Click a specific numbered page (the "2" link)
    const numbered = wrapper
      .findAll("nav .pagination li a.page-link")
      .find((a) => a.text() === "2");
    await numbered.trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(2);
  });

  it("getPageNumbers covers both the windowed and clamped branches", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Default: current_page=1, last_page=3 -> endPage-startPage < 4 (clamp branch)
    expect(wrapper.vm.getPageNumbers()).toEqual([1, 2, 3]);

    // Large range: endPage-startPage >= 4 (windowed branch, no clamp)
    wrapper.vm.pagination.last_page = 20;
    wrapper.vm.pagination.current_page = 10;
    expect(wrapper.vm.getPageNumbers()).toEqual([8, 9, 10, 11, 12]);
  });

  it("confirmDelete deletes when confirmed and refreshes data", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("tbody tr .btn-outline-danger").trigger("click");
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Deleting post 1");
  });

  it("confirmDelete does nothing when the confirm dialog is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("tbody tr .btn-outline-danger").trigger("click");
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("deletePost catch path: logs the error when the delete body throws", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    // Make the try-body throw by having console.log throw on the "Deleting" call.
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("boom");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("tbody tr .btn-outline-danger").trigger("click");
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith(
      "Error deleting post:",
      expect.any(Error)
    );
  });

  it("fetchPosts catch path: logs the error when setTimeout throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Force the try-body to throw synchronously for every fetchPosts call
    // (the immediate watcher + onMounted both invoke it), so loading settles false.
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(() => {
        throw new Error("timer-fail");
      });

    const wrapper = mountPosts();
    await flushPromises();

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Error fetching posts:",
      expect.any(Error)
    );
    // loading reset to false in the catch
    expect(wrapper.vm.loading).toBe(false);
  });

  it("renders the empty state when fetch returns no posts", async () => {
    const wrapper = mountPosts();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Force the empty branch directly
    wrapper.vm.posts = [];
    wrapper.vm.pagination.total = 0;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("No posts found");
    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(false);
  });
});
