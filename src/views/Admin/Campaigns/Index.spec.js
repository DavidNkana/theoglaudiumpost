import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";

// --- Mock bootstrap Modal (external boundary) ---------------------------------
const showSpy = vi.fn();
const hideSpy = vi.fn();
const ModalSpy = vi.fn();

vi.mock("bootstrap", () => ({
  Modal: class {
    constructor(el) {
      ModalSpy(el);
      this.show = showSpy;
      this.hide = hideSpy;
    }
  },
}));

// --- Mock lodash debounce: run synchronously so watchers are deterministic ----
vi.mock("lodash", () => ({
  debounce: (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.cancel = vi.fn();
    wrapped.flush = vi.fn();
    return wrapped;
  },
}));

// --- Mock ads service (campaigns) ---------------------------------------------
const getCampaigns = vi.fn();
const removeCampaign = vi.fn();
vi.mock("@/features/ads/AdsService", () => ({
  getCampaigns: (...a) => getCampaigns(...a),
  removeCampaign: (...a) => removeCampaign(...a),
}));

// --- Mock businesses service --------------------------------------------------
const getBusinesses = vi.fn();
vi.mock("@/features/businesses/BusinessesService", () => ({
  getBusinesses: (...a) => getBusinesses(...a),
}));

// --- Mock vue-router ----------------------------------------------------------
const routerReplace = vi.fn();
const routerPush = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  useRoute: () => ({ query: routeQuery }),
}));

import Index from "./Index.vue";

const makeCampaign = (id, name = `Campaign ${id}`) => ({ id, name });

const okResponse = (overrides = {}) => ({
  status: 200,
  data: {
    campaigns: [makeCampaign(1), makeCampaign(2)],
    page: 0,
    size: 10,
    totalPages: 3,
    ...overrides,
  },
});

const mountView = () =>
  mount(Index, {
    global: {
      stubs: {
        CampaignsTable: true,
        CampaignForm: true,
        RouterLink: RouterLinkStub,
      },
    },
    attachTo: document.body,
  });

describe("Admin/Campaigns/Index.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeQuery = {};
    getCampaigns.mockResolvedValue(okResponse());
    removeCampaign.mockResolvedValue({});
    getBusinesses.mockResolvedValue({ data: { businesses: [{ id: 9 }] } });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // onMounted + initial fetch (success, defaulted query params / falsy branches)
  // ---------------------------------------------------------------------------
  it("initializes from empty query and fetches campaigns (default branches)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getCampaigns).toHaveBeenCalledWith({
      page: 0,
      search: "",
      size: 10,
      status: "",
    });
    expect(ModalSpy).toHaveBeenCalledTimes(2);

    // CampaignsTable rendered + pagination visible (total = totalPages = 3 > 0)
    expect(wrapper.findComponent({ name: "CampaignsTable" }).exists()).toBe(true);
    expect(
      wrapper.find('nav[aria-label="campaigns pagination"]').exists()
    ).toBe(true);
    wrapper.unmount();
  });

  it("initializes from populated query params (truthy branches)", async () => {
    routeQuery = {
      search: "hello",
      category: "cat",
      status: "active",
      page: "2",
      size: "25",
    };
    const wrapper = mountView();
    await flushPromises();

    expect(getCampaigns).toHaveBeenCalledWith({
      page: 2,
      search: "hello",
      size: 25,
      status: "active",
    });
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCampaigns: non-200 -> throw -> catch (console.error, no error UI)
  // ---------------------------------------------------------------------------
  it("logs an error when response status is not 200", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getCampaigns.mockResolvedValue({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching campaigns:",
      expect.any(Error)
    );
    // total stayed 0 -> pagination hidden
    expect(
      wrapper.find('nav[aria-label="campaigns pagination"]').exists()
    ).toBe(false);
    wrapper.unmount();
  });

  it("logs an error when getCampaigns rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getCampaigns.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching campaigns:",
      expect.any(Error)
    );
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchCampaigns: early return when already loading (loading guard)
  // ---------------------------------------------------------------------------
  it("does not start a second fetch while one is in flight (loading guard)", async () => {
    let resolveFn;
    getCampaigns.mockImplementation(
      () => new Promise((res) => { resolveFn = res; })
    );
    const wrapper = mountView();
    await nextTick();
    expect(getCampaigns).toHaveBeenCalledTimes(1);

    // changeStatus while loading -> fetchCampaigns early-returns (loading guard)
    wrapper.vm.changeStatus("active");
    expect(getCampaigns).toHaveBeenCalledTimes(1);

    resolveFn(okResponse());
    await flushPromises();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete found (modal shown) + deleteCampaign success
  // ---------------------------------------------------------------------------
  it("confirms and deletes a campaign successfully", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.confirmDelete(1);
    expect(showSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedCampaign.id).toBe(1);

    await wrapper.vm.deleteCampaign();
    await flushPromises();

    expect(removeCampaign).toHaveBeenCalledWith(1);
    expect(hideSpy).toHaveBeenCalled();
    // Campaign 1 removed, campaign 2 remains; selection cleared
    expect(wrapper.vm.campaigns.map((c) => c.id)).toEqual([2]);
    expect(wrapper.vm.selectedCampaign).toBe(null);
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // confirmDelete not found -> selection stays null -> show not called
  // ---------------------------------------------------------------------------
  it("confirmDelete with unknown id does not open the modal", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    wrapper.vm.confirmDelete(999);
    expect(showSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteCampaign: reject -> catch -> alert
  // ---------------------------------------------------------------------------
  it("alerts when removeCampaign rejects", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = mountView();
    await flushPromises();

    removeCampaign.mockRejectedValue(new Error("delete failed"));
    wrapper.vm.confirmDelete(1);
    await wrapper.vm.deleteCampaign();
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith("Error deleting ad:", expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to delete ad. Please try again."
    );
    expect(wrapper.vm.isDeleting).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changePage: out of range (low + high) + valid
  // ---------------------------------------------------------------------------
  it("changePage ignores out-of-range pages and fetches for valid pages", async () => {
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();

    // last_page = totalPages - 1 = 3 - 1 = 2
    wrapper.vm.changePage(-1); // page < 0
    wrapper.vm.changePage(99); // page > last_page
    expect(getCampaigns).not.toHaveBeenCalled();

    wrapper.vm.changePage(1); // valid
    expect(wrapper.vm.pagination.current_page).toBe(1);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // getPageNumbers: span >= 4 branch via clicking numbered page links
  // ---------------------------------------------------------------------------
  it("renders page-number links and navigates via clicks (getPageNumbers)", async () => {
    getCampaigns.mockResolvedValue(
      okResponse({ campaigns: [makeCampaign(1)], page: 5, totalPages: 10 })
    );
    routeQuery = { page: "5" };
    const wrapper = mountView();
    await flushPromises();

    const pageLinks = wrapper.findAll("ul.pagination li a.page-link");
    expect(pageLinks.length).toBeGreaterThan(0);

    getCampaigns.mockClear();
    const numbered = wrapper
      .findAll("ul.pagination li")
      .filter((li) => /^\d+$/.test(li.text().trim()));
    expect(numbered.length).toBeGreaterThan(0);
    await numbered[0].find("a").trigger("click");
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("covers getPageNumbers startPage recompute near the end (span < 4)", async () => {
    // currentPage = 10, lastPage(total) = 10 -> startPage=8, endPage=10,
    // span = 2 < 4 -> startPage recomputed to 6.
    getCampaigns.mockResolvedValue(
      okResponse({ campaigns: [makeCampaign(1)], page: 9, totalPages: 10 })
    );
    routeQuery = { page: "9" };
    const wrapper = mountView();
    await flushPromises();

    const numbered = wrapper
      .findAll("ul.pagination li")
      .map((li) => li.text().trim())
      .filter((t) => /^\d+$/.test(t));
    expect(numbered[numbered.length - 1]).toBe("10");
    expect(numbered[0]).toBe("6");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Previous / Next page link clicks + disabled-class branches
  // ---------------------------------------------------------------------------
  it("Previous disabled on first page; Next click navigates forward", async () => {
    const wrapper = mountView();
    await flushPromises();
    const items = wrapper.findAll("ul.pagination li.page-item");
    // First li is Previous -> disabled (current_page === 0)
    expect(items[0].classes()).toContain("disabled");

    getCampaigns.mockClear();
    const nextLink = items[items.length - 1].find("a");
    await nextLink.trigger("click"); // changePage(current_page + 1) -> valid
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("Next disabled on last page; Previous click navigates back", async () => {
    getCampaigns.mockResolvedValue(
      okResponse({ campaigns: [makeCampaign(1)], page: 2, totalPages: 3 })
    );
    routeQuery = { page: "2" };
    const wrapper = mountView();
    await flushPromises();

    const items = wrapper.findAll("ul.pagination li.page-item");
    // last_page = 3 - 1 = 2, current_page = 2 -> Next disabled
    expect(items[items.length - 1].classes()).toContain("disabled");

    getCampaigns.mockClear();
    getCampaigns.mockResolvedValue(
      okResponse({ campaigns: [makeCampaign(1)], page: 1, totalPages: 3 })
    );
    await items[0].find("a").trigger("click"); // Previous
    await flushPromises();
    expect(wrapper.vm.pagination.current_page).toBe(1);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // applyFilters via page-size <select> @change
  // ---------------------------------------------------------------------------
  it("applyFilters via page-size select resets to first page and refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();

    const select = wrapper.find("#pageSizeSelect");
    await select.setValue("25");
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // clearFilters
  // ---------------------------------------------------------------------------
  it("clearFilters resets search + category and refetches", async () => {
    routeQuery = { search: "x", category: "y", status: "active" };
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();

    wrapper.vm.clearFilters();
    await flushPromises();

    expect(wrapper.vm.filters).toEqual({
      search: "",
      category: "",
      status: "active", // status preserved by clearFilters
    });
    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // changeStatus toggle: both ternary sides
  // ---------------------------------------------------------------------------
  it("changeStatus toggles a status on then off (both ternary sides)", async () => {
    const wrapper = mountView();
    await flushPromises();

    getCampaigns.mockClear();
    wrapper.vm.changeStatus("active"); // '' -> 'active'
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("active");

    wrapper.vm.changeStatus("active"); // 'active' -> '' (other ternary side)
    await flushPromises();
    expect(wrapper.vm.filters.status).toBe("");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openCreateModal: show form modal + fetchBusinesses (length <= 0 true path)
  // ---------------------------------------------------------------------------
  it("openCreateModal shows form modal and fetches businesses", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openCreateModal();
    await flushPromises();

    expect(showSpy).toHaveBeenCalled();
    expect(getBusinesses).toHaveBeenCalledWith({ size: 0 });
    expect(wrapper.vm.businesses).toEqual([{ id: 9 }]);
    expect(wrapper.vm.isFetchingBusinesses).toBe(false);
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // fetchBusinesses: catch branch (reject) + skip branch (already populated)
  // ---------------------------------------------------------------------------
  it("fetchBusinesses swallows errors when getBusinesses rejects", async () => {
    getBusinesses.mockRejectedValue(new Error("nope"));
    const wrapper = mountView();
    await flushPromises();

    await wrapper.vm.fetchBusinesses();
    await flushPromises();

    expect(wrapper.vm.isFetchingBusinesses).toBe(false);
    expect(wrapper.vm.businesses).toEqual([]);
    wrapper.unmount();
  });

  it("fetchBusinesses skips fetch when businesses already loaded", async () => {
    const wrapper = mountView();
    await flushPromises();

    // Populate businesses first
    await wrapper.vm.fetchBusinesses();
    await flushPromises();
    expect(getBusinesses).toHaveBeenCalledTimes(1);

    // Second call: length > 0 -> branch skipped, no new fetch
    getBusinesses.mockClear();
    await wrapper.vm.fetchBusinesses();
    await flushPromises();
    expect(getBusinesses).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // openUpdateModal found / not found
  // ---------------------------------------------------------------------------
  it("openUpdateModal selects campaign and shows form modal when found", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();

    await wrapper.vm.openUpdateModal(2);
    await flushPromises();
    expect(wrapper.vm.selectedCampaign.id).toBe(2);
    expect(showSpy).toHaveBeenCalled();
    expect(getBusinesses).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("openUpdateModal does nothing when campaign not found", async () => {
    const wrapper = mountView();
    await flushPromises();
    showSpy.mockClear();
    getBusinesses.mockClear();

    await wrapper.vm.openUpdateModal(12345);
    await flushPromises();
    expect(showSpy).not.toHaveBeenCalled();
    expect(getBusinesses).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // closeForm / addCampaign / updateCampaign
  // ---------------------------------------------------------------------------
  it("closeForm hides modal and clears selection", async () => {
    const wrapper = mountView();
    await flushPromises();
    hideSpy.mockClear();

    wrapper.vm.closeForm();
    expect(hideSpy).toHaveBeenCalled();
    expect(wrapper.vm.selectedCampaign).toBe(null);
    wrapper.unmount();
  });

  it("addCampaign prepends a new campaign", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.addCampaign(makeCampaign(99, "New"));
    expect(wrapper.vm.campaigns[0].id).toBe(99);
    wrapper.unmount();
  });

  it("updateCampaign updates the matching campaign and leaves others unchanged", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.updateCampaign({ id: 2, name: "Updated 2" });
    const names = wrapper.vm.campaigns.map((c) => c.name);
    expect(names).toContain("Updated 2"); // matched branch
    expect(names).toContain("Campaign 1"); // non-matched branch
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // search watch (debounced) + route-query replace watcher (truthy keys)
  // ---------------------------------------------------------------------------
  it("typing in the search box triggers debounced fetch and router.replace", async () => {
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();
    routerReplace.mockClear();

    const input = wrapper.find('input[type="text"]');
    await input.setValue("query");
    await flushPromises();

    expect(getCampaigns).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith({
      query: expect.objectContaining({ search: "query" }),
    });
    wrapper.unmount();
  });

  it("route-query watcher emits all populated keys when every filter is set", async () => {
    routeQuery = {
      search: "s",
      category: "c",
      status: "active",
      page: "2",
      size: "25",
    };
    getCampaigns.mockResolvedValue(okResponse({ size: 25 }));
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    // Retrigger watcher with all sources truthy.
    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    expect(routerReplace).toHaveBeenCalledWith({
      query: {
        search: "s",
        category: "c",
        status: "active",
        page: 1,
        size: 25,
      },
    });
    wrapper.unmount();
  });

  it("route-query watcher omits search/category/status when they are falsy", async () => {
    const wrapper = mountView();
    await flushPromises();
    routerReplace.mockClear();

    // current_page/per_page changes retrigger watcher; filters are all "".
    wrapper.vm.pagination.current_page = 1;
    await flushPromises();

    const lastCall = routerReplace.mock.calls.at(-1)[0];
    expect(lastCall.query.search).toBeUndefined();
    expect(lastCall.query.category).toBeUndefined();
    expect(lastCall.query.status).toBeUndefined();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Form modal render: isFetchingBusinesses spinner (v-if) vs CampaignForm (v-else)
  // ---------------------------------------------------------------------------
  it("renders the loading spinner while fetching businesses, else the form", async () => {
    const wrapper = mountView();
    await flushPromises();

    // v-else: CampaignForm shown
    expect(wrapper.findComponent({ name: "CampaignForm" }).exists()).toBe(true);
    expect(wrapper.find("#campaignFormModal .spinner-border").exists()).toBe(
      false
    );

    // v-if: spinner shown
    wrapper.vm.isFetchingBusinesses = true;
    await nextTick();
    expect(wrapper.find("#campaignFormModal .spinner-border").exists()).toBe(
      true
    );
    expect(wrapper.find("#campaignFormModal").text()).toContain(
      "Loading data..."
    );
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Delete modal render: isDeleting ternary + selectedCampaign?.name
  // ---------------------------------------------------------------------------
  it("renders deleting state and selected campaign name in delete modal", async () => {
    const wrapper = mountView();
    await flushPromises();

    // selectedCampaign null -> name optional-chaining branch
    expect(wrapper.find("#deleteModal").text()).toContain("Delete Campaign");

    wrapper.vm.selectedCampaign = makeCampaign(1, "My Campaign");
    wrapper.vm.isDeleting = true;
    await nextTick();

    const modal = wrapper.find("#deleteModal");
    expect(modal.text()).toContain("My Campaign");
    expect(modal.text()).toContain("Deleting...");

    wrapper.vm.isDeleting = false;
    await nextTick();
    expect(modal.text()).toContain("Delete Campaign");
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // deleteCampaign with no modalInstance hide via optional chaining already
  // covered; cover applyFilters direct path too.
  // ---------------------------------------------------------------------------
  it("applyFilters resets page and refetches", async () => {
    const wrapper = mountView();
    await flushPromises();
    getCampaigns.mockClear();

    wrapper.vm.pagination.current_page = 2;
    wrapper.vm.applyFilters();
    await flushPromises();

    expect(wrapper.vm.pagination.current_page).toBe(0);
    expect(getCampaigns).toHaveBeenCalled();
    wrapper.unmount();
  });

  // ---------------------------------------------------------------------------
  // Template: `campaigns ?? []` nullish fallback branch (campaigns === null)
  // ---------------------------------------------------------------------------
  it("falls back to an empty list when campaigns is null", async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.campaigns = null;
    await nextTick();

    const table = wrapper.findComponent({ name: "CampaignsTable" });
    expect(table.props("campaigns")).toEqual([]);
    wrapper.unmount();
  });
});
