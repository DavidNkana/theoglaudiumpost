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

import Advertisements from "@/views/Admin/Advertisements.vue";

function mountAds() {
  return mount(Advertisements, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  routeMock = { query: {} };
  // Deterministic mock data: floor(0.5 * len) and floor(0.5 * 1000) etc.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Advertisements.vue", () => {
  it("renders the loading spinner state before the fetch timeout resolves", async () => {
    const wrapper = mountAds();
    await wrapper.vm.$nextTick();

    // loading is true initially -> spinner row, no posts, no 'No posts found'
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("No posts found");
    // Stats populated by onMounted -> fetchStats
    expect(wrapper.find(".bg-success.text-white .card-text").text()).toBe("42");
    expect(wrapper.find(".bg-warning.text-white .card-text").text()).toBe("7");
    expect(wrapper.find(".bg-danger.text-white .card-text").text()).toBe("3");
  });

  it("renders categories from fetchCategories into the select", async () => {
    const wrapper = mountAds();
    await wrapper.vm.$nextTick();
    const options = wrapper.findAll("select option");
    // 1 default 'All Categories' + 4 mock categories
    expect(options).toHaveLength(5);
    expect(options[1].text()).toBe("News");
    expect(options[4].text()).toBe("Community");
  });

  it("renders posts after the fetch timeout (success path) for the default 'all' tab", async () => {
    const wrapper = mountAds();

    // Advance the simulated API setTimeout
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    // 10 mock posts rendered
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(10);

    // featured_image branch: even ids have an <img>, odd ids do not
    expect(wrapper.findAll("tbody tr img").length).toBe(5);

    // Pagination shows because total > 0
    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(true);

    // active tab is 'all' -> first nav router-link has active class
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].classes()).toContain("active");
    expect(links[1].classes()).not.toContain("active");
  });

  it("shows 'No posts found' when the fetch yields an empty list", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Force the empty-state branch directly on the reactive list
    wrapper.vm.posts = [];
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("No posts found");
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });

  it("hides pagination when total is 0", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    wrapper.vm.pagination = {
      current_page: 1,
      per_page: 10,
      last_page: 1,
      total: 0,
    };
    await wrapper.vm.$nextTick();

    expect(wrapper.find("nav[aria-label='Posts pagination']").exists()).toBe(false);
  });

  it("uses the specific status (non-'all' branch) for mock posts when tab query is set", async () => {
    routeMock = { query: { tab: "approved" } };
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // every rendered status badge should read 'approved'
    const badges = wrapper.findAll("tbody tr td span.badge");
    expect(badges).toHaveLength(10);
    badges.forEach((b) => expect(b.text()).toBe("approved"));
    // approved -> bg-success badge class
    expect(badges[0].classes()).toContain("bg-success");

    // active tab is 'approved'
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[1].classes()).toContain("active");
    expect(links[0].classes()).not.toContain("active");
  });

  it("maps every status to the correct badge class (incl. unknown fallback)", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    const fn = wrapper.vm.getStatusBadgeClass;
    expect(fn("approved")).toBe("badge bg-success");
    expect(fn("draft")).toBe("badge bg-info");
    expect(fn("pending")).toBe("badge bg-warning");
    expect(fn("rejected")).toBe("badge bg-danger");
    expect(fn("something-else")).toBe("badge bg-secondary");
  });

  it("formats dates via formatDate", () => {
    const wrapper = mountAds();
    const out = wrapper.vm.formatDate("2025-01-15T00:00:00Z");
    expect(out).toMatch(/2025/);
    expect(out).toMatch(/Jan/);
  });

  it("navigates to create page when 'Add New' is clicked", async () => {
    const wrapper = mountAds();
    await wrapper.find(".btn-success").trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/ads/create");
  });

  it("navigates to the edit page when an Edit button is clicked", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("tbody tr .btn-outline-success").trigger("click");
    expect(push).toHaveBeenCalledWith("/admin/ads/edit/1");
  });

  it("applyFilters resets to page 1 and refetches", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    wrapper.vm.pagination.current_page = 3;
    await wrapper.find(".btn-outline-secondary").trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(1);
  });

  it("confirmDelete -> deletePost runs (success) when confirm() is accepted", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("tbody tr .btn-outline-danger").trigger("click");
    expect(confirmSpy).toHaveBeenCalledWith(
      "Are you sure you want to delete this post?"
    );
    // deletePost refetches -> loading flips back to true
    expect(wrapper.vm.loading).toBe(true);

    // Let the refetch settle so no dangling timer
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
  });

  it("confirmDelete does nothing when confirm() is rejected", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    wrapper.vm.loading = false;
    await wrapper.find("tbody tr .btn-outline-danger").trigger("click");
    expect(confirmSpy).toHaveBeenCalled();
    // No refetch -> loading stays false
    expect(wrapper.vm.loading).toBe(false);
  });

  it("changePage ignores out-of-range pages and navigates valid ones", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();
    // last_page = 3 from mock fetch

    // page < 1 -> no change
    wrapper.vm.changePage(0);
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // page > last_page -> no change
    wrapper.vm.changePage(99);
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // valid page -> updates and refetches
    wrapper.vm.changePage(2);
    expect(wrapper.vm.pagination.current_page).toBe(2);

    vi.advanceTimersByTime(500);
    await flushPromises();
  });

  it("pagination 'Previous'/'Next' links and page links call changePage", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();
    // mock fetch -> current_page: 1, last_page: 3

    const links = wrapper.findAll("nav .page-link");
    // Previous link: current_page - 1 = 0 -> changePage ignores (page < 1)
    await links[0].trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // A numbered page link ("2") -> changePage(2)
    const numbered = links.find((l) => l.text() === "2");
    await numbered.trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(2);
    // settle the refetch (which resets pagination back to current_page: 1)
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);

    // Next link: current_page + 1 = 2 -> changePage(2)
    const linksAfter = wrapper.findAll("nav .page-link");
    await linksAfter[linksAfter.length - 1].trigger("click");
    expect(wrapper.vm.pagination.current_page).toBe(2);
    vi.advanceTimersByTime(500);
    await flushPromises();
  });

  it("getPageNumbers windows around the current page (both clamp branches)", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    // Case A: current page in the middle of a large range -> full window of 5,
    // and the `endPage - startPage < 4` correction stays false.
    wrapper.vm.pagination = {
      current_page: 5,
      per_page: 10,
      last_page: 10,
      total: 100,
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.getPageNumbers()).toEqual([3, 4, 5, 6, 7]);

    // Case B: small last_page near the end triggers the
    // `endPage - startPage < 4` correction branch (startPage clamped to 1).
    wrapper.vm.pagination = {
      current_page: 3,
      per_page: 10,
      last_page: 3,
      total: 30,
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.getPageNumbers()).toEqual([1, 2, 3]);
  });

  it("onMounted + watcher set non-'all' status filter when tab query is present", async () => {
    routeMock = { query: { tab: "rejected" } };
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe("rejected");
    expect(wrapper.vm.filters.status).toBe("rejected");
  });

  it("onMounted + watcher default to 'all' and empty status when no tab query", async () => {
    routeMock = { query: {} };
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(wrapper.vm.activeTab).toBe("all");
    expect(wrapper.vm.filters.status).toBe("");
  });

  it("v-model bindings update filters.search and filters.category", async () => {
    const wrapper = mountAds();
    vi.advanceTimersByTime(500);
    await flushPromises();

    await wrapper.find("input[type='text']").setValue("hello");
    expect(wrapper.vm.filters.search).toBe("hello");

    // option :value is the numeric category id
    await wrapper.find("select").setValue(2);
    expect(wrapper.vm.filters.category).toBe(2);
  });
});
