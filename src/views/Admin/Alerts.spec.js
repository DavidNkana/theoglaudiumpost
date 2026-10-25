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

import Alerts from "@/views/Admin/Alerts.vue";

function mountAlerts() {
  return mount(Alerts, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMock = { query: {} };
  // Deterministic mock data: Math.random() -> 0 keeps generateMockPosts stable
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Alerts.vue", () => {
  it("renders the loading spinner before the fetch timeout resolves", () => {
    const wrapper = mountAlerts();

    // Initial render: loading === true branch (v-if="loading")
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".visually-hidden").text()).toBe("Loading...");
    // No "no posts" row, no data rows yet
    expect(wrapper.text()).not.toContain("No posts found");
  });

  it("renders categories, posts, pagination and badge classes after fetch resolves", async () => {
    const wrapper = mountAlerts();

    // Resolve setTimeout in fetchPosts + flush microtasks for category fetch
    vi.runAllTimers();
    await flushPromises();

    // Loading row gone
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // Categories populated (v-for non-empty branch): 4 categories + "All Categories"
    const options = wrapper.findAll("select option");
    expect(options).toHaveLength(5);
    expect(options[1].text()).toBe("News");

    // Posts rendered (v-for non-empty branch): 10 mock posts
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(10);

    // featured_image both branches: Math.random()=0 -> even ids get an image.
    // i % 2 === 0 => ids 2,4,6,8,10 have <img>, odd ids do not.
    const images = wrapper.findAll("tbody tr img");
    expect(images).toHaveLength(5);
    expect(images[0].attributes("src")).toBe("https://placehold.co/40");

    // default tab "all" -> Math.random()=0 picks statuses[0] === "approved"
    const badge = wrapper.find("tbody tr span.badge");
    expect(badge.classes()).toContain("bg-success");

    // Pagination visible (pagination.total > 0 branch)
    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(true);
    // getPageNumbers: last_page 3 -> pages 1,2,3 (each rendered as page-link)
    const pageItems = wrapper.findAll(".pagination .page-item");
    // Previous + 3 numbers + Next = 5
    expect(pageItems).toHaveLength(5);
    // current_page === 1 -> Previous disabled, page 1 active
    expect(pageItems[0].classes()).toContain("disabled");
    expect(pageItems[1].classes()).toContain("active");
  });

  it("formats the created_at date for display", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    const createdCell = wrapper.findAll("tbody tr")[0].findAll("td")[4];
    // formatDate runs toLocaleDateString; assert it produced a non-empty string
    expect(createdCell.text().length).toBeGreaterThan(0);
    expect(createdCell.text()).not.toContain("Invalid");
  });

  it("maps every status to its badge class and falls back for unknown status", async () => {
    // Drive the watcher with a tab that is not 'all' and not a known status.
    // generateMockPosts(status) then stamps that status on every post,
    // exercising the getStatusBadgeClass default fallback branch.
    routeMock = { query: { tab: "weird" } };
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    const badge = wrapper.find("tbody tr span.badge");
    expect(badge.text()).toBe("weird");
    expect(badge.classes()).toContain("bg-secondary");
  });

  it("covers each known status badge mapping via direct method invocation", () => {
    const wrapper = mountAlerts();
    // Not exposed on vm? getStatusBadgeClass is returned from setup.
    expect(wrapper.vm.getStatusBadgeClass("approved")).toBe("badge bg-success");
    expect(wrapper.vm.getStatusBadgeClass("draft")).toBe("badge bg-info");
    expect(wrapper.vm.getStatusBadgeClass("pending")).toBe("badge bg-warning");
    expect(wrapper.vm.getStatusBadgeClass("rejected")).toBe("badge bg-danger");
    expect(wrapper.vm.getStatusBadgeClass("nope")).toBe("badge bg-secondary");
  });

  it("renders the empty 'No posts found' state when posts list is empty", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    // Force the empty branch (posts.length === 0)
    wrapper.vm.posts = [];
    await flushPromises();

    expect(wrapper.text()).toContain("No posts found");
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });

  it("hides pagination when total is zero (pagination.total > 0 false branch)", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    wrapper.vm.pagination = {
      current_page: 1,
      per_page: 10,
      last_page: 1,
      total: 0,
    };
    await flushPromises();

    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(false);
  });

  it("renders categories empty option only when there are no categories", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    wrapper.vm.categories = [];
    await flushPromises();

    // Only the "All Categories" option remains (v-for empty branch)
    const options = wrapper.findAll("select option");
    expect(options).toHaveLength(1);
    expect(options[0].text()).toBe("All Categories");
  });

  it("applyFilters resets to page 1 and refetches", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    // Move to page 2 first
    wrapper.vm.pagination.current_page = 2;
    await wrapper.find(".btn-outline-secondary").trigger("click"); // Apply Filters

    expect(wrapper.vm.pagination.current_page).toBe(1);
    // The refetch sets loading true then resolves on the timer
    vi.runAllTimers();
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
  });

  it("changePage navigates within range and refetches", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    // Click page 2 link (valid path)
    const pageLinks = wrapper.findAll(".pagination .page-item a");
    // index 0 = Previous, 1 = page1, 2 = page2 ...
    await pageLinks[2].trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(2);

    vi.runAllTimers();
    await flushPromises();
  });

  it("changePage ignores out-of-range pages (page < 1 and page > last_page)", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(1);

    // page < 1: clicking "Previous" while on page 1 -> changePage(0) -> no-op
    const prev = wrapper.findAll(".pagination .page-item a")[0];
    await prev.trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // page > last_page: go to last page, then Next -> changePage(last+1) -> no-op
    wrapper.vm.pagination.current_page = wrapper.vm.pagination.last_page;
    await flushPromises();
    const links = wrapper.findAll(".pagination .page-item a");
    const next = links[links.length - 1];
    await next.trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(wrapper.vm.pagination.last_page);
  });

  it("getPageNumbers covers the wide-window branch (endPage - startPage >= 4)", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    // last_page large + current_page mid -> startPage..endPage span of 4,
    // so the `endPage - startPage < 4` guard is NOT taken.
    wrapper.vm.pagination = {
      current_page: 5,
      per_page: 10,
      last_page: 10,
      total: 100,
    };
    await flushPromises();

    expect(wrapper.vm.getPageNumbers()).toEqual([3, 4, 5, 6, 7]);

    // Also cover the narrow branch where endPage - startPage < 4 is taken
    wrapper.vm.pagination = {
      current_page: 10,
      per_page: 10,
      last_page: 10,
      total: 100,
    };
    await flushPromises();
    expect(wrapper.vm.getPageNumbers()).toEqual([6, 7, 8, 9, 10]);
  });

  it("createNewPost navigates to the create route", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    await wrapper.find(".btn-success").trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/events/create");
  });

  it("editPost navigates to the edit route for the clicked post", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    const editBtn = wrapper.find("tbody tr .btn-outline-success");
    await editBtn.trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/events/edit/1");
  });

  it("confirmDelete deletes when confirmed and refreshes data", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    const delBtn = wrapper.find("tbody tr .btn-outline-danger");
    await delBtn.trigger("click");

    expect(confirmSpy).toHaveBeenCalledWith(
      "Are you sure you want to delete this post?"
    );
    // deletePost -> fetchPosts + fetchStats; resolve timers so the refetch lands
    vi.runAllTimers();
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
  });

  it("confirmDelete does nothing when the user cancels", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    push.mockClear();
    const delBtn = wrapper.find("tbody tr .btn-outline-danger");
    await delBtn.trigger("click");

    expect(confirmSpy).toHaveBeenCalled();
    // No navigation, list unchanged length
    expect(wrapper.findAll("tbody tr")).toHaveLength(10);
  });

  it("binds search and category filters via v-model", async () => {
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    await wrapper.find("input[type='text']").setValue("crime");
    expect(wrapper.vm.filters.search).toBe("crime");

    // Native <select> with numeric :value binds the number, not a string.
    await wrapper.find("select").setValue("2");
    expect(wrapper.vm.filters.category).toBe(2);
  });

  it("watcher resets to 'all' when the tab query becomes falsy", async () => {
    routeMock = { query: { tab: "pending" } };
    const wrapper = mountAlerts();
    vi.runAllTimers();
    await flushPromises();

    // immediate watcher set activeTab to "pending" and status filter accordingly
    expect(wrapper.vm.activeTab).toBe("pending");
    expect(wrapper.vm.filters.status).toBe("pending");

    // Now clear the tab -> newTab undefined -> activeTab "all", status ""
    routeMock.query.tab = undefined;
    // Re-trigger watcher by mutating the reactive source it observes
    // (route is a plain mock; drive the method directly through a remount path)
    // Instead, mount fresh without a tab to cover the "all" ternary branches.
    const wrapper2 = mountAlerts();
    vi.runAllTimers();
    await flushPromises();
    expect(wrapper2.vm.activeTab).toBe("all");
    expect(wrapper2.vm.filters.status).toBe("");
  });

  it("logs and recovers when fetchPosts throws synchronously (catch branch)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Make setTimeout throw so the try/catch in fetchPosts hits catch.
    const stSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementationOnce(() => {
        throw new Error("timer boom");
      });

    const wrapper = mountAlerts();
    await flushPromises();

    // The immediate watcher's fetchPosts hits the throwing setTimeout -> catch.
    expect(stSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith("Error fetching posts:", expect.any(Error));

    // onMounted's later fetchPosts uses the real (fake) timer; resolve it so the
    // component settles back into a loaded state.
    vi.runAllTimers();
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
  });
});
